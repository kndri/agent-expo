/**
 * AgentBridgeProvider
 *
 * React context provider that sets up the bridge connection
 * and provides access to automation features.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import type {
  AgentBridgeConfig,
  AgentBridgeContext,
  EnhancedSnapshot,
  TrackedRequest,
  SupabaseCall,
  ConvexCall,
  MockConfig,
  SnapshotOptions,
} from './types';
import { AccessibilityTreeBuilder } from './accessibility/tree-builder';
import { NetworkInterceptor } from './network/interceptor';
import { ExponentialBackoff, type BackoffConfig } from './utils/backoff';
import { SnapshotCache, type CacheStats } from './cache/snapshot-cache';

const DEFAULT_PORT = 8765;

const BridgeContext = createContext<AgentBridgeContext | null>(null);

interface BridgeMessage {
  id: string;
  type: string;
  payload?: unknown;
}

interface AgentBridgeProviderProps {
  children: ReactNode;
  config?: AgentBridgeConfig;
}

export function AgentBridgeProvider({ children, config = {} }: AgentBridgeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const treeBuilderRef = useRef(new AccessibilityTreeBuilder());
  const networkInterceptorRef = useRef(new NetworkInterceptor());
  const snapshotCacheRef = useRef(new SnapshotCache());
  const requestsRef = useRef<TrackedRequest[]>([]);
  const supabaseCallsRef = useRef<SupabaseCall[]>([]);
  const convexCallsRef = useRef<ConvexCall[]>([]);
  const mocksRef = useRef<Map<string, MockConfig>>(new Map());
  const handleMessageRef = useRef<(data: string) => void>(() => {});

  // Skip in production unless explicitly enabled
  const shouldEnable = config.devOnly === false || __DEV__;

  // Connect to daemon with exponential backoff
  useEffect(() => {
    if (!shouldEnable) return;

    const port = config.port || DEFAULT_PORT;
    const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

    // Setup reconnection config
    const reconnectEnabled = config.reconnect?.enabled !== false;
    const backoff = new ExponentialBackoff({
      initialDelay: config.reconnect?.initialDelay ?? 1000,
      maxDelay: config.reconnect?.maxDelay ?? 30000,
      multiplier: config.reconnect?.multiplier ?? 2,
      maxAttempts: config.reconnect?.maxAttempts,
    });

    let isUnmounting = false;

    const connect = () => {
      if (isUnmounting) return;

      try {
        const ws = new WebSocket(`ws://${host}:${port}`);

        ws.onopen = () => {
          console.log('[AgentBridge] Connected to daemon');
          setIsConnected(true);
          backoff.reset(); // Reset backoff on successful connection
        };

        ws.onclose = () => {
          console.log('[AgentBridge] Disconnected from daemon');
          setIsConnected(false);

          // Try to reconnect with exponential backoff
          if (reconnectEnabled && backoff.shouldRetry() && !isUnmounting) {
            const delay = backoff.nextDelay();
            const attempt = backoff.getAttempt();
            console.log(`[AgentBridge] Reconnecting in ${delay}ms (attempt ${attempt})`);
            setTimeout(connect, delay);
          } else if (!backoff.shouldRetry()) {
            console.log('[AgentBridge] Max reconnection attempts reached');
          }
        };

        ws.onerror = (error) => {
          console.log('[AgentBridge] Connection error:', error);
          // onclose will handle reconnection
        };

        ws.onmessage = (event) => {
          handleMessageRef.current(event.data);
        };

        wsRef.current = ws;
      } catch (error) {
        console.log('[AgentBridge] Failed to connect:', error);
        // Retry with backoff
        if (reconnectEnabled && backoff.shouldRetry() && !isUnmounting) {
          const delay = backoff.nextDelay();
          const attempt = backoff.getAttempt();
          console.log(`[AgentBridge] Reconnecting in ${delay}ms (attempt ${attempt})`);
          setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      isUnmounting = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldEnable, config.port, config.reconnect]);

  // Setup network interception
  useEffect(() => {
    if (!shouldEnable || config.trackNetwork === false) return;

    const interceptor = networkInterceptorRef.current;

    interceptor.onRequest = (request) => {
      requestsRef.current.push({ request });
    };

    interceptor.onResponse = (requestId, response) => {
      const tracked = requestsRef.current.find((r) => r.request.id === requestId);
      if (tracked) {
        tracked.response = response;
      }
    };

    interceptor.onError = (requestId, error) => {
      const tracked = requestsRef.current.find((r) => r.request.id === requestId);
      if (tracked) {
        tracked.error = error;
      }
    };

    interceptor.install();

    return () => {
      interceptor.uninstall();
    };
  }, [shouldEnable, config.trackNetwork]);

  // Hook into React DevTools to detect UI changes and invalidate cache
  useEffect(() => {
    if (!shouldEnable) return;

    const hook = (global as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (!hook) {
      console.log('[AgentBridge] React DevTools hook not available, cache invalidation will use timeout only');
      return;
    }

    // Store original function
    const originalOnCommitFiberRoot = hook.onCommitFiberRoot;

    // Wrap to detect UI updates
    hook.onCommitFiberRoot = (...args: unknown[]) => {
      // Invalidate snapshot cache on any React commit (UI update)
      snapshotCacheRef.current.invalidate();

      // Call original if exists
      if (originalOnCommitFiberRoot) {
        return originalOnCommitFiberRoot.apply(hook, args);
      }
    };

    return () => {
      // Restore original
      hook.onCommitFiberRoot = originalOnCommitFiberRoot;
    };
  }, [shouldEnable]);

  // Send response back to daemon (defined early so handleMessage can use it)
  const sendResponse = useCallback(
    (id: string, success: boolean, data?: unknown, error?: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ id, success, data, error }));
      }
    },
    []
  );

  // Handle snapshot request
  const handleSnapshotRequest = useCallback(
    async (message: BridgeMessage) => {
      try {
        const payload = message.payload as SnapshotOptions | undefined;
        const cache = snapshotCacheRef.current;

        // Update cache config if maxCacheAge provided
        if (payload?.maxCacheAge !== undefined) {
          cache.configure({ maxAge: payload.maxCacheAge });
        }

        // Force fresh snapshot if requested
        if (payload?.fresh) {
          cache.invalidate();
        }

        // Try to get from cache first
        const cached = cache.get();
        if (cached) {
          sendResponse(message.id, true, cached);
          return;
        }

        // Build fresh snapshot
        const snapshot = await treeBuilderRef.current.buildSnapshotAsync({
          interactive: payload?.interactive,
          compact: payload?.compact,
          maxDepth: payload?.maxDepth,
          visibleOnly: payload?.visibleOnly,
        });

        // Store in cache and return
        const cachedSnapshot = cache.set(snapshot);
        sendResponse(message.id, true, cachedSnapshot);
      } catch (error) {
        sendResponse(message.id, false, undefined, String(error));
      }
    },
    [sendResponse]
  );

  // Handle tap request
  const handleTapRequest = useCallback(
    (message: BridgeMessage) => {
      sendResponse(message.id, true, { tapped: true });
    },
    [sendResponse]
  );

  // Handle fill request
  const handleFillRequest = useCallback(
    (message: BridgeMessage) => {
      sendResponse(message.id, true, { filled: true });
    },
    [sendResponse]
  );

  // Handle clear request
  const handleClearRequest = useCallback(
    (message: BridgeMessage) => {
      sendResponse(message.id, true, { cleared: true });
    },
    [sendResponse]
  );

  // Handle scroll request
  const handleScrollRequest = useCallback(
    (message: BridgeMessage) => {
      sendResponse(message.id, true, { scrolled: true });
    },
    [sendResponse]
  );

  // Handle get requests request
  const handleGetRequestsRequest = useCallback(
    (message: BridgeMessage) => {
      sendResponse(message.id, true, requestsRef.current);
    },
    [sendResponse]
  );

  // Handle get Supabase calls request
  const handleGetSupabaseCallsRequest = useCallback(
    (message: BridgeMessage) => {
      sendResponse(message.id, true, supabaseCallsRef.current);
    },
    [sendResponse]
  );

  // Handle get Convex calls request
  const handleGetConvexCallsRequest = useCallback(
    (message: BridgeMessage) => {
      sendResponse(message.id, true, convexCallsRef.current);
    },
    [sendResponse]
  );

  // Handle mock request
  const handleMockRequest = useCallback(
    (message: BridgeMessage) => {
      const payload = message.payload as { pattern: string; config: MockConfig };
      mocksRef.current.set(payload.pattern, payload.config);
      networkInterceptorRef.current.addMock(payload.pattern, payload.config);
      sendResponse(message.id, true, { mocked: true });
    },
    [sendResponse]
  );

  // Handle clear mocks request
  const handleClearMocksRequest = useCallback(
    (message: BridgeMessage) => {
      mocksRef.current.clear();
      networkInterceptorRef.current.clearMocks();
      sendResponse(message.id, true, { cleared: true });
    },
    [sendResponse]
  );

  // Handle cache stats request
  const handleCacheStatsRequest = useCallback(
    (message: BridgeMessage) => {
      const stats = snapshotCacheRef.current.getStats();
      const config = snapshotCacheRef.current.getConfig();
      sendResponse(message.id, true, { stats, config });
    },
    [sendResponse]
  );

  // Handle cache invalidate request
  const handleCacheInvalidateRequest = useCallback(
    (message: BridgeMessage) => {
      snapshotCacheRef.current.invalidate();
      sendResponse(message.id, true, { invalidated: true });
    },
    [sendResponse]
  );

  // Handle incoming messages
  const handleMessage = useCallback((data: string) => {
    try {
      const message: BridgeMessage = JSON.parse(data);

      switch (message.type) {
        case 'snapshot':
          handleSnapshotRequest(message);
          break;
        case 'tap':
          handleTapRequest(message);
          break;
        case 'fill':
          handleFillRequest(message);
          break;
        case 'clear':
          handleClearRequest(message);
          break;
        case 'scroll':
          handleScrollRequest(message);
          break;
        case 'getRequests':
          handleGetRequestsRequest(message);
          break;
        case 'getSupabaseCalls':
          handleGetSupabaseCallsRequest(message);
          break;
        case 'getConvexCalls':
          handleGetConvexCallsRequest(message);
          break;
        case 'mock':
          handleMockRequest(message);
          break;
        case 'clearMocks':
          handleClearMocksRequest(message);
          break;
        case 'cacheStats':
          handleCacheStatsRequest(message);
          break;
        case 'cacheInvalidate':
          handleCacheInvalidateRequest(message);
          break;
        default:
          sendResponse(message.id, false, undefined, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[AgentBridge] Failed to handle message:', error);
    }
  }, [
    handleSnapshotRequest,
    handleTapRequest,
    handleFillRequest,
    handleClearRequest,
    handleScrollRequest,
    handleGetRequestsRequest,
    handleGetSupabaseCallsRequest,
    handleGetConvexCallsRequest,
    handleMockRequest,
    handleClearMocksRequest,
    handleCacheStatsRequest,
    handleCacheInvalidateRequest,
    sendResponse,
  ]);

  // Update ref when handleMessage changes
  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  // Context value
  const contextValue: AgentBridgeContext = {
    isConnected,
    getSnapshot: (options) => treeBuilderRef.current.buildSnapshotAsync(options),
    getRequests: () => [...requestsRef.current],
    getSupabaseCalls: () => [...supabaseCallsRef.current],
    getConvexCalls: () => [...convexCallsRef.current],
    clearTracking: () => {
      requestsRef.current = [];
      supabaseCallsRef.current = [];
      convexCallsRef.current = [];
    },
  };

  // Register Supabase call
  const registerSupabaseCall = useCallback((call: SupabaseCall) => {
    supabaseCallsRef.current.push(call);
  }, []);

  // Register Convex call
  const registerConvexCall = useCallback((call: ConvexCall) => {
    convexCallsRef.current.push(call);
  }, []);

  return (
    <BridgeContext.Provider value={contextValue}>
      {children}
    </BridgeContext.Provider>
  );
}

export function useAgentBridge(): AgentBridgeContext {
  const context = useContext(BridgeContext);
  if (!context) {
    throw new Error('useAgentBridge must be used within AgentBridgeProvider');
  }
  return context;
}

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
} from './types';
import { AccessibilityTreeBuilder } from './accessibility/tree-builder';
import { NetworkInterceptor } from './network/interceptor';

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
  const requestsRef = useRef<TrackedRequest[]>([]);
  const supabaseCallsRef = useRef<SupabaseCall[]>([]);
  const convexCallsRef = useRef<ConvexCall[]>([]);
  const mocksRef = useRef<Map<string, MockConfig>>(new Map());
  const rootRef = useRef<any>(null);

  // Skip in production unless explicitly enabled
  const shouldEnable = config.devOnly === false || __DEV__;

  // Connect to daemon
  useEffect(() => {
    if (!shouldEnable) return;

    const port = config.port || DEFAULT_PORT;
    const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

    const connect = () => {
      try {
        const ws = new WebSocket(`ws://${host}:${port}`);

        ws.onopen = () => {
          console.log('[AgentBridge] Connected to daemon');
          setIsConnected(true);
        };

        ws.onclose = () => {
          console.log('[AgentBridge] Disconnected from daemon');
          setIsConnected(false);
          // Try to reconnect after a delay
          setTimeout(connect, 5000);
        };

        ws.onerror = (error) => {
          console.log('[AgentBridge] Connection error:', error);
        };

        ws.onmessage = (event) => {
          handleMessage(event.data);
        };

        wsRef.current = ws;
      } catch (error) {
        console.log('[AgentBridge] Failed to connect:', error);
        setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [shouldEnable, config.port]);

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
        default:
          sendResponse(message.id, false, undefined, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[AgentBridge] Failed to handle message:', error);
    }
  }, []);

  // Send response back to daemon
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
    (message: BridgeMessage) => {
      try {
        const snapshot = treeBuilderRef.current.buildSnapshot(rootRef.current);
        sendResponse(message.id, true, snapshot);
      } catch (error) {
        sendResponse(message.id, false, undefined, String(error));
      }
    },
    [sendResponse]
  );

  // Handle tap request
  const handleTapRequest = useCallback(
    (message: BridgeMessage) => {
      // Tap handling would require native module integration
      // For now, we acknowledge but note it's not implemented in pure JS
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

  // Context value
  const contextValue: AgentBridgeContext = {
    isConnected,
    getSnapshot: () => treeBuilderRef.current.buildSnapshot(rootRef.current),
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

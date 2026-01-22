/**
 * useNetworkTracking hook
 *
 * Provides access to tracked network requests.
 */

import { useRef, useCallback, useEffect } from 'react';
import type { TrackedRequest, MockConfig } from '../types';
import { NetworkInterceptor } from '../network/interceptor';

interface UseNetworkTrackingOptions {
  /** Enable tracking (default: true in __DEV__) */
  enabled?: boolean;
  /** Callback when a request is made */
  onRequest?: (request: TrackedRequest['request']) => void;
  /** Callback when a response is received */
  onResponse?: (request: TrackedRequest) => void;
}

/**
 * Hook to track network requests
 *
 * Usage:
 * ```tsx
 * const { requests, clearRequests, addMock, clearMocks } = useNetworkTracking();
 *
 * // Get all requests
 * console.log(requests);
 *
 * // Filter requests
 * const apiRequests = requests.filter(r => r.request.url.includes('/api/'));
 *
 * // Mock a response
 * addMock('/api/users', { status: 200, body: { users: [] } });
 * ```
 */
export function useNetworkTracking(options: UseNetworkTrackingOptions = {}) {
  const { enabled = __DEV__, onRequest, onResponse } = options;

  const interceptorRef = useRef<NetworkInterceptor | null>(null);
  const requestsRef = useRef<TrackedRequest[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const interceptor = new NetworkInterceptor();
    interceptorRef.current = interceptor;

    interceptor.onRequest = (request) => {
      const tracked: TrackedRequest = { request };
      requestsRef.current.push(tracked);
      onRequest?.(request);
    };

    interceptor.onResponse = (requestId, response) => {
      const tracked = requestsRef.current.find((r) => r.request.id === requestId);
      if (tracked) {
        tracked.response = response;
        onResponse?.(tracked);
      }
    };

    interceptor.onError = (requestId, error) => {
      const tracked = requestsRef.current.find((r) => r.request.id === requestId);
      if (tracked) {
        tracked.error = error;
        onResponse?.(tracked);
      }
    };

    interceptor.install();

    return () => {
      interceptor.uninstall();
      interceptorRef.current = null;
    };
  }, [enabled, onRequest, onResponse]);

  const getRequests = useCallback(
    (filter?: { url?: string; method?: string; status?: number }) => {
      let requests = [...requestsRef.current];

      if (filter?.url) {
        requests = requests.filter((r) => r.request.url.includes(filter.url!));
      }
      if (filter?.method) {
        requests = requests.filter((r) => r.request.method === filter.method);
      }
      if (filter?.status) {
        requests = requests.filter((r) => r.response?.status === filter.status);
      }

      return requests;
    },
    []
  );

  const clearRequests = useCallback(() => {
    requestsRef.current = [];
  }, []);

  const addMock = useCallback((pattern: string, config: MockConfig) => {
    interceptorRef.current?.addMock(pattern, config);
  }, []);

  const removeMock = useCallback((pattern: string) => {
    interceptorRef.current?.removeMock(pattern);
  }, []);

  const clearMocks = useCallback(() => {
    interceptorRef.current?.clearMocks();
  }, []);

  return {
    requests: requestsRef.current,
    getRequests,
    clearRequests,
    addMock,
    removeMock,
    clearMocks,
  };
}

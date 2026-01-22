/**
 * Convex Tracking
 *
 * Hook for tracking Convex client calls.
 */

import { useRef, useCallback } from 'react';
import type { ConvexCall } from '../types';

interface ConvexTrackingOptions {
  onCall?: (call: ConvexCall) => void;
}

/**
 * Hook to track Convex calls
 *
 * Usage:
 * ```tsx
 * const { wrapClient, getCalls, clearCalls } = useConvexTracking();
 * const trackedConvex = wrapClient(convex);
 * ```
 */
export function useConvexTracking(options: ConvexTrackingOptions = {}) {
  const callsRef = useRef<ConvexCall[]>([]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const trackCall = useCallback(
    (call: ConvexCall) => {
      callsRef.current.push(call);
      options.onCall?.(call);
    },
    [options]
  );

  /**
   * Wrap a Convex client to track all calls
   */
  const wrapClient = useCallback(
    <T extends object>(client: T): T => {
      return new Proxy(client, {
        get(target: any, prop: string) {
          // Handle query
          if (prop === 'query') {
            return wrapFunction(target.query.bind(target), 'query');
          }

          // Handle mutation
          if (prop === 'mutation') {
            return wrapFunction(target.mutation.bind(target), 'mutation');
          }

          // Handle action
          if (prop === 'action') {
            return wrapFunction(target.action.bind(target), 'action');
          }

          return target[prop];
        },
      });
    },
    []
  );

  const wrapFunction = (fn: Function, type: ConvexCall['type']) => {
    return async (functionRef: any, args?: any) => {
      const functionName =
        typeof functionRef === 'string'
          ? functionRef
          : functionRef._name || functionRef.toString();

      const call: ConvexCall = {
        id: generateId(),
        type,
        functionName,
        args,
        timestamp: new Date().toISOString(),
        duration: 0,
      };

      const startTime = Date.now();

      try {
        const result = await fn(functionRef, args);
        call.result = result;
        call.duration = Date.now() - startTime;
        trackCall(call);
        return result;
      } catch (error) {
        call.error = error;
        call.duration = Date.now() - startTime;
        trackCall(call);
        throw error;
      }
    };
  };

  /**
   * Wrap the useQuery hook
   */
  const wrapUseQuery = useCallback(
    <T>(
      useQueryFn: (functionRef: any, args?: any) => T,
      functionRef: any,
      args?: any
    ): T => {
      const functionName =
        typeof functionRef === 'string'
          ? functionRef
          : functionRef._name || functionRef.toString();

      // Note: useQuery is reactive and may be called multiple times
      // We track each invocation
      const call: ConvexCall = {
        id: generateId(),
        type: 'query',
        functionName,
        args,
        timestamp: new Date().toISOString(),
        duration: 0,
      };

      const result = useQueryFn(functionRef, args);

      call.result = result;
      trackCall(call);

      return result;
    },
    []
  );

  /**
   * Wrap the useMutation hook
   */
  const wrapUseMutation = useCallback(
    <T extends Function>(useMutationFn: (functionRef: any) => T, functionRef: any): T => {
      const functionName =
        typeof functionRef === 'string'
          ? functionRef
          : functionRef._name || functionRef.toString();

      const mutationFn = useMutationFn(functionRef);

      const wrappedFn = async (args?: any) => {
        const call: ConvexCall = {
          id: generateId(),
          type: 'mutation',
          functionName,
          args,
          timestamp: new Date().toISOString(),
          duration: 0,
        };

        const startTime = Date.now();

        try {
          const result = await (mutationFn as Function)(args);
          call.result = result;
          call.duration = Date.now() - startTime;
          trackCall(call);
          return result;
        } catch (error) {
          call.error = error;
          call.duration = Date.now() - startTime;
          trackCall(call);
          throw error;
        }
      };
      return wrappedFn as unknown as T;
    },
    []
  );

  const getCalls = useCallback(
    (filter?: { functionName?: string; type?: string }) => {
      let calls = [...callsRef.current];

      if (filter?.functionName) {
        calls = calls.filter((c) => c.functionName.includes(filter.functionName!));
      }
      if (filter?.type) {
        calls = calls.filter((c) => c.type === filter.type);
      }

      return calls;
    },
    []
  );

  const clearCalls = useCallback(() => {
    callsRef.current = [];
  }, []);

  return {
    wrapClient,
    wrapUseQuery,
    wrapUseMutation,
    getCalls,
    clearCalls,
  };
}

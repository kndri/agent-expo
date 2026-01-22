/**
 * Supabase Tracking
 *
 * Hook for tracking Supabase client calls.
 */

import { useRef, useCallback } from 'react';
import type { SupabaseCall } from '../types';

interface SupabaseTrackingOptions {
  onCall?: (call: SupabaseCall) => void;
}

/**
 * Hook to track Supabase calls
 *
 * Usage:
 * ```tsx
 * const { wrapClient, getCalls, clearCalls } = useSupabaseTracking();
 * const trackedSupabase = wrapClient(supabase);
 * ```
 */
export function useSupabaseTracking(options: SupabaseTrackingOptions = {}) {
  const callsRef = useRef<SupabaseCall[]>([]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const trackCall = useCallback(
    (call: SupabaseCall) => {
      callsRef.current.push(call);
      options.onCall?.(call);
    },
    [options]
  );

  /**
   * Wrap a Supabase client to track all calls
   */
  const wrapClient = useCallback(
    <T extends object>(client: T): T => {
      return new Proxy(client, {
        get(target: any, prop: string) {
          // Handle .from() for database operations
          if (prop === 'from') {
            return (table: string) => {
              return wrapQueryBuilder(target.from(table), table);
            };
          }

          // Handle .auth for auth operations
          if (prop === 'auth') {
            return wrapAuth(target.auth);
          }

          // Handle .storage for storage operations
          if (prop === 'storage') {
            return wrapStorage(target.storage);
          }

          return target[prop];
        },
      });
    },
    []
  );

  const wrapQueryBuilder = (builder: any, table: string) => {
    const operations = ['select', 'insert', 'update', 'delete', 'upsert'];

    return new Proxy(builder, {
      get(target: any, prop: string) {
        if (operations.includes(prop)) {
          return (...args: any[]) => {
            const call: SupabaseCall = {
              id: generateId(),
              type: prop === 'select' ? 'query' : 'mutation',
              table,
              operation: prop,
              params: args,
              timestamp: new Date().toISOString(),
              duration: 0,
            };

            const startTime = Date.now();
            const result = target[prop](...args);

            // Wrap the promise to capture result
            if (result && typeof result.then === 'function') {
              const originalThen = result.then.bind(result);
              result.then = (resolve: any, reject: any) => {
                return originalThen(
                  (data: any) => {
                    call.result = data;
                    call.duration = Date.now() - startTime;
                    trackCall(call);
                    return resolve?.(data);
                  },
                  (error: any) => {
                    call.error = error;
                    call.duration = Date.now() - startTime;
                    trackCall(call);
                    return reject?.(error);
                  }
                );
              };
            }

            return result;
          };
        }

        // Chain other methods (like .eq(), .single(), etc.)
        const value = target[prop];
        if (typeof value === 'function') {
          return (...args: any[]) => {
            const result = value.apply(target, args);
            // If it returns a builder, wrap it too
            if (result && typeof result === 'object') {
              return wrapQueryBuilder(result, table);
            }
            return result;
          };
        }

        return value;
      },
    });
  };

  const wrapAuth = (auth: any) => {
    const authMethods = [
      'signIn',
      'signUp',
      'signOut',
      'signInWithPassword',
      'signInWithOAuth',
      'signInWithOtp',
      'resetPasswordForEmail',
      'updateUser',
      'getUser',
      'getSession',
    ];

    return new Proxy(auth, {
      get(target: any, prop: string) {
        if (authMethods.includes(prop)) {
          return async (...args: any[]) => {
            const call: SupabaseCall = {
              id: generateId(),
              type: 'auth',
              operation: prop,
              params: args,
              timestamp: new Date().toISOString(),
              duration: 0,
            };

            const startTime = Date.now();

            try {
              const result = await target[prop](...args);
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
        }

        return target[prop];
      },
    });
  };

  const wrapStorage = (storage: any) => {
    return new Proxy(storage, {
      get(target: any, prop: string) {
        if (prop === 'from') {
          return (bucket: string) => {
            return wrapStorageBucket(target.from(bucket), bucket);
          };
        }
        return target[prop];
      },
    });
  };

  const wrapStorageBucket = (bucket: any, bucketName: string) => {
    const storageMethods = ['upload', 'download', 'remove', 'list', 'getPublicUrl'];

    return new Proxy(bucket, {
      get(target: any, prop: string) {
        if (storageMethods.includes(prop)) {
          return async (...args: any[]) => {
            const call: SupabaseCall = {
              id: generateId(),
              type: 'storage',
              table: bucketName,
              operation: prop,
              params: args,
              timestamp: new Date().toISOString(),
              duration: 0,
            };

            const startTime = Date.now();

            try {
              const result = await target[prop](...args);
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
        }

        return target[prop];
      },
    });
  };

  const getCalls = useCallback(
    (filter?: { table?: string; operation?: string; type?: string }) => {
      let calls = [...callsRef.current];

      if (filter?.table) {
        calls = calls.filter((c) => c.table === filter.table);
      }
      if (filter?.operation) {
        calls = calls.filter((c) => c.operation === filter.operation);
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
    getCalls,
    clearCalls,
  };
}

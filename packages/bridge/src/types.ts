/**
 * Type definitions for the bridge
 */

export interface ReconnectConfig {
  /** Enable automatic reconnection (default: true) */
  enabled?: boolean;
  /** Initial delay in ms (default: 1000) */
  initialDelay?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelay?: number;
  /** Delay multiplier (default: 2) */
  multiplier?: number;
  /** Maximum reconnection attempts (default: unlimited) */
  maxAttempts?: number;
}

export interface AgentBridgeConfig {
  /** WebSocket port for daemon connection */
  port?: number;
  /** Enable network request tracking */
  trackNetwork?: boolean;
  /** Enable Supabase call tracking */
  trackSupabase?: boolean;
  /** Enable Convex call tracking */
  trackConvex?: boolean;
  /** Enable in development mode only */
  devOnly?: boolean;
  /** Reconnection configuration */
  reconnect?: ReconnectConfig;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AccessibilityState {
  disabled?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  busy?: boolean;
  expanded?: boolean;
}

export interface AccessibilityValue {
  min?: number;
  max?: number;
  now?: number;
  text?: string;
}

export interface AccessibilityNode {
  ref: string;
  role: string;
  label?: string;
  hint?: string;
  testID?: string;
  placeholder?: string;
  state?: AccessibilityState;
  value?: AccessibilityValue;
  bounds: Bounds;
  children: AccessibilityNode[];
}

export interface RefEntry {
  role: string;
  label?: string;
  hint?: string;
  testID?: string;
  placeholder?: string;
  bounds: Bounds;
  state?: AccessibilityState;
  value?: AccessibilityValue;
}

export interface RefMap {
  [ref: string]: RefEntry;
}

export interface EnhancedSnapshot {
  tree: string;
  refs: RefMap;
  viewport: { width: number; height: number };
  route?: string;
  timestamp: string;
  /** Whether this snapshot came from cache */
  fromCache?: boolean;
  /** Cache version when snapshot was created */
  cacheVersion?: number;
}

export interface SnapshotOptions {
  /** Only include interactive elements (buttons, inputs, etc.) */
  interactive?: boolean;
  /** Use compact output (skip non-labeled generic nodes) */
  compact?: boolean;
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Filter out off-screen elements */
  visibleOnly?: boolean;
  /** Force fresh snapshot, bypassing cache */
  fresh?: boolean;
  /** Override default cache max age (ms) */
  maxCacheAge?: number;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: string;
}

export interface NetworkResponse {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string;
  duration: number;
}

export interface TrackedRequest {
  request: NetworkRequest;
  response?: NetworkResponse;
  error?: string;
}

export interface SupabaseCall {
  id: string;
  type: 'query' | 'mutation' | 'realtime' | 'auth' | 'storage';
  table?: string;
  operation?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
  timestamp: string;
  duration: number;
}

export interface ConvexCall {
  id: string;
  type: 'query' | 'mutation' | 'action';
  functionName: string;
  args: unknown;
  result?: unknown;
  error?: unknown;
  timestamp: string;
  duration: number;
}

export interface MockConfig {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string | object;
  delay?: number;
}

export interface AgentBridgeContext {
  /** Is the bridge connected to the daemon */
  isConnected: boolean;
  /** Get the current accessibility snapshot */
  getSnapshot: (options?: SnapshotOptions) => Promise<EnhancedSnapshot>;
  /** Get tracked network requests */
  getRequests: () => TrackedRequest[];
  /** Get tracked Supabase calls */
  getSupabaseCalls: () => SupabaseCall[];
  /** Get tracked Convex calls */
  getConvexCalls: () => ConvexCall[];
  /** Clear all tracked data */
  clearTracking: () => void;
}

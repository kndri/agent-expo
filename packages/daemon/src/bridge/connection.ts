/**
 * BridgeConnection
 *
 * WebSocket connection to the in-app bridge module.
 * Enables rich communication with the React Native app.
 */

import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import {
  Errors,
  logger,
  type EnhancedSnapshot,
  type TrackedRequest,
  type SupabaseCall,
  type ConvexCall,
  type MockConfig,
} from '@agent-expo/protocol';

const log = logger.child('connection');

const DEFAULT_PORT = 8765;
const CONNECTION_TIMEOUT = 5000;
const REQUEST_TIMEOUT = 10000;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface BridgeMessage {
  id: string;
  type: string;
  payload?: unknown;
}

interface BridgeResponse {
  id: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export class BridgeConnection {
  private ws: WebSocket | null = null;
  private port: number;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private connected: boolean = false;

  // Cached data from bridge
  private trackedRequests: TrackedRequest[] = [];
  private supabaseCalls: SupabaseCall[] = [];
  private convexCalls: ConvexCall[] = [];
  private mocks: Map<string, MockConfig> = new Map();

  constructor(port: number = DEFAULT_PORT) {
    this.port = port;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to the bridge
   */
  async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Bridge connection timeout'));
      }, CONNECTION_TIMEOUT);

      try {
        this.ws = new WebSocket(`ws://localhost:${this.port}`);

        this.ws.on('open', () => {
          clearTimeout(timeout);
          this.connected = true;
          this.setupListeners();
          resolve();
        });

        this.ws.on('error', (error) => {
          clearTimeout(timeout);
          this.connected = false;
          reject(error);
        });
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the bridge
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.clearPendingRequests();
  }

  /**
   * Setup WebSocket listeners
   */
  private setupListeners(): void {
    if (!this.ws) return;

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString()) as BridgeResponse;
        this.handleMessage(message);
      } catch (error) {
        log.error('Failed to parse bridge message:', error);
      }
    });

    this.ws.on('close', () => {
      this.connected = false;
      this.clearPendingRequests();
    });

    this.ws.on('error', (error) => {
      log.error('Bridge connection error:', error);
      this.connected = false;
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: BridgeResponse): void {
    const pending = this.pendingRequests.get(message.id);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);

      if (message.success) {
        pending.resolve(message.data);
      } else {
        pending.reject(new Error(message.error || 'Bridge request failed'));
      }
    }
  }

  /**
   * Send a request to the bridge
   */
  private async request<T>(type: string, payload?: unknown): Promise<T> {
    if (!this.isConnected()) {
      throw Errors.BRIDGE_NOT_CONNECTED();
    }

    const id = uuid();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Bridge request timeout: ${type}`));
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timeout,
      });

      const message: BridgeMessage = { id, type, payload };
      this.ws!.send(JSON.stringify(message));
    });
  }

  /**
   * Clear all pending requests
   */
  private clearPendingRequests(): void {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }

  // ============================================
  // Bridge API
  // ============================================

  /**
   * Get accessibility snapshot from the app
   */
  async getSnapshot(options?: {
    interactive?: boolean;
    compact?: boolean;
    maxDepth?: number;
  }): Promise<EnhancedSnapshot> {
    return this.request<EnhancedSnapshot>('snapshot', options);
  }

  /**
   * Tap an element by testID
   */
  async tapByTestID(testID: string): Promise<void> {
    await this.request('tap', { testID });
  }

  /**
   * Tap an element by ref
   */
  async tapByRef(ref: string): Promise<void> {
    await this.request('tap', { ref });
  }

  /**
   * Fill text into an element
   */
  async fillText(ref: string, text: string): Promise<void> {
    await this.request('fill', { ref, text });
  }

  /**
   * Clear text from an element
   */
  async clearText(ref: string): Promise<void> {
    await this.request('clear', { ref });
  }

  /**
   * Scroll within an element
   */
  async scroll(direction: string, ref?: string): Promise<void> {
    await this.request('scroll', { direction, ref });
  }

  /**
   * Get current route/screen
   */
  async getCurrentRoute(): Promise<string | null> {
    return this.request<string | null>('getRoute');
  }

  // ============================================
  // Network Tracking
  // ============================================

  /**
   * Get tracked network requests
   */
  getRequests(filter?: { url?: string; method?: string; status?: number }): TrackedRequest[] {
    let requests = [...this.trackedRequests];

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
  }

  /**
   * Refresh network requests from bridge
   */
  async refreshRequests(): Promise<TrackedRequest[]> {
    this.trackedRequests = await this.request<TrackedRequest[]>('getRequests');
    return this.trackedRequests;
  }

  /**
   * Mock a network response
   */
  mockResponse(pattern: string, config: MockConfig | object): void {
    const mockConfig: MockConfig = 'status' in config ? config as MockConfig : { body: config };
    this.mocks.set(pattern, mockConfig);

    if (this.isConnected()) {
      this.request('mock', { pattern, config: mockConfig }).catch((e) => log.error('Bridge request failed:', e));
    }
  }

  /**
   * Clear all mocks
   */
  clearMocks(): void {
    this.mocks.clear();
    if (this.isConnected()) {
      this.request('clearMocks').catch((e) => log.error('Bridge request failed:', e));
    }
  }

  // ============================================
  // Supabase Tracking
  // ============================================

  /**
   * Get Supabase calls
   */
  getSupabaseCalls(filter?: { table?: string; operation?: string }): SupabaseCall[] {
    let calls = [...this.supabaseCalls];

    if (filter?.table) {
      calls = calls.filter((c) => c.table === filter.table);
    }
    if (filter?.operation) {
      calls = calls.filter((c) => c.operation === filter.operation);
    }

    return calls;
  }

  /**
   * Refresh Supabase calls from bridge
   */
  async refreshSupabaseCalls(): Promise<SupabaseCall[]> {
    this.supabaseCalls = await this.request<SupabaseCall[]>('getSupabaseCalls');
    return this.supabaseCalls;
  }

  /**
   * Clear Supabase call history
   */
  clearSupabaseCalls(): void {
    this.supabaseCalls = [];
    if (this.isConnected()) {
      this.request('clearSupabaseCalls').catch((e) => log.error('Bridge request failed:', e));
    }
  }

  // ============================================
  // Convex Tracking
  // ============================================

  /**
   * Get Convex calls
   */
  getConvexCalls(filter?: { functionName?: string; type?: string }): ConvexCall[] {
    let calls = [...this.convexCalls];

    if (filter?.functionName) {
      calls = calls.filter((c) => c.functionName.includes(filter.functionName!));
    }
    if (filter?.type) {
      calls = calls.filter((c) => c.type === filter.type);
    }

    return calls;
  }

  /**
   * Refresh Convex calls from bridge
   */
  async refreshConvexCalls(): Promise<ConvexCall[]> {
    this.convexCalls = await this.request<ConvexCall[]>('getConvexCalls');
    return this.convexCalls;
  }

  /**
   * Clear Convex call history
   */
  clearConvexCalls(): void {
    this.convexCalls = [];
    if (this.isConnected()) {
      this.request('clearConvexCalls').catch((e) => log.error('Bridge request failed:', e));
    }
  }
}

/**
 * AgentExpoClient
 *
 * Programmatic client for controlling React Native apps.
 */

import * as net from 'net';
import * as path from 'path';
import * as os from 'os';
import {
  Errors,
  ExponentialBackoff,
  delay,
  logger,
  type BackoffConfig,
  type Command,
  type Response,
  type Platform,
  type Device,
  type EnhancedSnapshot,
  type TrackedRequest,
  type SupabaseCall,
  type ConvexCall,
  type AssertionResult,
  type ScrollDirection,
} from '@agent-expo/protocol';

const log = logger.child('sdk');

export interface ClientConfig {
  /** Session name for isolated instances */
  session?: string;
  /** TCP port (for Windows or remote connection) */
  port?: number;
  /** Auto-start daemon if not running */
  autoStartDaemon?: boolean;
  /** Connection retry options */
  retry?: Partial<BackoffConfig>;
}

export interface ClientStatus {
  connected: boolean;
  daemonRunning: boolean;
  device: Device | null;
  bridgeConnected: boolean;
}

export class AgentExpoClient {
  private socket: net.Socket | null = null;
  private session: string;
  private port: number | undefined;
  private retryConfig: Partial<BackoffConfig> | undefined;
  private responseBuffer: string = '';
  private pendingResolve: ((response: Response<unknown>) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;
  private commandIdCounter: number = 0;

  constructor(config: ClientConfig = {}) {
    this.session = config.session || 'default';
    this.port = config.port;
    this.retryConfig = config.retry;
    // autoStartDaemon will be used for auto-starting daemon in future
  }

  /**
   * Generate unique command ID
   */
  private generateId(): string {
    return `sdk-${++this.commandIdCounter}-${Date.now()}`;
  }

  /**
   * Get socket path
   */
  private getSocketPath(): string {
    const tmpDir = os.tmpdir();
    return path.join(tmpDir, `agent-expo-${this.session}.sock`);
  }

  /**
   * Connect to daemon
   */
  async connect(): Promise<void> {
    if (this.socket) return;

    return this.attemptConnect();
  }

  /**
   * Connect with retry using exponential backoff
   *
   * @param options Optional backoff configuration to override constructor config
   */
  async connectWithRetry(options?: Partial<BackoffConfig>): Promise<void> {
    if (this.socket) return;

    const backoff = new ExponentialBackoff({
      ...this.retryConfig,
      ...options,
    });

    let lastError: Error | undefined;

    while (backoff.shouldRetry()) {
      try {
        await this.attemptConnect();
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.socket = null;

        if (!backoff.shouldRetry()) {
          break;
        }

        const retryDelay = backoff.nextDelay();
        const attempt = backoff.getAttempt();
        log.debug(`Retrying connection in ${retryDelay}ms (attempt ${attempt})`);
        await delay(retryDelay);
      }
    }

    throw lastError || Errors.DAEMON_NOT_RUNNING();
  }

  /**
   * Internal method to attempt a single connection
   */
  private attemptConnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);

      if (this.port || os.platform() === 'win32') {
        this.socket = net.createConnection({
          port: this.port || 9876,
          host: '127.0.0.1',
        });
      } else {
        this.socket = net.createConnection({
          path: this.getSocketPath(),
        });
      }

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.setupListeners();
        resolve();
      });

      this.socket.on('error', (err) => {
        clearTimeout(timeout);
        this.socket = null;
        reject(err);
      });
    });
  }

  /**
   * Setup socket listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('data', (data) => {
      this.responseBuffer += data.toString();

      const lines = this.responseBuffer.split('\n');
      this.responseBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const response = JSON.parse(line);
          if (this.pendingResolve) {
            this.pendingResolve(response);
            this.pendingResolve = null;
            this.pendingReject = null;
          }
        } catch {
          if (this.pendingReject) {
            this.pendingReject(new Error('Invalid response'));
            this.pendingResolve = null;
            this.pendingReject = null;
          }
        }
      }
    });

    this.socket.on('close', () => {
      this.socket = null;
    });
  }

  /**
   * Send a command
   */
  private async send<T>(command: Command): Promise<Response<T>> {
    await this.connect();

    if (!this.socket) {
      throw Errors.SDK_NOT_CONNECTED();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(new Error('Request timeout'));
      }, 60000);

      this.pendingResolve = (response) => {
        clearTimeout(timeout);
        resolve(response as Response<T>);
      };

      this.pendingReject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      this.socket!.write(JSON.stringify(command) + '\n');
    });
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Launch a device and app
   */
  async launch(options: {
    platform: Platform;
    device?: string;
    app?: string;
    bundleId?: string;
    clearState?: boolean;
  }): Promise<Device> {
    const response = await this.send<{ device: Device }>({
      id: this.generateId(),
      action: 'launch',
      ...options,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.device;
  }

  /**
   * Terminate the app
   */
  async terminate(): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'terminate',
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  // ============================================
  // Snapshot
  // ============================================

  /**
   * Get accessibility snapshot
   */
  async snapshot(options?: {
    interactive?: boolean;
    compact?: boolean;
    withScreenshot?: boolean;
  }): Promise<EnhancedSnapshot & { screenshot?: string }> {
    const response = await this.send<EnhancedSnapshot & { screenshot?: string }>({
      id: this.generateId(),
      action: 'snapshot',
      ...options,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data;
  }

  // ============================================
  // Interaction
  // ============================================

  /**
   * Tap an element
   */
  async tap(ref: string, options?: { count?: number; duration?: number }): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'tap',
      ref,
      ...options,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Tap at coordinates
   */
  async tapAt(x: number, y: number): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'tap',
      coordinates: { x, y },
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Fill text into input
   */
  async fill(ref: string, text: string, clear?: boolean): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'fill',
      ref,
      text,
      clear,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Clear text from input
   */
  async clear(ref: string): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'clear',
      ref,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Type text (without focusing on specific element)
   */
  async type(text: string, delay?: number): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'type',
      text,
      delay,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Double tap an element
   */
  async doubleTap(ref: string): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'doubleTap',
      ref,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Long press an element
   */
  async longPress(ref: string, duration?: number): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'longPress',
      ref,
      duration,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Scroll
   */
  async scroll(
    direction: ScrollDirection,
    options?: { distance?: number; toRef?: string; withinRef?: string }
  ): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'scroll',
      direction,
      distance: options?.distance,
      toRef: options?.toRef,
      ref: options?.withinRef,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Swipe
   */
  async swipe(
    from: { x: number; y: number },
    to: { x: number; y: number },
    duration?: number
  ): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'swipe',
      from,
      to,
      duration,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  // ============================================
  // Navigation
  // ============================================

  /**
   * Open deep link
   */
  async navigate(url: string): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'navigate',
      url,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Press back
   */
  async back(): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'back',
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Press home
   */
  async home(): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'home',
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  // ============================================
  // Screenshot
  // ============================================

  /**
   * Take screenshot
   */
  async screenshot(path?: string): Promise<string> {
    const response = await this.send<{ base64?: string; path?: string }>({
      id: this.generateId(),
      action: 'screenshot',
      path,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.base64 || response.data.path || '';
  }

  // ============================================
  // Assertions
  // ============================================

  /**
   * Assert something about an element
   */
  async assert(
    ref: string,
    assertion: string,
    value?: string
  ): Promise<AssertionResult> {
    const response = await this.send<AssertionResult>({
      id: this.generateId(),
      action: 'assert',
      ref,
      assertion: assertion as any,
      value,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data;
  }

  /**
   * Wait for element
   */
  async waitFor(
    ref: string,
    condition: 'visible' | 'hidden' | 'exists' | 'notExists',
    timeout?: number
  ): Promise<boolean> {
    const response = await this.send<{ found: boolean }>({
      id: this.generateId(),
      action: 'waitFor',
      ref,
      condition,
      timeout,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.found;
  }

  // ============================================
  // Network
  // ============================================

  /**
   * Get network requests
   */
  async getRequests(filter?: {
    url?: string;
    method?: string;
    status?: number;
  }): Promise<TrackedRequest[]> {
    const response = await this.send<{ requests: TrackedRequest[] }>({
      id: this.generateId(),
      action: 'networkRequests',
      filter: filter?.url,
      method: filter?.method,
      status: filter?.status,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.requests;
  }

  /**
   * Get Supabase calls
   */
  async getSupabaseCalls(filter?: {
    table?: string;
    operation?: string;
  }): Promise<SupabaseCall[]> {
    const response = await this.send<{ calls: SupabaseCall[] }>({
      id: this.generateId(),
      action: 'supabaseCalls',
      ...filter,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.calls;
  }

  /**
   * Get Convex calls
   */
  async getConvexCalls(filter?: {
    functionName?: string;
    type?: 'query' | 'mutation' | 'action';
  }): Promise<ConvexCall[]> {
    const response = await this.send<{ calls: ConvexCall[] }>({
      id: this.generateId(),
      action: 'convexCalls',
      ...filter,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.calls;
  }

  /**
   * Mock a network response
   */
  async mockResponse(
    pattern: string,
    response: {
      status?: number;
      body?: string | Record<string, unknown>;
      headers?: Record<string, string>;
      delay?: number;
    }
  ): Promise<void> {
    const resp = await this.send({
      id: this.generateId(),
      action: 'networkMock',
      pattern,
      response,
    });

    if (!resp.success) {
      throw new Error(resp.error);
    }
  }

  /**
   * Clear all mocks
   */
  async clearMocks(): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'networkClearMocks',
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  // ============================================
  // Device
  // ============================================

  /**
   * List available devices
   */
  async listDevices(platform?: Platform): Promise<Device[]> {
    const response = await this.send<{ devices: Device[] }>({
      id: this.generateId(),
      action: 'deviceList',
      platform,
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.devices;
  }

  /**
   * Get current device info
   */
  async getDevice(): Promise<Device | null> {
    const response = await this.send<{ device?: Device }>({
      id: this.generateId(),
      action: 'deviceInfo',
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    return response.data.device || null;
  }

  /**
   * Set mock location
   */
  async setLocation(latitude: number, longitude: number): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'setLocation',
      latitude,
      longitude,
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  /**
   * Reload the app
   */
  async reload(): Promise<void> {
    const response = await this.send({
      id: this.generateId(),
      action: 'reload',
    });

    if (!response.success) {
      throw new Error(response.error);
    }
  }

  // ============================================
  // Status
  // ============================================

  /**
   * Get status
   */
  async status(): Promise<ClientStatus> {
    try {
      const response = await this.send<{
        daemon: { version: string };
        device?: Device;
        bridge: { connected: boolean };
      }>({
        id: this.generateId(),
        action: 'status',
      });

      if (response.success) {
        return {
          connected: true,
          daemonRunning: true,
          device: response.data.device || null,
          bridgeConnected: response.data.bridge.connected,
        };
      }
    } catch {
      // Not connected
    }

    return {
      connected: false,
      daemonRunning: false,
      device: null,
      bridgeConnected: false,
    };
  }

  /**
   * Ping daemon
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.send({
        id: this.generateId(),
        action: 'ping',
      });
      return response.success;
    } catch {
      return false;
    }
  }
}

/**
 * Bridge WebSocket Server
 *
 * WebSocket server that accepts connections from in-app bridges.
 * Handles communication between the daemon and React Native apps.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuid } from 'uuid';
import { Errors } from '@agent-expo/protocol';
import type { AppController } from '../app-controller.js';

const DEFAULT_BRIDGE_PORT = 8765;

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

interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

export class BridgeServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private controller: AppController | null = null;
  private port: number;
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor(port: number = DEFAULT_BRIDGE_PORT) {
    this.port = port;
  }

  /**
   * Set the app controller
   */
  setController(controller: AppController): void {
    this.controller = controller;
  }

  /**
   * Start the WebSocket server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocketServer({ port: this.port });

        this.wss.on('listening', () => {
          console.log(`Bridge WebSocket server listening on port ${this.port}`);
          resolve();
        });

        this.wss.on('error', (error) => {
          console.error('Bridge WebSocket server error:', error);
          reject(error);
        });

        this.wss.on('connection', (ws, req) => {
          this.handleConnection(ws, req);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (this.wss) {
      // Close all client connections
      for (const client of this.clients) {
        client.close();
      }
      this.clients.clear();

      // Close server
      this.wss.close();
      this.wss = null;
    }
  }

  /**
   * Check if any bridges are connected
   */
  hasConnections(): boolean {
    return this.clients.size > 0;
  }

  /**
   * Get number of connected bridges
   */
  getConnectionCount(): number {
    return this.clients.size;
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any): void {
    const clientId = uuid().substring(0, 8);
    console.log(`[Bridge] Client ${clientId} connected from ${req.socket.remoteAddress}`);

    this.clients.add(ws);

    ws.on('message', (data) => {
      this.handleMessage(ws, clientId, data.toString());
    });

    ws.on('close', () => {
      console.log(`[Bridge] Client ${clientId} disconnected`);
      this.clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error(`[Bridge] Client ${clientId} error:`, error);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle incoming message from bridge
   */
  private handleMessage(ws: WebSocket, clientId: string, data: string): void {
    try {
      const message = JSON.parse(data) as BridgeMessage | BridgeResponse;

      // Check if this is a response to a pending request
      if ('success' in message) {
        this.handleResponse(message as BridgeResponse);
        return;
      }

      // Otherwise it's a message from the bridge (shouldn't happen in current design)
      console.log(`[Bridge] Received message from ${clientId}:`, message);
    } catch (error) {
      console.error(`[Bridge] Failed to parse message from ${clientId}:`, error);
    }
  }

  /**
   * Handle response from bridge
   */
  private handleResponse(response: BridgeResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);

      if (response.success) {
        pending.resolve(response.data);
      } else {
        pending.reject(new Error(response.error || 'Bridge request failed'));
      }
    }
  }

  /**
   * Send a request to the first connected bridge and wait for response
   */
  async request<T>(type: string, payload?: unknown, timeoutMs: number = 10000): Promise<T> {
    const client = this.getActiveClient();
    if (!client) {
      throw Errors.BRIDGE_NOT_CONNECTED();
    }

    const id = uuid();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Bridge request timeout: ${type}`));
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: resolve as (data: unknown) => void,
        reject,
        timeout,
      });

      const message: BridgeMessage = { id, type, payload };
      client.send(JSON.stringify(message));
    });
  }

  /**
   * Send a request without waiting for response
   */
  send(type: string, payload?: unknown): void {
    const client = this.getActiveClient();
    if (client) {
      const message: BridgeMessage = { id: uuid(), type, payload };
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast to all connected bridges
   */
  broadcast(type: string, payload?: unknown): void {
    const message: BridgeMessage = { id: uuid(), type, payload };
    const data = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * Get an active client (first connected one)
   */
  private getActiveClient(): WebSocket | null {
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        return client;
      }
    }
    return null;
  }

  // ============================================
  // High-level Bridge API
  // ============================================

  /**
   * Get snapshot from bridge
   */
  async getSnapshot(options?: {
    interactive?: boolean;
    compact?: boolean;
    maxDepth?: number;
  }): Promise<any> {
    return this.request('snapshot', options);
  }

  /**
   * Tap element by testID
   */
  async tapByTestID(testID: string): Promise<void> {
    await this.request('tap', { testID });
  }

  /**
   * Tap element by ref
   */
  async tapByRef(ref: string): Promise<void> {
    await this.request('tap', { ref });
  }

  /**
   * Fill text into element
   */
  async fillText(ref: string, text: string): Promise<void> {
    await this.request('fill', { ref, text });
  }

  /**
   * Clear text from element
   */
  async clearText(ref: string): Promise<void> {
    await this.request('clear', { ref });
  }

  /**
   * Scroll in direction
   */
  async scroll(direction: string, ref?: string): Promise<void> {
    await this.request('scroll', { direction, ref });
  }

  /**
   * Get tracked network requests
   */
  async getRequests(): Promise<any[]> {
    return this.request('getRequests');
  }

  /**
   * Get Supabase calls
   */
  async getSupabaseCalls(): Promise<any[]> {
    return this.request('getSupabaseCalls');
  }

  /**
   * Get Convex calls
   */
  async getConvexCalls(): Promise<any[]> {
    return this.request('getConvexCalls');
  }

  /**
   * Add a mock
   */
  async addMock(pattern: string, config: any): Promise<void> {
    await this.request('mock', { pattern, config });
  }

  /**
   * Clear all mocks
   */
  async clearMocks(): Promise<void> {
    await this.request('clearMocks');
  }
}

/**
 * Mock Bridge
 *
 * Simulates a React Native app bridge connection for testing.
 */

import WebSocket from 'ws';
import type { MockAppState, MockElement, MockNetworkRequest } from './mock-app-state.js';

export interface MockBridgeOptions {
  /** WebSocket port (default: 8347) */
  port?: number;
  /** Whether to log messages (default: false) */
  verbose?: boolean;
}

type CommandHandler = (command: unknown) => { success: boolean; data?: unknown; error?: string };
type EventCallback = (data: unknown) => void;

/**
 * MockBridge simulates a React Native app connection for testing.
 *
 * Usage:
 * ```typescript
 * import { MockBridge, loginScreen } from '@agent-expo/mock-bridge';
 *
 * const bridge = new MockBridge(loginScreen);
 * await bridge.connect();
 *
 * // Bridge will now respond to daemon commands
 * // Use client.tap(), client.fill(), etc.
 *
 * bridge.disconnect();
 * ```
 */
export class MockBridge {
  private ws: WebSocket | null = null;
  private state: MockAppState;
  private options: Required<MockBridgeOptions>;
  private handlers: Map<string, CommandHandler> = new Map();
  private eventListeners: Map<string, EventCallback[]> = new Map();

  constructor(initialState: MockAppState, options: MockBridgeOptions = {}) {
    this.state = initialState;
    this.options = {
      port: options.port ?? 8347,
      verbose: options.verbose ?? false,
    };
    this.setupDefaultHandlers();
  }

  /**
   * Connect to the daemon's WebSocket server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `ws://localhost:${this.options.port}`;
      this.log(`Connecting to ${url}...`);

      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.log('Connected to daemon');
        // Send bridge identification
        this.send({
          type: 'bridge_connect',
          platform: this.state.device?.platform || 'ios',
        });
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (err) {
          this.log(`Failed to parse message: ${err}`);
        }
      });

      this.ws.on('error', (err) => {
        this.log(`WebSocket error: ${err.message}`);
        reject(err);
      });

      this.ws.on('close', () => {
        this.log('Disconnected from daemon');
        this.ws = null;
      });
    });
  }

  /**
   * Disconnect from daemon
   */
  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming commands from daemon
   */
  private handleMessage(message: { id?: string; action?: string; [key: string]: unknown }): void {
    const { id, action } = message;

    if (!id || !action) {
      this.log(`Invalid message format: ${JSON.stringify(message)}`);
      return;
    }

    this.log(`Received command: ${action}`);

    const handler = this.handlers.get(action);

    if (handler) {
      try {
        const response = handler(message);
        this.send({ id, ...response });
      } catch (err) {
        this.send({
          id,
          success: false,
          error: err instanceof Error ? err.message : 'Handler error',
        });
      }
    } else {
      this.send({
        id,
        success: false,
        error: `Unknown action: ${action}`,
      });
    }
  }

  /**
   * Send response to daemon
   */
  private send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Setup default command handlers
   */
  private setupDefaultHandlers(): void {
    // Snapshot handler
    this.handlers.set('snapshot', () => ({
      success: true,
      data: {
        tree: this.buildAccessibilityTree(),
        timestamp: Date.now(),
      },
    }));

    // Tap handler
    this.handlers.set('tap', (cmd) => {
      const command = cmd as { ref?: string; testID?: string; coordinates?: { x: number; y: number } };
      const element = command.ref ? this.findElement(command.ref) : undefined;

      if (command.ref && !element) {
        return { success: false, error: `Element ${command.ref} not found` };
      }

      this.emit('tap', { element, command });
      return { success: true, data: { tapped: true, ref: command.ref } };
    });

    // Double tap handler
    this.handlers.set('doubleTap', (cmd) => {
      const command = cmd as { ref?: string };
      const element = command.ref ? this.findElement(command.ref) : undefined;

      if (command.ref && !element) {
        return { success: false, error: `Element ${command.ref} not found` };
      }

      this.emit('doubleTap', { element, command });
      return { success: true, data: { doubleTapped: true, ref: command.ref } };
    });

    // Long press handler
    this.handlers.set('longPress', (cmd) => {
      const command = cmd as { ref?: string; duration?: number };
      const element = command.ref ? this.findElement(command.ref) : undefined;

      if (command.ref && !element) {
        return { success: false, error: `Element ${command.ref} not found` };
      }

      this.emit('longPress', { element, command });
      return { success: true, data: { longPressed: true, ref: command.ref } };
    });

    // Fill handler
    this.handlers.set('fill', (cmd) => {
      const command = cmd as { ref?: string; testID?: string; text: string };
      const element = command.ref
        ? this.findElement(command.ref)
        : command.testID
          ? this.findElementByTestID(command.testID)
          : undefined;

      if (!element) {
        return { success: false, error: `Element not found` };
      }

      // Update element value in state
      element.value = command.text;
      this.emit('fill', { element, text: command.text });
      return { success: true, data: { filled: true, text: command.text } };
    });

    // Clear handler
    this.handlers.set('clear', (cmd) => {
      const command = cmd as { ref?: string };
      const element = command.ref ? this.findElement(command.ref) : undefined;

      if (command.ref && !element) {
        return { success: false, error: `Element ${command.ref} not found` };
      }

      if (element) {
        element.value = '';
      }
      this.emit('clear', { element, command });
      return { success: true, data: { cleared: true } };
    });

    // Type handler (types into currently focused element)
    this.handlers.set('type', (cmd) => {
      const command = cmd as { text: string };
      this.emit('type', { text: command.text });
      return { success: true, data: { typed: true, text: command.text } };
    });

    // Scroll handler
    this.handlers.set('scroll', (cmd) => {
      const command = cmd as { direction: string; distance?: number };
      this.emit('scroll', { direction: command.direction, distance: command.distance });
      return { success: true, data: { scrolled: true, direction: command.direction } };
    });

    // Swipe handler
    this.handlers.set('swipe', (cmd) => {
      const command = cmd as { from: { x: number; y: number }; to: { x: number; y: number } };
      this.emit('swipe', { from: command.from, to: command.to });
      return { success: true, data: { swiped: true } };
    });

    // Screenshot handler
    this.handlers.set('screenshot', () => {
      if (!this.state.screenshot) {
        // Return a placeholder 1x1 transparent PNG
        const placeholder = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        return {
          success: true,
          data: {
            base64: placeholder.toString('base64'),
            format: 'png',
            width: 1,
            height: 1,
          },
        };
      }
      return {
        success: true,
        data: {
          base64: this.state.screenshot.toString('base64'),
          format: 'png',
        },
      };
    });

    // Network requests handler
    this.handlers.set('networkRequests', () => ({
      success: true,
      data: {
        requests: this.state.networkRequests || [],
        count: this.state.networkRequests?.length || 0,
      },
    }));

    // Device info handler
    this.handlers.set('deviceInfo', () => ({
      success: true,
      data: {
        device: this.state.device || {
          platform: 'ios',
          name: 'Mock Device',
          model: 'Mock',
          osVersion: '17.0',
        },
        app: this.state.app,
      },
    }));

    // Status handler
    this.handlers.set('status', () => ({
      success: true,
      data: {
        bridge: { connected: true },
        device: this.state.device,
        app: this.state.app,
      },
    }));

    // Ping handler
    this.handlers.set('ping', () => ({
      success: true,
      data: { pong: true, timestamp: new Date().toISOString() },
    }));

    // Assert handler
    this.handlers.set('assert', (cmd) => {
      const command = cmd as { ref?: string; testID?: string; assertion: string; value?: string };
      const element = command.ref
        ? this.findElement(command.ref)
        : command.testID
          ? this.findElementByTestID(command.testID)
          : undefined;

      const result = this.evaluateAssertion(element, command.assertion, command.value);
      return {
        success: true,
        data: {
          passed: result.passed,
          assertion: command.assertion,
          message: result.message,
        },
      };
    });

    // WaitFor handler (immediately returns for mock)
    this.handlers.set('waitFor', (cmd) => {
      const command = cmd as { ref?: string; testID?: string; condition: string };
      const element = command.ref
        ? this.findElement(command.ref)
        : command.testID
          ? this.findElementByTestID(command.testID)
          : undefined;

      const found = element !== undefined;
      return {
        success: true,
        data: { found, elapsed: 0 },
      };
    });

    // Back handler
    this.handlers.set('back', () => {
      this.emit('back', {});
      return { success: true, data: { pressed: 'back' } };
    });

    // Home handler
    this.handlers.set('home', () => {
      this.emit('home', {});
      return { success: true, data: { pressed: 'home' } };
    });
  }

  /**
   * Evaluate an assertion against an element
   */
  private evaluateAssertion(
    element: MockElement | undefined,
    assertion: string,
    value?: string
  ): { passed: boolean; message: string } {
    switch (assertion) {
      case 'visible':
        return {
          passed: element?.visible !== false,
          message: element ? 'Element is visible' : 'Element not found',
        };
      case 'hidden':
        return {
          passed: element?.visible === false || !element,
          message: element?.visible === false ? 'Element is hidden' : 'Element is visible',
        };
      case 'enabled':
        return {
          passed: element?.enabled !== false,
          message: element?.enabled !== false ? 'Element is enabled' : 'Element is disabled',
        };
      case 'disabled':
        return {
          passed: element?.enabled === false,
          message: element?.enabled === false ? 'Element is disabled' : 'Element is enabled',
        };
      case 'exists':
        return {
          passed: element !== undefined,
          message: element ? 'Element exists' : 'Element not found',
        };
      case 'notExists':
        return {
          passed: element === undefined,
          message: element ? 'Element exists' : 'Element not found',
        };
      case 'hasText':
        return {
          passed: element?.label === value || element?.value === value,
          message: `Element text: ${element?.label || element?.value}`,
        };
      case 'hasValue':
        return {
          passed: element?.value === value,
          message: `Element value: ${element?.value}`,
        };
      case 'checked':
        return {
          passed: element?.checked === true,
          message: element?.checked ? 'Element is checked' : 'Element is not checked',
        };
      case 'unchecked':
        return {
          passed: element?.checked !== true,
          message: element?.checked ? 'Element is checked' : 'Element is not checked',
        };
      default:
        return { passed: false, message: `Unknown assertion: ${assertion}` };
    }
  }

  /**
   * Build accessibility tree from state
   */
  private buildAccessibilityTree(): unknown {
    let refCounter = 0;

    const buildNode = (element: MockElement): unknown => ({
      ref: element.ref || `@e${++refCounter}`,
      role: element.role,
      label: element.label,
      testID: element.testID,
      value: element.value,
      bounds: element.bounds,
      visible: element.visible ?? true,
      enabled: element.enabled ?? true,
      children: element.children?.map(buildNode),
    });

    return {
      role: 'application',
      children: this.state.elements.map(buildNode),
    };
  }

  /**
   * Find element by ref
   */
  private findElement(ref: string): MockElement | undefined {
    const search = (elements: MockElement[]): MockElement | undefined => {
      for (const el of elements) {
        if (el.ref === ref) {
          return el;
        }
        if (el.children) {
          const found = search(el.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(this.state.elements);
  }

  /**
   * Find element by testID
   */
  private findElementByTestID(testID: string): MockElement | undefined {
    const search = (elements: MockElement[]): MockElement | undefined => {
      for (const el of elements) {
        if (el.testID === testID) {
          return el;
        }
        if (el.children) {
          const found = search(el.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(this.state.elements);
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  /**
   * Unsubscribe from events
   */
  off(event: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Emit event
   */
  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach((fn) => fn(data));
  }

  /**
   * Update mock state
   */
  setState(newState: Partial<MockAppState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Get current state
   */
  getState(): MockAppState {
    return { ...this.state };
  }

  /**
   * Add element to state
   */
  addElement(element: MockElement): void {
    this.state.elements.push(element);
  }

  /**
   * Remove element from state
   */
  removeElement(ref: string): boolean {
    const removeFromArray = (elements: MockElement[]): boolean => {
      const index = elements.findIndex((el) => el.ref === ref);
      if (index !== -1) {
        elements.splice(index, 1);
        return true;
      }
      for (const el of elements) {
        if (el.children && removeFromArray(el.children)) {
          return true;
        }
      }
      return false;
    };
    return removeFromArray(this.state.elements);
  }

  /**
   * Add custom command handler
   */
  addHandler(action: string, handler: CommandHandler): void {
    this.handlers.set(action, handler);
  }

  /**
   * Add network request to state
   */
  addNetworkRequest(request: MockNetworkRequest): void {
    if (!this.state.networkRequests) {
      this.state.networkRequests = [];
    }
    this.state.networkRequests.push(request);
  }

  /**
   * Clear network requests
   */
  clearNetworkRequests(): void {
    this.state.networkRequests = [];
  }

  /**
   * Log message (if verbose)
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.log(`[MockBridge] ${message}`);
    }
  }
}

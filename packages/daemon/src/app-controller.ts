/**
 * AppController
 *
 * Central orchestrator for controlling the app and device.
 * Coordinates between DeviceManager, BridgeServer, and SnapshotEngine.
 */

import { v4 as uuid } from 'uuid';
import type {
  Device,
  Platform,
  EnhancedSnapshot,
  RefMap,
  RefEntry,
  TrackedRequest,
  SupabaseCall,
  ConvexCall,
  AssertionResult,
  Viewport,
  ScrollDirection,
  Point,
} from '@agent-expo/protocol';
import { DeviceManager } from './simulator/index.js';
import type { BridgeServer } from './bridge/server.js';
import { SnapshotEngine } from './snapshot/engine.js';
import { VisualComparator, type CompareOptions, type ComparisonResult } from './visual/comparator.js';

export interface LaunchConfig {
  platform: Platform;
  device?: string;
  appPath?: string;
  bundleId?: string;
  clearState?: boolean;
  headless?: boolean;
}

export interface SnapshotOptions {
  interactive?: boolean;
  compact?: boolean;
  maxDepth?: number;
  withScreenshot?: boolean;
  native?: boolean;
}

export interface TapOptions {
  count?: number;
  duration?: number;
}

export class AppController {
  private deviceManager: DeviceManager;
  private bridgeServer: BridgeServer | null = null;
  private snapshotEngine: SnapshotEngine;
  private visualComparator: VisualComparator;
  private currentBundleId: string | null = null;
  private refMap: RefMap = {};

  constructor() {
    this.deviceManager = new DeviceManager();
    this.snapshotEngine = new SnapshotEngine();
    this.visualComparator = new VisualComparator();
  }

  /**
   * Set the bridge server (called by Daemon after construction)
   */
  setBridgeServer(bridgeServer: BridgeServer): void {
    this.bridgeServer = bridgeServer;
  }

  /**
   * Get the current device
   */
  getDevice(): Device | null {
    return this.deviceManager.getActiveDevice();
  }

  /**
   * List all available devices
   */
  async listDevices(platform?: Platform): Promise<Device[]> {
    if (platform) {
      return this.deviceManager.listDevices(platform);
    }
    return this.deviceManager.listAllDevices();
  }

  /**
   * Check if bridge is connected
   */
  isBridgeConnected(): boolean {
    return this.bridgeServer?.hasConnections() ?? false;
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Launch a device and app
   */
  async launch(config: LaunchConfig): Promise<Device> {
    // Boot the device
    const device = await this.deviceManager.boot(config.platform, config.device);

    // Install app if path provided
    if (config.appPath) {
      if (config.clearState && config.bundleId) {
        try {
          await this.deviceManager.uninstall(config.bundleId);
        } catch {
          // App may not be installed
        }
      }
      await this.deviceManager.install(config.appPath);
    }

    // Launch app if bundle ID provided
    if (config.bundleId) {
      if (config.clearState) {
        try {
          await this.deviceManager.terminate(config.bundleId);
        } catch {
          // App may not be running
        }
      }
      await this.deviceManager.launch(config.bundleId);
      this.currentBundleId = config.bundleId;
    }

    // Try to connect to bridge (may not be available immediately)
    await this.waitForBridge();

    return device;
  }

  /**
   * Terminate the app
   */
  async terminate(): Promise<void> {
    if (this.currentBundleId) {
      await this.deviceManager.terminate(this.currentBundleId);
    }
    // Note: Bridge connection is managed by the app, not us
    this.currentBundleId = null;
  }

  /**
   * Reinstall the app
   */
  async reinstall(appPath: string): Promise<void> {
    if (this.currentBundleId) {
      await this.deviceManager.uninstall(this.currentBundleId);
    }
    await this.deviceManager.install(appPath);
    if (this.currentBundleId) {
      await this.deviceManager.launch(this.currentBundleId);
    }
  }

  /**
   * Wait for bridge connection from the app
   */
  async waitForBridge(timeoutMs: number = 10000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (this.bridgeServer?.hasConnections()) {
        return true;
      }
      await this.sleep(500);
    }
    return false;
  }

  // ============================================
  // Navigation
  // ============================================

  /**
   * Open a deep link
   */
  async navigate(url: string): Promise<void> {
    await this.deviceManager.openURL(url);
  }

  /**
   * Press the back button (Android only)
   */
  async pressBack(): Promise<void> {
    await this.deviceManager.pressBack();
  }

  /**
   * Press the home button
   */
  async pressHome(): Promise<void> {
    await this.deviceManager.pressHome();
  }

  /**
   * Reload the app (terminate and relaunch)
   */
  async reload(): Promise<void> {
    if (this.currentBundleId) {
      await this.deviceManager.terminate(this.currentBundleId);
      await this.sleep(500);
      await this.deviceManager.launch(this.currentBundleId);
      await this.waitForBridge();
    }
  }

  // ============================================
  // Snapshot & Refs
  // ============================================

  /**
   * Get an accessibility snapshot
   */
  async getSnapshot(options: SnapshotOptions = {}): Promise<EnhancedSnapshot> {
    // If native mode is forced, skip bridge
    if (options.native) {
      const snapshot = await this.snapshotEngine.captureFromDevice(
        this.deviceManager,
        options
      );
      this.refMap = snapshot.refs;
      return snapshot;
    }

    // Try to get snapshot from bridge first (more accurate)
    if (this.bridgeServer?.hasConnections()) {
      try {
        const snapshot = await this.bridgeServer.getSnapshot(options);
        this.refMap = snapshot.refs;
        return snapshot;
      } catch {
        // Fall through to native method
        console.log('[AppController] Bridge snapshot failed, falling back to native');
      }
    }

    // Fall back to native accessibility dump
    const snapshot = await this.snapshotEngine.captureFromDevice(
      this.deviceManager,
      options
    );
    this.refMap = snapshot.refs;
    return snapshot;
  }

  /**
   * Get the current ref map
   */
  getRefMap(): RefMap {
    return this.refMap;
  }

  /**
   * Resolve a ref to its entry
   */
  resolveRef(ref: string): RefEntry | null {
    return this.refMap[ref] || null;
  }

  /**
   * Get tap coordinates for a ref
   */
  getTapPoint(ref: string): Point | null {
    const entry = this.resolveRef(ref);
    if (!entry) return null;

    return {
      x: entry.bounds.x + entry.bounds.width / 2,
      y: entry.bounds.y + entry.bounds.height / 2,
    };
  }

  // ============================================
  // Interactions
  // ============================================

  /**
   * Tap on an element by ref
   */
  async tap(ref: string, options: TapOptions = {}): Promise<void> {
    const point = this.getTapPoint(ref);
    if (!point) {
      throw new Error(`Ref not found: ${ref}`);
    }

    const count = options.count || 1;

    for (let i = 0; i < count; i++) {
      if (options.duration && options.duration > 0) {
        await this.deviceManager.longPress(point.x, point.y, options.duration);
      } else {
        await this.deviceManager.tap(point.x, point.y);
      }

      if (i < count - 1) {
        await this.sleep(100);
      }
    }
  }

  /**
   * Tap at coordinates
   */
  async tapCoordinates(x: number, y: number): Promise<void> {
    await this.deviceManager.tap(x, y);
  }

  /**
   * Tap by testID
   */
  async tapByTestID(testID: string): Promise<void> {
    // Find the ref with matching testID
    const ref = Object.entries(this.refMap).find(([_, entry]) => entry.testID === testID)?.[0];

    if (ref) {
      await this.tap(ref);
    } else if (this.bridgeServer?.hasConnections()) {
      // Try via bridge
      await this.bridgeServer.tapByTestID(testID);
    } else {
      throw new Error(`Element with testID "${testID}" not found`);
    }
  }

  /**
   * Long press on an element
   */
  async longPress(ref: string, duration: number = 1000): Promise<void> {
    await this.tap(ref, { duration });
  }

  /**
   * Fill text into an element
   */
  async fill(ref: string, text: string, clear: boolean = true): Promise<void> {
    // First tap to focus
    await this.tap(ref);
    await this.sleep(200);

    // Clear existing text if requested
    if (clear && this.bridgeServer?.hasConnections()) {
      await this.bridgeServer.clearText(ref);
    }

    // Type the text
    await this.deviceManager.typeText(text);
  }

  /**
   * Clear text in an element
   */
  async clear(ref: string): Promise<void> {
    await this.tap(ref);
    await this.sleep(200);

    if (this.bridgeServer?.hasConnections()) {
      await this.bridgeServer.clearText(ref);
    } else {
      // Select all and delete - platform specific
      // This is a simplification
      throw new Error('Clear requires bridge connection');
    }
  }

  /**
   * Type text (without focusing)
   */
  async type(text: string): Promise<void> {
    await this.deviceManager.typeText(text);
  }

  /**
   * Press a key
   */
  async pressKey(key: string): Promise<void> {
    await this.deviceManager.pressKey(key);
  }

  // ============================================
  // Scroll & Swipe
  // ============================================

  /**
   * Scroll in a direction
   */
  async scroll(direction: ScrollDirection, distance?: number, withinRef?: string): Promise<void> {
    if (withinRef) {
      const entry = this.resolveRef(withinRef);
      if (entry) {
        // Scroll within the element's bounds
        const centerX = entry.bounds.x + entry.bounds.width / 2;
        const centerY = entry.bounds.y + entry.bounds.height / 2;
        const scrollDistance = distance || Math.min(entry.bounds.height, entry.bounds.width) * 0.8;

        let startX = centerX;
        let startY = centerY;
        let endX = centerX;
        let endY = centerY;

        switch (direction) {
          case 'up':
            startY = centerY + scrollDistance / 2;
            endY = centerY - scrollDistance / 2;
            break;
          case 'down':
            startY = centerY - scrollDistance / 2;
            endY = centerY + scrollDistance / 2;
            break;
          case 'left':
            startX = centerX + scrollDistance / 2;
            endX = centerX - scrollDistance / 2;
            break;
          case 'right':
            startX = centerX - scrollDistance / 2;
            endX = centerX + scrollDistance / 2;
            break;
        }

        await this.deviceManager.swipe(startX, startY, endX, endY);
        return;
      }
    }

    await this.deviceManager.scroll(direction, distance);
  }

  /**
   * Scroll until a ref is visible
   */
  async scrollToRef(
    targetRef: string,
    direction: ScrollDirection = 'down',
    maxScrolls: number = 10
  ): Promise<boolean> {
    for (let i = 0; i < maxScrolls; i++) {
      // Check if element is visible
      const snapshot = await this.getSnapshot({ interactive: true });
      const entry = snapshot.refs[targetRef];

      if (entry) {
        // Element found
        return true;
      }

      // Scroll and try again
      await this.scroll(direction);
      await this.sleep(500);
    }

    return false;
  }

  /**
   * Swipe gesture
   */
  async swipe(from: Point, to: Point, duration?: number): Promise<void> {
    await this.deviceManager.swipe(from.x, from.y, to.x, to.y, duration);
  }

  // ============================================
  // Screenshot
  // ============================================

  /**
   * Take a screenshot
   */
  async screenshot(outputPath?: string): Promise<Buffer> {
    const path = outputPath || `/tmp/screenshot-${Date.now()}.png`;
    await this.deviceManager.screenshot(path);

    const fs = await import('fs');
    const buffer = fs.readFileSync(path);

    if (!outputPath) {
      fs.unlinkSync(path);
    }

    return buffer;
  }

  // ============================================
  // Network
  // ============================================

  /**
   * Get tracked network requests
   */
  async getRequests(filter?: { url?: string; method?: string; status?: number }): Promise<TrackedRequest[]> {
    if (!this.bridgeServer?.hasConnections()) {
      return [];
    }

    try {
      const requests = await this.bridgeServer.getRequests();

      // Apply filters
      let filtered = requests as TrackedRequest[];

      if (filter?.url) {
        filtered = filtered.filter((r) => r.request.url.includes(filter.url!));
      }
      if (filter?.method) {
        filtered = filtered.filter((r) => r.request.method === filter.method);
      }
      if (filter?.status) {
        filtered = filtered.filter((r) => r.response?.status === filter.status);
      }

      return filtered;
    } catch (error) {
      console.error('[AppController] Failed to get network requests:', error);
      return [];
    }
  }

  /**
   * Mock a network response
   */
  async mockResponse(pattern: string, response: object): Promise<void> {
    if (!this.bridgeServer?.hasConnections()) {
      throw new Error('Mock requires bridge connection');
    }
    await this.bridgeServer.addMock(pattern, response);
  }

  /**
   * Clear all mocks
   */
  async clearMocks(): Promise<void> {
    if (this.bridgeServer?.hasConnections()) {
      await this.bridgeServer.clearMocks();
    }
  }

  // ============================================
  // Supabase & Convex
  // ============================================

  /**
   * Get Supabase calls
   */
  async getSupabaseCalls(filter?: { table?: string; operation?: string }): Promise<SupabaseCall[]> {
    if (!this.bridgeServer?.hasConnections()) {
      return [];
    }

    try {
      const calls = await this.bridgeServer.getSupabaseCalls();

      // Apply filters
      let filtered = calls as SupabaseCall[];

      if (filter?.table) {
        filtered = filtered.filter((c) => c.table === filter.table);
      }
      if (filter?.operation) {
        filtered = filtered.filter((c) => c.operation === filter.operation);
      }

      return filtered;
    } catch (error) {
      console.error('[AppController] Failed to get Supabase calls:', error);
      return [];
    }
  }

  /**
   * Get Convex calls
   */
  async getConvexCalls(filter?: { functionName?: string; type?: string }): Promise<ConvexCall[]> {
    if (!this.bridgeServer?.hasConnections()) {
      return [];
    }

    try {
      const calls = await this.bridgeServer.getConvexCalls();

      // Apply filters
      let filtered = calls as ConvexCall[];

      if (filter?.functionName) {
        filtered = filtered.filter((c) => c.functionName.includes(filter.functionName!));
      }
      if (filter?.type) {
        filtered = filtered.filter((c) => c.type === filter.type);
      }

      return filtered;
    } catch (error) {
      console.error('[AppController] Failed to get Convex calls:', error);
      return [];
    }
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
    const entry = this.resolveRef(ref);

    switch (assertion) {
      case 'exists':
        return {
          passed: entry !== null,
          message: entry ? `Element ${ref} exists` : `Element ${ref} not found`,
        };

      case 'notExists':
        return {
          passed: entry === null,
          message: entry ? `Element ${ref} exists (expected not to)` : `Element ${ref} not found`,
        };

      case 'visible':
        if (!entry) {
          return { passed: false, message: `Element ${ref} not found` };
        }
        // A simple visibility check - element has positive bounds
        const isVisible = entry.bounds.width > 0 && entry.bounds.height > 0;
        return {
          passed: isVisible,
          message: isVisible ? `Element ${ref} is visible` : `Element ${ref} is not visible`,
        };

      case 'hidden':
        if (!entry) {
          return { passed: true, message: `Element ${ref} not found (treated as hidden)` };
        }
        const isHidden = entry.bounds.width === 0 || entry.bounds.height === 0;
        return {
          passed: isHidden,
          message: isHidden ? `Element ${ref} is hidden` : `Element ${ref} is visible`,
        };

      case 'enabled':
        if (!entry) {
          return { passed: false, message: `Element ${ref} not found` };
        }
        const isEnabled = !entry.state?.disabled;
        return {
          passed: isEnabled,
          message: isEnabled ? `Element ${ref} is enabled` : `Element ${ref} is disabled`,
        };

      case 'disabled':
        if (!entry) {
          return { passed: false, message: `Element ${ref} not found` };
        }
        const isDisabled = entry.state?.disabled === true;
        return {
          passed: isDisabled,
          message: isDisabled ? `Element ${ref} is disabled` : `Element ${ref} is enabled`,
        };

      case 'hasText':
        if (!entry) {
          return { passed: false, message: `Element ${ref} not found` };
        }
        const hasText = !!(entry.label?.includes(value || '') || entry.value?.text?.includes(value || ''));
        return {
          passed: hasText,
          message: hasText
            ? `Element ${ref} contains text "${value}"`
            : `Element ${ref} does not contain text "${value}"`,
          actual: entry.label || entry.value?.text,
          expected: value,
        };

      case 'checked':
        if (!entry) {
          return { passed: false, message: `Element ${ref} not found` };
        }
        const isChecked = entry.state?.checked === true;
        return {
          passed: isChecked,
          message: isChecked ? `Element ${ref} is checked` : `Element ${ref} is not checked`,
        };

      case 'unchecked':
        if (!entry) {
          return { passed: false, message: `Element ${ref} not found` };
        }
        const isUnchecked = entry.state?.checked !== true;
        return {
          passed: isUnchecked,
          message: isUnchecked ? `Element ${ref} is unchecked` : `Element ${ref} is checked`,
        };

      default:
        return { passed: false, message: `Unknown assertion: ${assertion}` };
    }
  }

  // ============================================
  // Location
  // ============================================

  /**
   * Set mock location
   */
  async setLocation(latitude: number, longitude: number): Promise<void> {
    await this.deviceManager.setLocation(latitude, longitude);
  }

  // ============================================
  // Visual Testing
  // ============================================

  /**
   * Save a screenshot as baseline
   */
  async saveBaseline(name: string, imageBuffer: Buffer): Promise<string> {
    return this.visualComparator.saveBaseline(name, imageBuffer);
  }

  /**
   * Compare current screenshot with baseline
   */
  async compareWithBaseline(
    name: string,
    currentBuffer: Buffer,
    options?: CompareOptions
  ): Promise<ComparisonResult> {
    return this.visualComparator.compare(name, currentBuffer, options);
  }

  /**
   * Generate diff image between baseline and current
   */
  async generateDiff(
    name: string,
    currentBuffer: Buffer,
    outputPath?: string
  ): Promise<string> {
    return this.visualComparator.generateDiff(name, currentBuffer, outputPath);
  }

  /**
   * List all saved baselines
   */
  listBaselines(): string[] {
    return this.visualComparator.listBaselines();
  }

  /**
   * Delete a baseline
   */
  deleteBaseline(name: string): boolean {
    return this.visualComparator.deleteBaseline(name);
  }

  /**
   * Check if baseline exists
   */
  hasBaseline(name: string): boolean {
    return this.visualComparator.hasBaseline(name);
  }

  // ============================================
  // Utils
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

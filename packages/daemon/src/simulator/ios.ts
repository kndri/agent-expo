/**
 * iOS Simulator Manager
 *
 * Controls iOS Simulator using xcrun simctl and idb (if available)
 */

import { exec, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import type { Device, DeviceState, Bounds, Point } from '@agent-expo/protocol';

const execAsync = promisify(exec);

interface SimctlDevice {
  name: string;
  udid: string;
  state: string;
  isAvailable: boolean;
  deviceTypeIdentifier?: string;
}

interface SimctlRuntime {
  name: string;
  identifier: string;
  version: string;
  isAvailable: boolean;
}

export interface IOSBootOptions {
  /** Run simulator without visible Simulator.app window */
  headless?: boolean;
}

export class IOSSimulatorManager {
  private activeDeviceId: string | null = null;
  private idbAvailable: boolean | null = null;
  private headlessMode: boolean = false;

  /**
   * Check if idb (iOS Development Bridge) is available
   */
  async checkIdbAvailable(): Promise<boolean> {
    if (this.idbAvailable !== null) return this.idbAvailable;

    try {
      await execAsync('which idb');
      this.idbAvailable = true;
    } catch {
      this.idbAvailable = false;
    }
    return this.idbAvailable;
  }

  /**
   * Execute a simctl command
   */
  private async simctl(args: string[]): Promise<string> {
    const { stdout } = await execAsync(`xcrun simctl ${args.join(' ')}`);
    return stdout.trim();
  }

  /**
   * List all available iOS devices
   */
  async listDevices(): Promise<Device[]> {
    const output = await this.simctl(['list', 'devices', '--json']);
    const data = JSON.parse(output);

    const devices: Device[] = [];

    for (const [runtime, deviceList] of Object.entries(data.devices)) {
      // Extract OS version from runtime (e.g., "com.apple.CoreSimulator.SimRuntime.iOS-17-2")
      const versionMatch = runtime.match(/iOS-(\d+)-(\d+)/);
      const osVersion = versionMatch ? `${versionMatch[1]}.${versionMatch[2]}` : 'unknown';

      for (const device of deviceList as SimctlDevice[]) {
        devices.push({
          id: device.udid,
          name: device.name,
          platform: 'ios',
          state: this.mapState(device.state),
          osVersion,
          isAvailable: device.isAvailable,
        });
      }
    }

    return devices;
  }

  /**
   * List available runtimes
   */
  async listRuntimes(): Promise<SimctlRuntime[]> {
    const output = await this.simctl(['list', 'runtimes', '--json']);
    const data = JSON.parse(output);
    return data.runtimes;
  }

  /**
   * Map simctl state to DeviceState
   */
  private mapState(state: string): DeviceState {
    switch (state.toLowerCase()) {
      case 'booted':
        return 'booted';
      case 'shutdown':
        return 'shutdown';
      default:
        return 'unknown';
    }
  }

  /**
   * Boot a simulator
   * @param deviceId Optional device ID. If not specified, will use first available device.
   * @param options Boot options including headless mode.
   */
  async boot(deviceId?: string, options?: IOSBootOptions): Promise<string> {
    const headless = options?.headless || process.env.AGENT_EXPO_HEADLESS === '1';

    // If no device specified, find a suitable one
    if (!deviceId) {
      const devices = await this.listDevices();

      // Prefer already booted device
      const booted = devices.find((d) => d.state === 'booted' && d.isAvailable);
      if (booted) {
        this.activeDeviceId = booted.id;
        this.headlessMode = headless;
        return booted.id;
      }

      // Find an available device
      const available = devices.find((d) => d.isAvailable);
      if (!available) {
        throw new Error('No available iOS simulators found');
      }
      deviceId = available.id;
    }

    // Boot the device
    try {
      await this.simctl(['boot', deviceId]);
    } catch (e) {
      // May already be booted
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('Unable to boot device in current state: Booted')) {
        throw e;
      }
    }

    // Wait for boot to complete
    await this.waitForState(deviceId, 'booted');

    // Only open Simulator.app if not in headless mode
    if (!headless) {
      await execAsync('open -a Simulator');
    }

    this.activeDeviceId = deviceId;
    this.headlessMode = headless;
    return deviceId;
  }

  /**
   * Check if running in headless mode
   */
  isHeadless(): boolean {
    return this.headlessMode;
  }

  /**
   * Wait for device to reach a specific state
   */
  private async waitForState(
    deviceId: string,
    targetState: DeviceState,
    timeout: number = 60000
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const devices = await this.listDevices();
      const device = devices.find((d) => d.id === deviceId);

      if (device?.state === targetState) {
        return;
      }

      await this.sleep(1000);
    }

    throw new Error(`Timeout waiting for device ${deviceId} to reach state ${targetState}`);
  }

  /**
   * Shutdown a simulator
   */
  async shutdown(deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.simctl(['shutdown', id]);

    if (id === this.activeDeviceId) {
      this.activeDeviceId = null;
    }
  }

  /**
   * Install an app on the simulator
   */
  async install(appPath: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.simctl(['install', id, `"${appPath}"`]);
  }

  /**
   * Uninstall an app from the simulator
   */
  async uninstall(bundleId: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.simctl(['uninstall', id, bundleId]);
  }

  /**
   * Launch an app on the simulator
   */
  async launch(bundleId: string, deviceId?: string, args: string[] = []): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    const argsStr = args.length > 0 ? args.map((a) => `"${a}"`).join(' ') : '';
    await this.simctl(['launch', id, bundleId, argsStr]);
  }

  /**
   * Terminate an app on the simulator
   */
  async terminate(bundleId: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    try {
      await this.simctl(['terminate', id, bundleId]);
    } catch {
      // App may not be running
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(outputPath: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.simctl(['io', id, 'screenshot', `"${outputPath}"`]);
  }

  /**
   * Open a URL (deep link) on the simulator
   */
  async openURL(url: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.simctl(['openurl', id, `"${url}"`]);
  }

  /**
   * Set location on the simulator
   */
  async setLocation(latitude: number, longitude: number, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.simctl(['location', id, 'set', `${latitude},${longitude}`]);
  }

  /**
   * Send a push notification
   */
  async sendPushNotification(
    bundleId: string,
    payload: object,
    deviceId?: string
  ): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    // Create temp file for payload
    const tmpFile = `/tmp/push-${Date.now()}.json`;
    const fs = await import('fs');
    fs.writeFileSync(tmpFile, JSON.stringify(payload));

    await this.simctl(['push', id, bundleId, tmpFile]);
    fs.unlinkSync(tmpFile);
  }

  /**
   * Tap at coordinates using idb or AppleScript
   */
  async tap(x: number, y: number, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    if (await this.checkIdbAvailable()) {
      await execAsync(`idb ui tap ${x} ${y} --udid ${id}`);
    } else {
      // Fallback: Use AppleScript (less reliable but works without idb)
      await this.tapViaAppleScript(x, y);
    }
  }

  /**
   * Tap using AppleScript (fallback when idb not available)
   */
  private async tapViaAppleScript(x: number, y: number): Promise<void> {
    const script = `
      tell application "Simulator"
        activate
      end tell
      delay 0.1
      tell application "System Events"
        tell process "Simulator"
          click at {${x}, ${y}}
        end tell
      end tell
    `;

    await execAsync(`osascript -e '${script}'`);
  }

  /**
   * Type text using idb or simctl
   */
  async typeText(text: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    if (await this.checkIdbAvailable()) {
      // Escape special characters
      const escaped = text.replace(/'/g, "'\\''");
      await execAsync(`idb ui text '${escaped}' --udid ${id}`);
    } else {
      // Use simctl to paste (requires the app to support paste)
      // First copy to clipboard
      await execAsync(`printf '%s' '${text}' | pbcopy`);
      // Then use AppleScript to paste
      const script = `
        tell application "Simulator" to activate
        delay 0.1
        tell application "System Events"
          keystroke "v" using command down
        end tell
      `;
      await execAsync(`osascript -e '${script}'`);
    }
  }

  /**
   * Press a key using idb
   */
  async pressKey(key: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    if (await this.checkIdbAvailable()) {
      // Map common key names to idb key codes
      const keyMap: Record<string, string> = {
        enter: 'Return',
        backspace: 'Delete',
        delete: 'ForwardDelete',
        tab: 'Tab',
        escape: 'Escape',
        home: 'Home',
      };

      const idbKey = keyMap[key.toLowerCase()] || key;
      await execAsync(`idb ui key ${idbKey} --udid ${id}`);
    } else {
      // Use AppleScript
      const keyMap: Record<string, string> = {
        enter: 'return',
        backspace: 'delete',
        tab: 'tab',
        escape: 'escape',
      };

      const asKey = keyMap[key.toLowerCase()] || key;
      const script = `
        tell application "Simulator" to activate
        delay 0.1
        tell application "System Events"
          key code ${this.getKeyCode(asKey)}
        end tell
      `;
      await execAsync(`osascript -e '${script}'`);
    }
  }

  /**
   * Get AppleScript key code for a key
   */
  private getKeyCode(key: string): number {
    const codes: Record<string, number> = {
      return: 36,
      delete: 51,
      tab: 48,
      escape: 53,
      space: 49,
    };
    return codes[key.toLowerCase()] || 0;
  }

  /**
   * Swipe gesture using idb
   */
  async swipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 0.5,
    deviceId?: string
  ): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    if (await this.checkIdbAvailable()) {
      await execAsync(
        `idb ui swipe ${startX} ${startY} ${endX} ${endY} --duration ${duration} --udid ${id}`
      );
    } else {
      // Fallback using AppleScript - less smooth
      throw new Error('Swipe requires idb. Install with: brew install idb-companion');
    }
  }

  /**
   * Press home button
   */
  async pressHome(deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    if (await this.checkIdbAvailable()) {
      await execAsync(`idb ui button HOME --udid ${id}`);
    } else {
      // Use simctl
      await this.simctl(['ui', id, 'home']);
    }
  }

  /**
   * Get accessibility tree using idb
   */
  async getAccessibilityTree(deviceId?: string): Promise<any> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    if (!(await this.checkIdbAvailable())) {
      throw new Error('idb not available. Install with: brew install idb-companion');
    }

    try {
      const { stdout } = await execAsync(`idb ui describe-all --udid ${id}`);
      return this.parseIdbAccessibility(stdout);
    } catch (error) {
      // Try alternative idb accessibility command
      try {
        const { stdout } = await execAsync(`idb ui describe-point 0 0 --udid ${id}`);
        // Fallback to simpler approach - describe full screen
        return this.captureAccessibilityViaPoints(id);
      } catch {
        throw new Error(`Failed to get accessibility tree: ${error}`);
      }
    }
  }

  /**
   * Parse idb accessibility output
   */
  private parseIdbAccessibility(output: string): any {
    try {
      // idb ui describe-all outputs JSON
      return JSON.parse(output);
    } catch {
      // If not JSON, parse text format
      return this.parseIdbTextFormat(output);
    }
  }

  /**
   * Parse idb text format accessibility
   */
  private parseIdbTextFormat(output: string): any {
    const lines = output.trim().split('\n');
    const elements: any[] = [];

    for (const line of lines) {
      // Parse format like: AXButton "Label" (x, y, width, height)
      const match = line.match(/^(\w+)\s*"([^"]*)"\s*\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        elements.push({
          type: match[1],
          label: match[2],
          frame: {
            x: parseInt(match[3]),
            y: parseInt(match[4]),
            width: parseInt(match[5]),
            height: parseInt(match[6]),
          },
        });
      }
    }

    return { elements };
  }

  /**
   * Fallback: capture accessibility by sampling points
   */
  private async captureAccessibilityViaPoints(deviceId: string): Promise<any> {
    // This is a fallback that samples key points on screen
    // Not ideal but works when describe-all isn't available
    const elements: any[] = [];
    const screenWidth = 390;
    const screenHeight = 844;
    const step = 50;

    for (let y = 0; y < screenHeight; y += step) {
      for (let x = 0; x < screenWidth; x += step) {
        try {
          const { stdout } = await execAsync(
            `idb ui describe-point ${x} ${y} --udid ${deviceId}`
          );
          if (stdout.trim()) {
            const parsed = this.parseIdbAccessibility(stdout);
            if (parsed && !elements.some(e => e.label === parsed.label)) {
              elements.push(parsed);
            }
          }
        } catch {
          // Point may not have an element
        }
      }
    }

    return { elements };
  }

  /**
   * Get the active device ID
   */
  getActiveDeviceId(): string | null {
    return this.activeDeviceId;
  }

  /**
   * Set the active device ID
   */
  setActiveDeviceId(deviceId: string): void {
    this.activeDeviceId = deviceId;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

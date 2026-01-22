/**
 * Android Emulator Manager
 *
 * Controls Android Emulator using adb and emulator commands
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import type { Device, DeviceState } from '@agent-expo/protocol';

const execAsync = promisify(exec);

/**
 * Android key codes for input events
 */
export const KeyCode = {
  HOME: 3,
  BACK: 4,
  CALL: 5,
  ENDCALL: 6,
  DPAD_UP: 19,
  DPAD_DOWN: 20,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
  VOLUME_UP: 24,
  VOLUME_DOWN: 25,
  POWER: 26,
  CAMERA: 27,
  CLEAR: 28,
  TAB: 61,
  ENTER: 66,
  DEL: 67,
  MENU: 82,
  SEARCH: 84,
  ESCAPE: 111,
} as const;

export interface AndroidBootOptions {
  /** Run emulator without visible window */
  headless?: boolean;
}

export class AndroidEmulatorManager {
  private activeDeviceId: string | null = null;
  private emulatorProcess: ChildProcess | null = null;
  private headlessMode: boolean = false;

  /**
   * Execute an adb command
   */
  private async adb(args: string[], deviceId?: string): Promise<string> {
    const id = deviceId || this.activeDeviceId;
    const deviceArg = id ? `-s ${id}` : '';
    const { stdout } = await execAsync(`adb ${deviceArg} ${args.join(' ')}`);
    return stdout.trim();
  }

  /**
   * List all connected Android devices/emulators
   */
  async listDevices(): Promise<Device[]> {
    const output = await this.adb(['devices', '-l']);
    const lines = output.split('\n').slice(1); // Skip "List of devices attached"

    const devices: Device[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(/\s+/);
      const serial = parts[0];
      const state = parts[1];

      if (!serial || !state) continue;

      // Extract device name from properties
      const nameMatch = line.match(/model:(\S+)/);
      const name = nameMatch ? nameMatch[1].replace(/_/g, ' ') : serial;

      // Get Android version if device is online
      let osVersion = 'unknown';
      if (state === 'device') {
        try {
          osVersion = await this.adb(['shell', 'getprop', 'ro.build.version.release'], serial);
        } catch {
          // Ignore errors
        }
      }

      devices.push({
        id: serial,
        name,
        platform: 'android',
        state: this.mapState(state),
        osVersion,
        isAvailable: state === 'device',
      });
    }

    return devices;
  }

  /**
   * List available AVDs (Android Virtual Devices)
   */
  async listAVDs(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('emulator -list-avds');
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * Map adb state to DeviceState
   */
  private mapState(state: string): DeviceState {
    switch (state.toLowerCase()) {
      case 'device':
        return 'booted';
      case 'offline':
        return 'shutdown';
      default:
        return 'unknown';
    }
  }

  /**
   * Start an Android emulator
   * @param avdName Optional AVD name. If not specified, will use first available AVD.
   * @param options Boot options including headless mode.
   */
  async boot(avdName?: string, options?: AndroidBootOptions): Promise<string> {
    const headless = options?.headless || process.env.AGENT_EXPO_HEADLESS === '1';

    // Check if there's already a booted device
    const devices = await this.listDevices();
    const booted = devices.find((d) => d.state === 'booted');
    if (booted) {
      this.activeDeviceId = booted.id;
      this.headlessMode = headless;
      return booted.id;
    }

    // Get AVD name
    if (!avdName) {
      const avds = await this.listAVDs();
      if (avds.length === 0) {
        throw new Error('No Android AVDs found. Create one with Android Studio or avdmanager.');
      }
      avdName = avds[0];
    }

    // Build emulator arguments
    const emulatorArgs = ['-avd', avdName, '-no-snapshot-load'];

    if (headless) {
      // Headless mode flags
      emulatorArgs.push(
        '-no-window',           // No GUI window
        '-no-audio',            // No audio
        '-no-boot-anim',        // Skip boot animation
        '-gpu', 'swiftshader_indirect', // Software rendering (works without GPU)
      );
    }

    // Start emulator in background
    this.emulatorProcess = spawn('emulator', emulatorArgs, {
      detached: true,
      stdio: 'ignore',
    });

    this.emulatorProcess.unref();

    // Wait for device to appear
    const deviceId = await this.waitForDevice();
    this.activeDeviceId = deviceId;
    this.headlessMode = headless;

    // Wait for boot to complete
    await this.waitForBootComplete(deviceId);

    return deviceId;
  }

  /**
   * Check if running in headless mode
   */
  isHeadless(): boolean {
    return this.headlessMode;
  }

  /**
   * Wait for a device to appear in adb devices
   */
  private async waitForDevice(timeout: number = 60000): Promise<string> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const devices = await this.listDevices();
      const device = devices.find((d) => d.id.startsWith('emulator-'));

      if (device && device.state === 'booted') {
        return device.id;
      }

      await this.sleep(1000);
    }

    throw new Error('Timeout waiting for Android emulator to start');
  }

  /**
   * Wait for boot to complete
   */
  private async waitForBootComplete(deviceId: string, timeout: number = 120000): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        const bootComplete = await this.adb(
          ['shell', 'getprop', 'sys.boot_completed'],
          deviceId
        );

        if (bootComplete.trim() === '1') {
          // Also wait for package manager to be ready
          await this.adb(['shell', 'pm', 'list', 'packages', '-f'], deviceId);
          return;
        }
      } catch {
        // Device not ready yet
      }

      await this.sleep(2000);
    }

    throw new Error('Timeout waiting for Android emulator to boot');
  }

  /**
   * Stop an emulator
   */
  async shutdown(deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) return;

    try {
      await this.adb(['emu', 'kill'], id);
    } catch {
      // May already be stopped
    }

    if (id === this.activeDeviceId) {
      this.activeDeviceId = null;
    }
  }

  /**
   * Install an APK
   */
  async install(apkPath: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(['install', '-r', `"${apkPath}"`], id);
  }

  /**
   * Uninstall an app
   */
  async uninstall(packageName: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(['uninstall', packageName], id);
  }

  /**
   * Start an activity
   */
  async startActivity(activity: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(['shell', 'am', 'start', '-n', activity], id);
  }

  /**
   * Launch an app by package name
   */
  async launch(packageName: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(
      ['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1'],
      id
    );
  }

  /**
   * Force stop an app
   */
  async forceStop(packageName: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(['shell', 'am', 'force-stop', packageName], id);
  }

  /**
   * Clear app data
   */
  async clearData(packageName: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(['shell', 'pm', 'clear', packageName], id);
  }

  /**
   * Take a screenshot
   */
  async screenshot(outputPath: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    const remotePath = '/sdcard/screenshot.png';

    // Capture screenshot on device
    await this.adb(['shell', 'screencap', '-p', remotePath], id);

    // Pull to local
    await this.adb(['pull', remotePath, `"${outputPath}"`], id);

    // Clean up
    await this.adb(['shell', 'rm', remotePath], id);
  }

  /**
   * Open a URL (deep link)
   */
  async openURL(url: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(
      ['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `"${url}"`],
      id
    );
  }

  /**
   * Set mock location
   */
  async setLocation(latitude: number, longitude: number, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    // Use geo fix command for emulator
    await this.adb(['emu', 'geo', 'fix', String(longitude), String(latitude)], id);
  }

  /**
   * Tap at coordinates
   */
  async tap(x: number, y: number, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(['shell', 'input', 'tap', String(x), String(y)], id);
  }

  /**
   * Long press at coordinates
   */
  async longPress(x: number, y: number, duration: number = 1000, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    // Long press is implemented as a swipe with no movement
    await this.adb(
      ['shell', 'input', 'swipe', String(x), String(y), String(x), String(y), String(duration)],
      id
    );
  }

  /**
   * Type text
   */
  async typeText(text: string, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    // Escape special characters for shell
    const escaped = text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/ /g, '%s')
      .replace(/&/g, '\\&')
      .replace(/</g, '\\<')
      .replace(/>/g, '\\>')
      .replace(/\|/g, '\\|')
      .replace(/;/g, '\\;');

    await this.adb(['shell', 'input', 'text', `"${escaped}"`], id);
  }

  /**
   * Press a key
   */
  async pressKey(keycode: number, deviceId?: string): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(['shell', 'input', 'keyevent', String(keycode)], id);
  }

  /**
   * Press back button
   */
  async pressBack(deviceId?: string): Promise<void> {
    await this.pressKey(KeyCode.BACK, deviceId);
  }

  /**
   * Press home button
   */
  async pressHome(deviceId?: string): Promise<void> {
    await this.pressKey(KeyCode.HOME, deviceId);
  }

  /**
   * Press enter key
   */
  async pressEnter(deviceId?: string): Promise<void> {
    await this.pressKey(KeyCode.ENTER, deviceId);
  }

  /**
   * Swipe gesture
   */
  async swipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 300,
    deviceId?: string
  ): Promise<void> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    await this.adb(
      [
        'shell',
        'input',
        'swipe',
        String(startX),
        String(startY),
        String(endX),
        String(endY),
        String(duration),
      ],
      id
    );
  }

  /**
   * Dump UI hierarchy (for accessibility tree)
   */
  async dumpUIHierarchy(deviceId?: string): Promise<string> {
    const id = deviceId || this.activeDeviceId;
    if (!id) throw new Error('No device specified');

    const remotePath = '/sdcard/window_dump.xml';

    await this.adb(['shell', 'uiautomator', 'dump', remotePath], id);
    const xml = await this.adb(['shell', 'cat', remotePath], id);
    await this.adb(['shell', 'rm', remotePath], id);

    return xml;
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

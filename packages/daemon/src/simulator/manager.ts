/**
 * Unified Device Manager
 *
 * Provides a unified interface for controlling iOS and Android devices
 */

import { Errors, type Device, type Platform, type Point, type Bounds } from '@agent-expo/protocol';
import { IOSSimulatorManager } from './ios.js';
import { AndroidEmulatorManager, KeyCode } from './android.js';

export interface DeviceManagerConfig {
  platform?: Platform;
  deviceId?: string;
}

export class DeviceManager {
  private iosManager: IOSSimulatorManager;
  private androidManager: AndroidEmulatorManager;
  private activeDevice: Device | null = null;
  private activePlatform: Platform | null = null;

  constructor() {
    this.iosManager = new IOSSimulatorManager();
    this.androidManager = new AndroidEmulatorManager();
  }

  /**
   * Get the active device
   */
  getActiveDevice(): Device | null {
    return this.activeDevice;
  }

  /**
   * Get the active platform
   */
  getActivePlatform(): Platform | null {
    return this.activePlatform;
  }

  /**
   * List all available devices across platforms
   */
  async listAllDevices(): Promise<Device[]> {
    const [iosDevices, androidDevices] = await Promise.allSettled([
      this.iosManager.listDevices(),
      this.androidManager.listDevices(),
    ]);

    const devices: Device[] = [];

    if (iosDevices.status === 'fulfilled') {
      devices.push(...iosDevices.value);
    }

    if (androidDevices.status === 'fulfilled') {
      devices.push(...androidDevices.value);
    }

    return devices;
  }

  /**
   * List devices for a specific platform
   */
  async listDevices(platform: Platform): Promise<Device[]> {
    if (platform === 'ios') {
      return this.iosManager.listDevices();
    } else {
      return this.androidManager.listDevices();
    }
  }

  /**
   * Boot a device
   */
  async boot(platform: Platform, deviceId?: string): Promise<Device> {
    let id: string;

    if (platform === 'ios') {
      id = await this.iosManager.boot(deviceId);
    } else {
      id = await this.androidManager.boot(deviceId);
    }

    // Get the full device info
    const devices = await this.listDevices(platform);
    const device = devices.find((d) => d.id === id);

    if (!device) {
      throw Errors.DEVICE_NOT_FOUND(id);
    }

    this.activeDevice = device;
    this.activePlatform = platform;

    return device;
  }

  /**
   * Shutdown the active device
   */
  async shutdown(): Promise<void> {
    if (!this.activeDevice || !this.activePlatform) {
      return;
    }

    if (this.activePlatform === 'ios') {
      await this.iosManager.shutdown(this.activeDevice.id);
    } else {
      await this.androidManager.shutdown(this.activeDevice.id);
    }

    this.activeDevice = null;
    this.activePlatform = null;
  }

  /**
   * Install an app
   */
  async install(appPath: string): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.install(appPath, this.activeDevice!.id);
    } else {
      await this.androidManager.install(appPath, this.activeDevice!.id);
    }
  }

  /**
   * Uninstall an app
   */
  async uninstall(bundleId: string): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.uninstall(bundleId, this.activeDevice!.id);
    } else {
      await this.androidManager.uninstall(bundleId, this.activeDevice!.id);
    }
  }

  /**
   * Launch an app
   */
  async launch(bundleId: string): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.launch(bundleId, this.activeDevice!.id);
    } else {
      await this.androidManager.launch(bundleId, this.activeDevice!.id);
    }
  }

  /**
   * Terminate an app
   */
  async terminate(bundleId: string): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.terminate(bundleId, this.activeDevice!.id);
    } else {
      await this.androidManager.forceStop(bundleId, this.activeDevice!.id);
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(outputPath: string): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.screenshot(outputPath, this.activeDevice!.id);
    } else {
      await this.androidManager.screenshot(outputPath, this.activeDevice!.id);
    }
  }

  /**
   * Open a deep link
   */
  async openURL(url: string): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.openURL(url, this.activeDevice!.id);
    } else {
      await this.androidManager.openURL(url, this.activeDevice!.id);
    }
  }

  /**
   * Set mock location
   */
  async setLocation(latitude: number, longitude: number): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.setLocation(latitude, longitude, this.activeDevice!.id);
    } else {
      await this.androidManager.setLocation(latitude, longitude, this.activeDevice!.id);
    }
  }

  /**
   * Tap at coordinates
   */
  async tap(x: number, y: number): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.tap(x, y, this.activeDevice!.id);
    } else {
      await this.androidManager.tap(x, y, this.activeDevice!.id);
    }
  }

  /**
   * Long press at coordinates
   */
  async longPress(x: number, y: number, duration: number = 1000): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      // iOS uses tap with duration option via idb
      // For now, fall back to swipe in place
      await this.iosManager.swipe(x, y, x, y, duration / 1000, this.activeDevice!.id);
    } else {
      await this.androidManager.longPress(x, y, duration, this.activeDevice!.id);
    }
  }

  /**
   * Type text
   */
  async typeText(text: string): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.typeText(text, this.activeDevice!.id);
    } else {
      await this.androidManager.typeText(text, this.activeDevice!.id);
    }
  }

  /**
   * Press a key
   */
  async pressKey(key: string): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.pressKey(key, this.activeDevice!.id);
    } else {
      // Map key name to Android keycode
      const keyMap: Record<string, number> = {
        enter: KeyCode.ENTER,
        backspace: KeyCode.DEL,
        delete: KeyCode.DEL,
        tab: KeyCode.TAB,
        escape: KeyCode.ESCAPE,
        home: KeyCode.HOME,
        back: KeyCode.BACK,
      };

      const keycode = keyMap[key.toLowerCase()];
      if (keycode) {
        await this.androidManager.pressKey(keycode, this.activeDevice!.id);
      } else {
        throw Errors.UNKNOWN_KEY(key);
      }
    }
  }

  /**
   * Press back button
   */
  async pressBack(): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      // iOS doesn't have a back button, this is a no-op or could trigger swipe back
      // For now, we'll throw an informative error
      throw Errors.IOS_BACK_BUTTON();
    } else {
      await this.androidManager.pressBack(this.activeDevice!.id);
    }
  }

  /**
   * Press home button
   */
  async pressHome(): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.pressHome(this.activeDevice!.id);
    } else {
      await this.androidManager.pressHome(this.activeDevice!.id);
    }
  }

  /**
   * Swipe gesture
   */
  async swipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 300
  ): Promise<void> {
    this.ensureActiveDevice();

    if (this.activePlatform === 'ios') {
      await this.iosManager.swipe(
        startX,
        startY,
        endX,
        endY,
        duration / 1000,
        this.activeDevice!.id
      );
    } else {
      await this.androidManager.swipe(startX, startY, endX, endY, duration, this.activeDevice!.id);
    }
  }

  /**
   * Scroll in a direction
   */
  async scroll(direction: 'up' | 'down' | 'left' | 'right', distance: number = 300): Promise<void> {
    this.ensureActiveDevice();

    // Get a rough center point to scroll from
    // In a real implementation, you'd want to get the actual viewport size
    const centerX = 200;
    const centerY = 400;

    let startX = centerX;
    let startY = centerY;
    let endX = centerX;
    let endY = centerY;

    switch (direction) {
      case 'up':
        startY = centerY + distance / 2;
        endY = centerY - distance / 2;
        break;
      case 'down':
        startY = centerY - distance / 2;
        endY = centerY + distance / 2;
        break;
      case 'left':
        startX = centerX + distance / 2;
        endX = centerX - distance / 2;
        break;
      case 'right':
        startX = centerX - distance / 2;
        endX = centerX + distance / 2;
        break;
    }

    await this.swipe(startX, startY, endX, endY, 300);
  }

  /**
   * Ensure there's an active device
   */
  private ensureActiveDevice(): void {
    if (!this.activeDevice || !this.activePlatform) {
      throw Errors.NO_ACTIVE_DEVICE();
    }
  }

  /**
   * Get the iOS simulator manager (for native accessibility)
   */
  getIOSManager(): IOSSimulatorManager | null {
    return this.activePlatform === 'ios' ? this.iosManager : null;
  }

  /**
   * Get the Android emulator manager (for native accessibility)
   */
  getAndroidManager(): AndroidEmulatorManager | null {
    return this.activePlatform === 'android' ? this.androidManager : null;
  }
}

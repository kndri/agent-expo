/**
 * Agent Expo Error System
 *
 * Provides enhanced error messages with troubleshooting hints.
 */

/**
 * Custom error class for Agent Expo with code, message, hint, and optional docs link.
 */
export class AgentExpoError extends Error {
  code: string;
  hint: string;
  docs?: string;

  constructor(options: { code: string; message: string; hint: string; docs?: string }) {
    super(options.message);
    this.name = 'AgentExpoError';
    this.code = options.code;
    this.hint = options.hint;
    this.docs = options.docs;
    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AgentExpoError);
    }
  }

  /**
   * Format the error for display
   */
  format(): string {
    let output = `[${this.code}] ${this.message}\n\nHint: ${this.hint}`;
    if (this.docs) {
      output += `\n\nDocs: ${this.docs}`;
    }
    return output;
  }

  override toString(): string {
    return this.format();
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON(): { code: string; message: string; hint: string; docs?: string } {
    return {
      code: this.code,
      message: this.message,
      hint: this.hint,
      docs: this.docs,
    };
  }
}

/**
 * Type guard to check if an error is an AgentExpoError
 */
export function isAgentExpoError(error: unknown): error is AgentExpoError {
  return error instanceof AgentExpoError;
}

/**
 * Common error factories with troubleshooting hints.
 */
export const Errors = {
  // ============================================
  // Connection Errors
  // ============================================

  BRIDGE_NOT_CONNECTED: () =>
    new AgentExpoError({
      code: 'BRIDGE_NOT_CONNECTED',
      message: 'No React Native app is connected to the bridge',
      hint: `Make sure your app:
  1. Has AgentBridgeProvider at the root
  2. Is running in development mode
  3. Can reach this machine on the network

Try: Check the app console for connection errors`,
      docs: 'https://github.com/kndri/agent-expo#bridge-setup',
    }),

  DAEMON_NOT_RUNNING: () =>
    new AgentExpoError({
      code: 'DAEMON_NOT_RUNNING',
      message: 'Cannot connect to agent-expo daemon',
      hint: `The daemon may not be running. Try:
  1. Start it manually: agent-expo daemon start
  2. Check if another process is using the socket
  3. Check logs: ~/.agent-expo/daemon.log`,
    }),

  SDK_NOT_CONNECTED: () =>
    new AgentExpoError({
      code: 'SDK_NOT_CONNECTED',
      message: 'SDK client is not connected to the daemon',
      hint: `Make sure to connect first:
  await client.connect();

If already connected, the daemon may have stopped.`,
    }),

  CONNECTION_TIMEOUT: (target: string, timeoutMs: number) =>
    new AgentExpoError({
      code: 'CONNECTION_TIMEOUT',
      message: `Connection to ${target} timed out after ${timeoutMs}ms`,
      hint: `The ${target} may be slow to respond or unavailable. Try:
  1. Check if ${target} is running
  2. Increase timeout in options
  3. Check network connectivity`,
    }),

  // ============================================
  // Device Errors
  // ============================================

  DEVICE_NOT_FOUND: (deviceId: string) =>
    new AgentExpoError({
      code: 'DEVICE_NOT_FOUND',
      message: `Device "${deviceId}" not found`,
      hint: `Available devices can be listed with:
  agent-expo devices list

For iOS: Make sure Simulator is running
For Android: Make sure emulator is running or device is connected via adb`,
    }),

  NO_DEVICE_SPECIFIED: () =>
    new AgentExpoError({
      code: 'NO_DEVICE_SPECIFIED',
      message: 'No device specified',
      hint: `You must boot a device first or specify a device ID:
  agent-expo launch --platform ios
  agent-expo launch --platform ios --device "iPhone 15"

List available devices: agent-expo devices list`,
    }),

  NO_ACTIVE_DEVICE: () =>
    new AgentExpoError({
      code: 'NO_ACTIVE_DEVICE',
      message: 'No active device. Boot a device first.',
      hint: `Launch a device with:
  agent-expo launch --platform ios
  agent-expo launch --platform android

Or via SDK:
  await client.launch({ platform: 'ios' })`,
    }),

  NO_IOS_SIMULATORS: () =>
    new AgentExpoError({
      code: 'NO_IOS_SIMULATORS',
      message: 'No available iOS simulators found',
      hint: `Create a simulator using Xcode:
  1. Open Xcode > Preferences > Components
  2. Download a simulator runtime
  3. Create a device in Window > Devices and Simulators

Or via command line:
  xcrun simctl create "iPhone 15" "com.apple.CoreSimulator.SimDeviceType.iPhone-15"`,
    }),

  NO_ANDROID_EMULATORS: () =>
    new AgentExpoError({
      code: 'NO_ANDROID_EMULATORS',
      message: 'No Android AVDs found',
      hint: `Create an emulator using Android Studio:
  1. Open Android Studio > AVD Manager
  2. Create Virtual Device

Or via command line:
  avdmanager create avd -n "Pixel_7" -k "system-images;android-34;google_apis;x86_64"`,
    }),

  DEVICE_BOOT_TIMEOUT: (platform: string) =>
    new AgentExpoError({
      code: 'DEVICE_BOOT_TIMEOUT',
      message: `Timeout waiting for ${platform} device to boot`,
      hint: `The device is taking longer than expected to start. Try:
  1. Check system resources (CPU/memory)
  2. Manually start the device first
  3. For Android: Use a lighter system image`,
    }),

  IOS_BACK_BUTTON: () =>
    new AgentExpoError({
      code: 'IOS_BACK_BUTTON',
      message: 'iOS does not have a hardware back button',
      hint: `Use in-app navigation instead:
  1. Tap the back button in your navigation bar
  2. Use swipe gestures if supported
  3. Navigate programmatically via deep links`,
    }),

  // ============================================
  // Element Errors
  // ============================================

  ELEMENT_NOT_FOUND: (ref: string) =>
    new AgentExpoError({
      code: 'ELEMENT_NOT_FOUND',
      message: `Element with ref "${ref}" not found in the accessibility tree`,
      hint: `Try:
  1. Run 'agent-expo snapshot' to see available elements
  2. Check if the element has testID or accessibilityLabel
  3. Wait for the element to appear: await client.waitFor({ ref: '${ref}' })`,
    }),

  ELEMENT_NOT_FOUND_BY_TESTID: (testID: string) =>
    new AgentExpoError({
      code: 'ELEMENT_NOT_FOUND',
      message: `Element with testID "${testID}" not found`,
      hint: `Make sure the element has testID="${testID}" in your React Native code:
  <View testID="${testID}" />
  <Text testID="${testID}">...</Text>

Run 'agent-expo snapshot' to see all available elements.`,
    }),

  // ============================================
  // Native Tool Errors
  // ============================================

  NATIVE_TOOL_UNAVAILABLE: (tool: string) =>
    new AgentExpoError({
      code: 'NATIVE_TOOL_UNAVAILABLE',
      message: `Native mode requires ${tool} but it's not installed`,
      hint:
        tool === 'idb'
          ? `Install idb-companion:
  brew tap facebook/fb
  brew install idb-companion`
          : `Install Android SDK and ensure adb is in PATH:
  export PATH=$PATH:$ANDROID_HOME/platform-tools`,
    }),

  IDB_REQUIRED: (operation: string) =>
    new AgentExpoError({
      code: 'IDB_REQUIRED',
      message: `Operation "${operation}" requires idb on iOS`,
      hint: `Install idb-companion for advanced iOS operations:
  brew tap facebook/fb
  brew install idb-companion

This is required for: swipe gestures, accessibility tree, and more.`,
    }),

  // ============================================
  // Visual Testing Errors
  // ============================================

  BASELINE_NOT_FOUND: (name: string) =>
    new AgentExpoError({
      code: 'BASELINE_NOT_FOUND',
      message: `Baseline "${name}" not found`,
      hint: `Save a baseline first:
  agent-expo screenshot save "${name}"

Or via SDK:
  const screenshot = await client.screenshot();
  await client.saveBaseline('${name}', screenshot);

List existing baselines:
  agent-expo screenshot list`,
    }),

  // ============================================
  // Operation Errors
  // ============================================

  BRIDGE_REQUIRED: (operation: string) =>
    new AgentExpoError({
      code: 'BRIDGE_REQUIRED',
      message: `Operation "${operation}" requires bridge connection`,
      hint: `This operation needs a connected React Native app with AgentBridgeProvider.

Make sure your app is running and connected. Check:
  agent-expo status`,
    }),

  INVALID_COMMAND: (message: string) =>
    new AgentExpoError({
      code: 'INVALID_COMMAND',
      message,
      hint: `Check the command syntax with:
  agent-expo --help
  agent-expo <command> --help`,
    }),

  UNKNOWN_KEY: (key: string) =>
    new AgentExpoError({
      code: 'UNKNOWN_KEY',
      message: `Unknown key: ${key}`,
      hint: `Supported keys include: enter, tab, backspace, delete, escape, etc.

For special characters, use the type command instead:
  agent-expo type "text"`,
    }),

  // ============================================
  // Tool Errors
  // ============================================

  UNKNOWN_TOOL: (name: string) =>
    new AgentExpoError({
      code: 'UNKNOWN_TOOL',
      message: `Unknown tool: ${name}`,
      hint: `Available tools can be found in the AI tools documentation.

Check the SDK reference for available tool names.`,
    }),

  DAEMON_START_FAILED: () =>
    new AgentExpoError({
      code: 'DAEMON_START_FAILED',
      message: 'Failed to start daemon',
      hint: `The daemon process could not be started. Try:
  1. Check if another daemon is already running
  2. Check the socket path permissions
  3. Run manually: agent-expo daemon start --verbose`,
    }),

  DAEMON_SCRIPT_NOT_FOUND: () =>
    new AgentExpoError({
      code: 'DAEMON_SCRIPT_NOT_FOUND',
      message: 'Could not find daemon script',
      hint: `Make sure @agent-expo/daemon is installed:
  npm install @agent-expo/daemon

Or install the CLI globally:
  npm install -g agent-expo`,
    }),

  // ============================================
  // Provider Errors (Bridge)
  // ============================================

  PROVIDER_NOT_FOUND: () =>
    new AgentExpoError({
      code: 'PROVIDER_NOT_FOUND',
      message: 'useAgentBridge must be used within AgentBridgeProvider',
      hint: `Wrap your app with AgentBridgeProvider:

import { AgentBridgeProvider } from '@agent-expo/bridge';

function App() {
  return (
    <AgentBridgeProvider>
      <YourApp />
    </AgentBridgeProvider>
  );
}`,
      docs: 'https://github.com/kndri/agent-expo#bridge-setup',
    }),
} as const;

/**
 * @agent-expo/mock-bridge
 *
 * Mock bridge for testing agent-expo without a real React Native app.
 *
 * @example
 * ```typescript
 * import { MockBridge, loginScreen } from '@agent-expo/mock-bridge';
 * import { AgentExpoClient } from '@agent-expo/sdk';
 *
 * // Create mock bridge with login screen scenario
 * const mockBridge = new MockBridge(loginScreen);
 * await mockBridge.connect();
 *
 * // Now you can use the SDK client to interact
 * const client = new AgentExpoClient();
 * await client.connect();
 *
 * await client.tap('@email-input');
 * await client.fill('@email-input', 'test@example.com');
 *
 * mockBridge.disconnect();
 * ```
 */

// Main MockBridge class
export { MockBridge, type MockBridgeOptions } from './mock-bridge.js';

// Type definitions
export {
  type MockAppState,
  type MockElement,
  type MockNetworkRequest,
  type Bounds,
  createMockElement,
} from './mock-app-state.js';

// Pre-built scenarios
export { loginScreen, homeScreen, settingsScreen, emptyScreen } from './scenarios/index.js';

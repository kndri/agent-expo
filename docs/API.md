# API Reference

Complete API documentation for agent-expo packages.

## Table of Contents

- [SDK (@agent-expo/sdk)](#sdk-agent-exposdk)
  - [AgentExpoClient](#agentexpoclient)
  - [AI Tools](#ai-tools)
  - [Daemon Management](#daemon-management)
- [Protocol (@agent-expo/protocol)](#protocol-agent-expoprotocol)
  - [Types](#types)
  - [Errors](#errors)
  - [Utilities](#utilities)
- [Bridge (@agent-expo/bridge)](#bridge-agent-expobridge)
  - [AgentBridgeProvider](#agentbridgeprovider)

---

## SDK (@agent-expo/sdk)

### AgentExpoClient

The main client for controlling React Native apps.

#### Constructor

```typescript
new AgentExpoClient(config?: ClientConfig)
```

**ClientConfig:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `session` | `string` | `'default'` | Session name for isolated instances |
| `port` | `number` | `undefined` | TCP port (for Windows or remote) |
| `retry` | `Partial<BackoffConfig>` | `undefined` | Connection retry options |

**Example:**
```typescript
const client = new AgentExpoClient({
  session: 'test-session',
  retry: {
    maxAttempts: 5,
    initialDelay: 100,
  },
});
```

#### Connection Methods

##### connect(options?)

Connect to the daemon.

```typescript
await client.connect(options?: ConnectOptions): Promise<void>
```

**ConnectOptions:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `autoStart` | `boolean` | `false` | Auto-start daemon if not running |
| `startTimeout` | `number` | `10000` | Timeout for daemon start (ms) |
| `daemonPath` | `string` | `undefined` | Custom daemon executable path |

**Example:**
```typescript
// Simple connect
await client.connect();

// With auto-start
await client.connect({ autoStart: true });

// With custom timeout
await client.connect({ autoStart: true, startTimeout: 30000 });
```

##### connectWithRetry(options?)

Connect with exponential backoff retry.

```typescript
await client.connectWithRetry(options?: Partial<BackoffConfig>): Promise<void>
```

**BackoffConfig:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `initialDelay` | `number` | `100` | Initial delay (ms) |
| `maxDelay` | `number` | `5000` | Maximum delay (ms) |
| `multiplier` | `number` | `2` | Delay multiplier |
| `maxAttempts` | `number` | `10` | Maximum retry attempts |
| `jitter` | `boolean` | `true` | Add random jitter |

##### disconnect()

Disconnect from daemon.

```typescript
client.disconnect(): void
```

#### Lifecycle Methods

##### launch(options)

Launch device and optionally an app.

```typescript
await client.launch(options: LaunchOptions): Promise<Device>
```

**LaunchOptions:**

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `platform` | `'ios' \| 'android'` | Yes | Target platform |
| `device` | `string` | No | Device name/ID |
| `bundleId` | `string` | No | App bundle identifier |
| `app` | `string` | No | Path to app binary |
| `clearState` | `boolean` | No | Clear app data before launch |

**Returns:** `Device` object with device info.

##### terminate()

Terminate the running app.

```typescript
await client.terminate(): Promise<void>
```

##### reload()

Reload the app (terminate and relaunch).

```typescript
await client.reload(): Promise<void>
```

#### Snapshot Methods

##### snapshot(options?)

Get accessibility snapshot.

```typescript
await client.snapshot(options?: SnapshotOptions): Promise<EnhancedSnapshot>
```

**SnapshotOptions:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `interactive` | `boolean` | `false` | Only interactive elements |
| `compact` | `boolean` | `false` | Compact tree format |
| `withScreenshot` | `boolean` | `false` | Include base64 screenshot |

**Returns:**
```typescript
interface EnhancedSnapshot {
  tree: string;              // Text tree representation
  elements: AccessibilityNode[];  // Structured elements
  screenshot?: string;       // Base64 screenshot if requested
}
```

#### Interaction Methods

##### tap(ref, options?)

Tap an element.

```typescript
await client.tap(ref: string, options?: TapOptions): Promise<void>
```

**TapOptions:**

| Property | Type | Description |
|----------|------|-------------|
| `count` | `number` | Number of taps |
| `duration` | `number` | Tap duration (ms) |

##### tapAt(x, y)

Tap at coordinates.

```typescript
await client.tapAt(x: number, y: number): Promise<void>
```

##### doubleTap(ref)

Double tap an element.

```typescript
await client.doubleTap(ref: string): Promise<void>
```

##### longPress(ref, duration?)

Long press an element.

```typescript
await client.longPress(ref: string, duration?: number): Promise<void>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ref` | `string` | - | Element reference |
| `duration` | `number` | `1000` | Press duration (ms) |

##### fill(ref, text, clear?)

Fill text into input.

```typescript
await client.fill(ref: string, text: string, clear?: boolean): Promise<void>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `ref` | `string` | - | Input element reference |
| `text` | `string` | - | Text to enter |
| `clear` | `boolean` | `false` | Clear existing text first |

##### clear(ref)

Clear text from input.

```typescript
await client.clear(ref: string): Promise<void>
```

##### type(text, delay?)

Type text without focusing element.

```typescript
await client.type(text: string, delay?: number): Promise<void>
```

##### scroll(direction, options?)

Scroll the screen.

```typescript
await client.scroll(
  direction: 'up' | 'down' | 'left' | 'right',
  options?: ScrollOptions
): Promise<void>
```

**ScrollOptions:**

| Property | Type | Description |
|----------|------|-------------|
| `distance` | `number` | Scroll distance in pixels |
| `toRef` | `string` | Scroll until element visible |
| `withinRef` | `string` | Scroll within specific container |

##### swipe(from, to, duration?)

Perform swipe gesture.

```typescript
await client.swipe(
  from: { x: number; y: number },
  to: { x: number; y: number },
  duration?: number
): Promise<void>
```

#### Navigation Methods

##### navigate(url)

Open deep link.

```typescript
await client.navigate(url: string): Promise<void>
```

##### back()

Press back button (Android only).

```typescript
await client.back(): Promise<void>
```

##### home()

Press home button.

```typescript
await client.home(): Promise<void>
```

#### Screenshot Methods

##### screenshot(path?)

Take screenshot.

```typescript
await client.screenshot(path?: string): Promise<string>
```

Returns base64-encoded image or file path if `path` provided.

#### Assertion Methods

##### assert(ref, assertion, value?)

Assert element state.

```typescript
await client.assert(
  ref: string,
  assertion: AssertionType,
  value?: string
): Promise<AssertionResult>
```

**AssertionType:** `'visible' | 'hidden' | 'enabled' | 'disabled' | 'exists' | 'hasText'`

**Returns:**
```typescript
interface AssertionResult {
  passed: boolean;
  message: string;
}
```

##### waitFor(ref, condition, timeout?)

Wait for element condition.

```typescript
await client.waitFor(
  ref: string,
  condition: 'visible' | 'hidden' | 'exists' | 'notExists',
  timeout?: number
): Promise<boolean>
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timeout` | `number` | `5000` | Timeout in milliseconds |

#### Network Methods

##### getRequests(filter?)

Get tracked network requests.

```typescript
await client.getRequests(filter?: RequestFilter): Promise<TrackedRequest[]>
```

**RequestFilter:**

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | URL pattern filter |
| `method` | `string` | HTTP method filter |
| `status` | `number` | Status code filter |

**TrackedRequest:**
```typescript
interface TrackedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  response: {
    status: number;
    headers: Record<string, string>;
    body?: unknown;
  };
  timestamp: number;
  duration: number;
}
```

##### getSupabaseCalls(filter?)

Get Supabase API calls.

```typescript
await client.getSupabaseCalls(filter?: {
  table?: string;
  operation?: string;
}): Promise<SupabaseCall[]>
```

##### getConvexCalls(filter?)

Get Convex API calls.

```typescript
await client.getConvexCalls(filter?: {
  functionName?: string;
  type?: 'query' | 'mutation' | 'action';
}): Promise<ConvexCall[]>
```

##### mockResponse(pattern, response)

Mock network response.

```typescript
await client.mockResponse(
  pattern: string,
  response: MockResponse
): Promise<void>
```

**MockResponse:**

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `status` | `number` | `200` | HTTP status code |
| `body` | `string \| object` | - | Response body |
| `headers` | `Record<string, string>` | - | Response headers |
| `delay` | `number` | `0` | Response delay (ms) |

##### clearMocks()

Clear all network mocks.

```typescript
await client.clearMocks(): Promise<void>
```

#### Device Methods

##### listDevices(platform?)

List available devices.

```typescript
await client.listDevices(platform?: 'ios' | 'android'): Promise<Device[]>
```

##### getDevice()

Get current device info.

```typescript
await client.getDevice(): Promise<Device | null>
```

##### setLocation(latitude, longitude)

Set mock GPS location.

```typescript
await client.setLocation(latitude: number, longitude: number): Promise<void>
```

#### Status Methods

##### status()

Get client status.

```typescript
await client.status(): Promise<ClientStatus>
```

**ClientStatus:**
```typescript
interface ClientStatus {
  connected: boolean;
  daemonRunning: boolean;
  device: Device | null;
  bridgeConnected: boolean;
}
```

##### ping()

Ping daemon.

```typescript
await client.ping(): Promise<boolean>
```

#### Static Methods

##### AgentExpoClient.isDaemonRunning(session?, port?)

Check if daemon is running without connecting.

```typescript
await AgentExpoClient.isDaemonRunning(
  session?: string,
  port?: number
): Promise<boolean>
```

##### AgentExpoClient.startDaemon(options?)

Start daemon manually.

```typescript
await AgentExpoClient.startDaemon(options?: DaemonStartOptions): Promise<void>
```

##### AgentExpoClient.stopDaemon(session?, port?)

Stop daemon.

```typescript
await AgentExpoClient.stopDaemon(
  session?: string,
  port?: number
): Promise<void>
```

---

### AI Tools

Functions for AI agent integration.

#### getClaudeTools()

Get tools in Claude/Anthropic format.

```typescript
import { getClaudeTools } from '@agent-expo/sdk';

const tools = getClaudeTools();
// Returns array of { name, description, input_schema }
```

#### getOpenAITools()

Get tools in OpenAI function calling format.

```typescript
import { getOpenAITools } from '@agent-expo/sdk';

const tools = getOpenAITools();
// Returns array of { type: 'function', function: { name, description, parameters } }
```

#### executeTools(client, toolCalls)

Execute tool calls from AI response.

```typescript
import { executeTools, ToolCall, ToolResult } from '@agent-expo/sdk';

const results = await executeTools(client, toolCalls);
```

**ToolCall:**
```typescript
interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}
```

**ToolResult:**
```typescript
interface ToolResult {
  name: string;
  result?: unknown;
  error?: string;
}
```

---

### Daemon Management

Standalone functions for daemon control.

```typescript
import { startDaemon, stopDaemon, isDaemonRunning } from '@agent-expo/sdk';

// Check status
const running = await isDaemonRunning('default');

// Start
await startDaemon({
  timeout: 10000,
  session: 'default',
});

// Stop
await stopDaemon('default');
```

---

## Protocol (@agent-expo/protocol)

### Types

Core TypeScript types.

```typescript
import type {
  Platform,
  Device,
  Command,
  Response,
  EnhancedSnapshot,
  AccessibilityNode,
  TrackedRequest,
  SupabaseCall,
  ConvexCall,
  ScrollDirection,
  AssertionResult,
} from '@agent-expo/protocol';
```

#### Platform

```typescript
type Platform = 'ios' | 'android';
```

#### Device

```typescript
interface Device {
  id: string;
  name: string;
  platform: Platform;
  state: 'booted' | 'shutdown' | 'unknown';
  osVersion?: string;
}
```

#### AccessibilityNode

```typescript
interface AccessibilityNode {
  ref: string;           // e.g., "@e1"
  role: string;          // e.g., "button", "text"
  name?: string;         // Accessible name
  value?: string;        // Current value
  testID?: string;       // React Native testID
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children?: AccessibilityNode[];
}
```

### Errors

Custom error classes with troubleshooting hints.

```typescript
import { AgentExpoError, Errors, isAgentExpoError } from '@agent-expo/protocol';

// Check if error is AgentExpoError
if (isAgentExpoError(error)) {
  console.log(error.code);    // e.g., "BRIDGE_NOT_CONNECTED"
  console.log(error.message); // Error message
  console.log(error.hint);    // Troubleshooting hint
  console.log(error.docs);    // Documentation URL
}

// Create specific errors
throw Errors.ELEMENT_NOT_FOUND('@e5');
throw Errors.DEVICE_NOT_FOUND('iPhone 15');
throw Errors.BRIDGE_NOT_CONNECTED();
```

**Available Error Factories:**

| Error | Description |
|-------|-------------|
| `BRIDGE_NOT_CONNECTED()` | No app connected |
| `DAEMON_NOT_RUNNING()` | Daemon not running |
| `SDK_NOT_CONNECTED()` | SDK not connected |
| `CONNECTION_TIMEOUT(target, timeout)` | Connection timeout |
| `DEVICE_NOT_FOUND(deviceId)` | Device not found |
| `NO_DEVICE_SPECIFIED()` | No device specified |
| `NO_ACTIVE_DEVICE()` | No active device |
| `NO_IOS_SIMULATORS()` | No iOS simulators |
| `NO_ANDROID_EMULATORS()` | No Android emulators |
| `ELEMENT_NOT_FOUND(ref)` | Element not found |
| `BASELINE_NOT_FOUND(name)` | Screenshot baseline not found |
| `NATIVE_TOOL_UNAVAILABLE(tool)` | Native tool not installed |
| `UNKNOWN_TOOL(name)` | Unknown AI tool |

### Utilities

#### Logger

Configurable logging utility.

```typescript
import { logger, LogLevel, parseLogLevel } from '@agent-expo/protocol';

// Set log level
logger.setLevel(LogLevel.DEBUG);

// Use logger
logger.error('Error message');
logger.warn('Warning');
logger.info('Info');
logger.debug('Debug info');
logger.trace('Trace details');

// Create child logger with prefix
const log = logger.child('my-module');
log.info('Message');  // Outputs: [agent-expo:my-module] Message
```

**LogLevel:**
```typescript
enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
}
```

#### ExponentialBackoff

Retry utility with exponential backoff.

```typescript
import { ExponentialBackoff, delay } from '@agent-expo/protocol';

const backoff = new ExponentialBackoff({
  initialDelay: 100,
  maxDelay: 5000,
  multiplier: 2,
  maxAttempts: 10,
  jitter: true,
});

while (backoff.shouldRetry()) {
  try {
    await doSomething();
    break;
  } catch (error) {
    const delayMs = backoff.nextDelay();
    await delay(delayMs);
  }
}
```

---

## Bridge (@agent-expo/bridge)

### AgentBridgeProvider

React component for connecting your app to agent-expo.

```tsx
import { AgentBridgeProvider } from '@agent-expo/bridge';

export default function App() {
  return (
    <AgentBridgeProvider
      enabled={__DEV__}  // Only in development
      daemonUrl="ws://localhost:9877"  // Optional custom URL
      onConnect={() => console.log('Connected')}
      onDisconnect={() => console.log('Disconnected')}
      onError={(error) => console.error(error)}
    >
      <YourApp />
    </AgentBridgeProvider>
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable/disable bridge |
| `daemonUrl` | `string` | Auto-detect | Custom daemon WebSocket URL |
| `onConnect` | `() => void` | - | Called on connection |
| `onDisconnect` | `() => void` | - | Called on disconnect |
| `onError` | `(error: Error) => void` | - | Called on error |
| `reconnect` | `ReconnectConfig` | Default backoff | Reconnection settings |

**ReconnectConfig:**
```typescript
interface ReconnectConfig {
  enabled: boolean;
  initialDelay: number;
  maxDelay: number;
  maxAttempts: number;
}
```

### useAgentBridge Hook

Access bridge state from components.

```tsx
import { useAgentBridge } from '@agent-expo/bridge';

function MyComponent() {
  const { connected, send } = useAgentBridge();

  if (!connected) {
    return <Text>Not connected to agent-expo</Text>;
  }

  return <YourComponent />;
}
```

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `connected` | `boolean` | Connection status |
| `send` | `(data: unknown) => void` | Send data to daemon |

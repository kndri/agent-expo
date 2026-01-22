# agent-expo

AI-powered automation for React Native and Expo applications.

**agent-expo** enables AI agents to autonomously control, test, and verify React Native applications. Think of it as [agent-browser](https://github.com/anthropics/agent-browser) but for mobile apps.

## Table of Contents

- [Vision](#vision)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Architecture](#architecture)
- [CLI Reference](#cli-reference)
- [SDK Usage](#sdk-usage)
- [AI Agent Integration](#ai-agent-integration)
- [Visual Testing](#visual-testing)
- [Network Mocking](#network-mocking)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [API Reference](#api-reference)

## Vision

Enable AI agents to be first-class mobile app testers. Given a PRD or feature specification, an AI agent should be able to:

1. **Launch** the app on a simulator/emulator
2. **Navigate** through the UI using accessibility-based targeting
3. **Verify** that features work as expected
4. **Report** results with screenshots and API call verification

This is like Cypress/Playwright for mobile - but designed for AI agents rather than human-written test scripts.

## Quick Start

### 1. Install the CLI

```bash
npm install -g @agent-expo/cli
# or with pnpm
pnpm add -g @agent-expo/cli
```

### 2. Add bridge to your app

```bash
npm install @agent-expo/bridge
```

```tsx
// App.tsx
import { AgentBridgeProvider } from '@agent-expo/bridge';

export default function App() {
  return (
    <AgentBridgeProvider>
      {/* Your app */}
    </AgentBridgeProvider>
  );
}
```

### 3. Start the daemon and launch

```bash
# Start the daemon
agent-expo daemon start

# Launch iOS simulator with your app
agent-expo launch --platform ios --bundle-id com.example.myapp

# Get accessibility snapshot
agent-expo snapshot -i

# Interact with elements
agent-expo tap @e1
agent-expo fill @e2 "hello@example.com"
```

### 4. First automation script

```typescript
import { AgentExpoClient } from '@agent-expo/sdk';

const client = new AgentExpoClient();
await client.connect({ autoStart: true }); // Auto-starts daemon if needed

// Launch app
await client.launch({ platform: 'ios', bundleId: 'com.example.app' });

// Get snapshot and interact
const snapshot = await client.snapshot({ interactive: true });
console.log(snapshot.tree);
// - button "Login" [ref=@e1]
// - textbox "Email" [ref=@e2]

await client.fill('@e2', 'test@example.com');
await client.tap('@e1');
```

## Installation

### Prerequisites

- **Node.js 18+**
- **For iOS (macOS only):** Xcode, iOS Simulator, optionally [idb](https://fbidb.io/) for advanced features
- **For Android:** Android Studio, Android Emulator, adb

### Windows Installation

Windows is supported for Android development only (iOS development requires macOS).

**Prerequisites:**

1. **Node.js 18+**: Download from https://nodejs.org

2. **Android SDK** (for Android development):
   - Download [Android Studio](https://developer.android.com/studio) or command-line tools
   - Set `ANDROID_HOME` environment variable:
     ```powershell
     setx ANDROID_HOME "%LOCALAPPDATA%\Android\Sdk"
     ```
   - Add platform-tools to PATH:
     ```powershell
     setx PATH "%PATH%;%ANDROID_HOME%\platform-tools"
     ```

**Install:**

```powershell
npm install -g @agent-expo/cli
```

**Verify Installation:**

```powershell
agent-expo --version
agent-expo devices list --platform android
```

**Notes:**

- iOS development requires macOS
- Windows uses TCP port 9876 instead of Unix socket for daemon communication
- Ensure Windows Firewall allows Node.js connections

### Packages

| Package | Description |
|---------|-------------|
| `@agent-expo/cli` | Command-line interface |
| `@agent-expo/daemon` | Background service for device control |
| `@agent-expo/bridge` | React Native in-app module |
| `@agent-expo/sdk` | Programmatic API for code/AI agents |
| `@agent-expo/protocol` | Shared types and Zod schemas |
| `@agent-expo/mock-bridge` | Mock bridge for testing |

```bash
# CLI only (global install)
npm install -g @agent-expo/cli

# For your React Native app
npm install @agent-expo/bridge

# For programmatic control
npm install @agent-expo/sdk
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              AI Agent (Claude, GPT)             │
└─────────────────────────────────────────────────┘
                        │
                        │ JSON Commands
                        ▼
┌─────────────────────────────────────────────────┐
│               agent-expo CLI / SDK              │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│                  Daemon                          │
│  ┌──────────────────────────────────────────┐   │
│  │           Device Manager                  │   │
│  │  (iOS Simulator / Android Emulator)       │   │
│  └──────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────┐   │
│  │        WebSocket Bridge Server            │   │
│  │  (Connects to in-app bridge)              │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│             React Native App                     │
│  ┌──────────────────────────────────────────┐   │
│  │         @agent-expo/bridge                │   │
│  │  - Accessibility tree                     │   │
│  │  - Network interception                   │   │
│  │  - Supabase/Convex tracking               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## CLI Reference

### Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |
| `--silent` | Suppress output |
| `--session <name>` | Session name for isolated instances (default: "default") |
| `--log-level <level>` | Log level: silent, error, warn, info, debug, trace (default: "info") |

### Lifecycle Commands

| Command | Description |
|---------|-------------|
| `agent-expo daemon start` | Start the background daemon |
| `agent-expo daemon stop` | Stop the daemon |
| `agent-expo launch -p ios` | Launch iOS simulator |
| `agent-expo launch -p android` | Launch Android emulator |
| `agent-expo launch -p ios -b com.app.id` | Launch with specific app |
| `agent-expo launch -p ios -d "iPhone 15"` | Launch specific device |
| `agent-expo terminate` | Stop the app |
| `agent-expo status` | Show daemon and device status |

### Snapshot Commands

| Command | Description |
|---------|-------------|
| `agent-expo snapshot` | Full accessibility tree |
| `agent-expo snapshot -i` | Interactive elements only |
| `agent-expo snapshot --json` | JSON output |
| `agent-expo snapshot --with-screenshot` | Include base64 screenshot |
| `agent-expo snapshot --compact` | Compact tree format |

### Interaction Commands

| Command | Description |
|---------|-------------|
| `agent-expo tap @e1` | Tap element |
| `agent-expo doubletap @e1` | Double tap |
| `agent-expo longpress @e1 --duration 1000` | Long press |
| `agent-expo fill @e2 "text"` | Fill input |
| `agent-expo fill @e2 "text" --clear` | Clear then fill |
| `agent-expo clear @e2` | Clear input |
| `agent-expo scroll down` | Scroll direction (up/down/left/right) |
| `agent-expo scroll down --to @e10` | Scroll until element visible |
| `agent-expo swipe 100 200 100 500` | Swipe from (100,200) to (100,500) |

### Navigation Commands

| Command | Description |
|---------|-------------|
| `agent-expo navigate "myapp://home"` | Open deep link |
| `agent-expo back` | Press back button (Android) |
| `agent-expo home` | Press home button |

### Network Commands

| Command | Description |
|---------|-------------|
| `agent-expo network requests` | List all tracked requests |
| `agent-expo network requests --filter "/api"` | Filter by URL pattern |
| `agent-expo network mock "/api/users" --status 200 --body '{"id":1}'` | Mock response |
| `agent-expo network clear-mocks` | Clear all mocks |
| `agent-expo supabase calls` | List Supabase calls |
| `agent-expo supabase calls --table users` | Filter by table |
| `agent-expo convex calls` | List Convex calls |
| `agent-expo convex calls --type mutation` | Filter by type |

### Visual Testing Commands

| Command | Description |
|---------|-------------|
| `agent-expo screenshot take` | Take screenshot |
| `agent-expo screenshot take --path ./shot.png` | Save to file |
| `agent-expo screenshot save "login-page"` | Save as baseline |
| `agent-expo screenshot compare "login-page"` | Compare with baseline |
| `agent-expo screenshot compare "login-page" --threshold 98` | Custom threshold |
| `agent-expo screenshot diff "login-page"` | Generate diff image |
| `agent-expo screenshot list` | List saved baselines |
| `agent-expo screenshot delete "login-page"` | Delete baseline |

### Assertion Commands

| Command | Description |
|---------|-------------|
| `agent-expo assert @e1 visible` | Assert element is visible |
| `agent-expo assert @e1 hidden` | Assert element is hidden |
| `agent-expo assert @e1 enabled` | Assert element is enabled |
| `agent-expo assert @e1 hasText "Login"` | Assert text content |
| `agent-expo wait-for @e5 visible --timeout 5000` | Wait for element |

## SDK Usage

### Basic Connection

```typescript
import { AgentExpoClient } from '@agent-expo/sdk';

const client = new AgentExpoClient();

// Connect with auto-start (recommended)
await client.connect({ autoStart: true });

// Or connect manually
await client.connect();
```

### Configuration Options

```typescript
const client = new AgentExpoClient({
  session: 'my-session',  // Isolated session name
  port: 9876,             // TCP port (for Windows/remote)
  retry: {
    initialDelay: 100,
    maxDelay: 5000,
    maxAttempts: 10,
    multiplier: 2,
    jitter: true,
  },
});

// Connect with retry (exponential backoff)
await client.connectWithRetry();
```

### Launch and Control

```typescript
// Launch iOS simulator with app
const device = await client.launch({
  platform: 'ios',
  bundleId: 'com.example.app',
  device: 'iPhone 15',
  clearState: true,  // Clear app data
});

// Get accessibility snapshot
const snapshot = await client.snapshot({
  interactive: true,
  withScreenshot: true,
});

console.log(snapshot.tree);
// Output:
// - button "Login" [ref=@e1]
// - textbox "Email" [ref=@e2]
// - textbox "Password" [ref=@e3]
```

### Interaction Methods

```typescript
// Tap elements
await client.tap('@e1');
await client.doubleTap('@e1');
await client.longPress('@e1', 1000);

// Fill inputs
await client.fill('@e2', 'test@example.com');
await client.fill('@e3', 'password', true);  // Clear first
await client.clear('@e2');

// Scroll
await client.scroll('down');
await client.scroll('down', { toRef: '@e10' });  // Until element visible
await client.scroll('up', { withinRef: '@scrollview' });

// Swipe
await client.swipe(
  { x: 100, y: 200 },
  { x: 100, y: 500 },
  300  // duration ms
);
```

### Waiting and Assertions

```typescript
// Wait for elements
await client.waitFor('@e5', 'visible', 5000);
await client.waitFor('@loader', 'hidden', 10000);

// Assert element state
const result = await client.assert('@e1', 'visible');
const textCheck = await client.assert('@e1', 'hasText', 'Login');
```

### Network Verification

```typescript
// Get all requests
const requests = await client.getRequests();

// Filter requests
const loginRequests = await client.getRequests({
  url: '/api/auth/login',
  method: 'POST',
});

console.log(loginRequests[0].response.status);  // 200
console.log(loginRequests[0].response.body);    // { token: '...' }

// Supabase calls
const supabaseCalls = await client.getSupabaseCalls({
  table: 'users',
  operation: 'insert',
});

// Convex calls
const convexCalls = await client.getConvexCalls({
  functionName: 'api.users.create',
  type: 'mutation',
});
```

### Network Mocking

```typescript
// Mock a response
await client.mockResponse('/api/users', {
  status: 200,
  body: { users: [{ id: 1, name: 'Test' }] },
  delay: 100,
});

// Mock error response
await client.mockResponse('/api/users', {
  status: 500,
  body: { error: 'Server error' },
});

// Clear all mocks
await client.clearMocks();
```

### Daemon Management

```typescript
import { AgentExpoClient, startDaemon, stopDaemon, isDaemonRunning } from '@agent-expo/sdk';

// Check if daemon is running
const running = await AgentExpoClient.isDaemonRunning();

// Start daemon manually
await AgentExpoClient.startDaemon({
  timeout: 10000,
  session: 'default',
});

// Stop daemon
await AgentExpoClient.stopDaemon();
```

## AI Agent Integration

agent-expo provides tool definitions compatible with Claude and OpenAI:

### Claude Integration

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { AgentExpoClient, getClaudeTools, executeTools } from '@agent-expo/sdk';

const client = new AgentExpoClient();
await client.connect({ autoStart: true });

const anthropic = new Anthropic();
const tools = getClaudeTools();

// Send message with tools
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  tools,
  messages: [
    {
      role: 'user',
      content: 'Launch the iOS app and log in with test@example.com',
    },
  ],
});

// Execute tool calls
if (response.stop_reason === 'tool_use') {
  const toolCalls = response.content
    .filter((block) => block.type === 'tool_use')
    .map((block) => ({ name: block.name, input: block.input }));

  const results = await executeTools(client, toolCalls);
  console.log(results);
}
```

### OpenAI Integration

```typescript
import OpenAI from 'openai';
import { AgentExpoClient, getOpenAITools, executeTools } from '@agent-expo/sdk';

const client = new AgentExpoClient();
await client.connect({ autoStart: true });

const openai = new OpenAI();
const tools = getOpenAITools();

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  tools,
  messages: [
    {
      role: 'user',
      content: 'Launch the iOS app and take a screenshot',
    },
  ],
});

// Execute tool calls
if (response.choices[0].message.tool_calls) {
  const toolCalls = response.choices[0].message.tool_calls.map((tc) => ({
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments),
  }));

  const results = await executeTools(client, toolCalls);
}
```

### Available AI Tools

| Tool | Description |
|------|-------------|
| `mobile_launch` | Launch simulator/emulator and app |
| `mobile_snapshot` | Get accessibility tree |
| `mobile_tap` | Tap element |
| `mobile_fill` | Fill text input |
| `mobile_clear` | Clear input |
| `mobile_double_tap` | Double tap element |
| `mobile_long_press` | Long press element |
| `mobile_scroll` | Scroll screen |
| `mobile_swipe` | Swipe gesture |
| `mobile_navigate` | Open deep link |
| `mobile_back` | Press back button |
| `mobile_home` | Press home button |
| `mobile_screenshot` | Take screenshot |
| `mobile_assert` | Assert element state |
| `mobile_wait_for` | Wait for element |
| `mobile_api_requests` | Get network requests |
| `mobile_supabase_calls` | Get Supabase calls |
| `mobile_convex_calls` | Get Convex calls |
| `mobile_mock_api` | Mock API response |
| `mobile_clear_mocks` | Clear all mocks |
| `mobile_reload` | Reload app |
| `mobile_devices` | List available devices |
| `mobile_set_location` | Set mock GPS location |

## Visual Testing

agent-expo includes visual regression testing capabilities:

### CLI Workflow

```bash
# 1. Save baseline screenshot
agent-expo screenshot save "login-screen"

# 2. Make changes to your app...

# 3. Compare current state with baseline
agent-expo screenshot compare "login-screen" --threshold 95

# Output: Match: 98.5% (threshold: 95%) - PASS

# 4. Generate diff image if needed
agent-expo screenshot diff "login-screen"
```

### SDK Workflow

```typescript
// Take and save baseline
const screenshot = await client.screenshot();
// Baseline is saved via CLI: agent-expo screenshot save "name"

// Compare screenshots programmatically
const compareResult = await client.send({
  action: 'screenshotCompare',
  name: 'login-screen',
  threshold: 95,
  generateDiff: true,
});

if (!compareResult.data.matched) {
  console.log(`Visual regression detected! Match: ${compareResult.data.matchPercentage}%`);
  console.log(`Diff image: ${compareResult.data.diffPath}`);
}
```

## Network Mocking

Mock API responses for deterministic testing:

### Basic Mocking

```typescript
// Mock success response
await client.mockResponse('/api/users', {
  status: 200,
  body: { users: [{ id: 1, name: 'Test User' }] },
});

// Mock error
await client.mockResponse('/api/users', {
  status: 500,
  body: { error: 'Internal server error' },
});

// Mock with delay (simulate slow network)
await client.mockResponse('/api/users', {
  status: 200,
  body: { users: [] },
  delay: 3000,
});

// Clear mocks
await client.clearMocks();
```

### Verifying API Calls

```typescript
// Perform actions that make API calls
await client.fill('@email', 'test@example.com');
await client.fill('@password', 'password123');
await client.tap('@login-button');

// Verify the API call was made
const requests = await client.getRequests({ url: '/api/auth/login' });
expect(requests.length).toBe(1);
expect(requests[0].method).toBe('POST');
expect(requests[0].body).toEqual({
  email: 'test@example.com',
  password: 'password123',
});
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENT_EXPO_LOG_LEVEL` | Log level (silent, error, warn, info, debug, trace) |
| `AGENT_EXPO_SESSION` | Default session name |

### Daemon Configuration

The daemon stores logs and baselines in `~/.agent-expo/`:

```
~/.agent-expo/
├── daemon.log          # Daemon logs
├── baselines/          # Visual testing baselines
│   ├── login-screen.png
│   └── home-screen.png
└── diffs/              # Visual diff images
```

## Troubleshooting

### Bridge not connecting

**Symptoms:** `BRIDGE_NOT_CONNECTED` error

**Solutions:**
1. Ensure `AgentBridgeProvider` wraps your app root
2. Check app is running in development mode
3. Verify network connectivity between simulator and daemon
4. Check app console for connection errors

```tsx
// Correct setup
import { AgentBridgeProvider } from '@agent-expo/bridge';

export default function App() {
  return (
    <AgentBridgeProvider>
      <YourApp />
    </AgentBridgeProvider>
  );
}
```

### Daemon not running

**Symptoms:** `DAEMON_NOT_RUNNING` error

**Solutions:**
1. Start daemon manually: `agent-expo daemon start`
2. Use auto-start in SDK: `await client.connect({ autoStart: true })`
3. Check daemon logs: `~/.agent-expo/daemon.log`

### Element not found

**Symptoms:** `ELEMENT_NOT_FOUND` error

**Solutions:**
1. Run `agent-expo snapshot` to see available elements
2. Ensure element has `testID` or `accessibilityLabel`
3. Use `waitFor` to wait for element to appear

```tsx
// Add testID to elements
<Button testID="login-button" title="Login" />
<TextInput testID="email-input" />
```

### iOS Simulator issues

**Symptoms:** Cannot launch simulator

**Solutions:**
1. Ensure Xcode is installed
2. Open Xcode and accept license: `sudo xcodebuild -license accept`
3. List available simulators: `xcrun simctl list devices`

### Debug mode

Enable verbose logging:

```bash
# CLI
agent-expo --log-level debug snapshot

# Environment variable
AGENT_EXPO_LOG_LEVEL=debug agent-expo snapshot
```

## Development

### Setup

```bash
# Clone the repo
git clone https://github.com/kndri/agent-expo.git
cd agent-expo

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Project Structure

```
agent-expo/
├── packages/
│   ├── bridge/         # React Native bridge
│   ├── cli/            # CLI commands
│   ├── daemon/         # Background service
│   ├── mock-bridge/    # Mock bridge for testing
│   ├── protocol/       # Shared types
│   └── sdk/            # Programmatic SDK
├── PROGRESS.md         # Development progress
└── README.md
```

### Running Locally

```bash
# Start development mode (watches for changes)
pnpm dev

# Link CLI globally
cd packages/cli && npm link

# Now use agent-expo commands
agent-expo --help
```

## API Reference

See [docs/API.md](docs/API.md) for complete API documentation.

## License

MIT

## Acknowledgments

Inspired by [agent-browser](https://github.com/anthropics/agent-browser) by Anthropic.

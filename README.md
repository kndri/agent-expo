# agent-expo

AI-powered automation for React Native and Expo applications.

**agent-expo** enables AI agents to autonomously control, test, and verify React Native applications. Think of it as [agent-browser](https://github.com/anthropics/agent-browser) but for mobile apps.

## Features

- **Accessibility-based element targeting** - Uses deterministic refs (`@e1`, `@e2`) from the accessibility tree
- **API verification** - Track and verify Supabase, Convex, and REST API calls
- **Cross-platform** - iOS Simulator and Android Emulator support
- **AI-ready** - JSON protocol compatible with any LLM (Claude, GPT, etc.)
- **Network interception** - Mock API responses for testing
- **Screenshot capture** - Visual verification and debugging

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

## Packages

| Package | Description |
|---------|-------------|
| `@agent-expo/cli` | Command-line interface |
| `@agent-expo/daemon` | Background service for device control |
| `@agent-expo/bridge` | React Native in-app module |
| `@agent-expo/sdk` | Programmatic API for code/AI agents |
| `@agent-expo/protocol` | Shared types and Zod schemas |

## Quick Start

### 1. Install the CLI

```bash
npm install -g @agent-expo/cli
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

### 3. Launch and control

```bash
# Launch iOS simulator
agent-expo launch --platform ios --bundle-id com.example.myapp

# Get accessibility snapshot
agent-expo snapshot -i --json

# Interact with elements
agent-expo tap @e1
agent-expo fill @e2 "hello@example.com"
agent-expo scroll down

# Verify API calls
agent-expo network requests --filter "/api/"
agent-expo supabase calls --table users
```

## CLI Commands

### Lifecycle
```bash
agent-expo launch -p ios                    # Launch iOS simulator
agent-expo launch -p android                # Launch Android emulator
agent-expo launch -p ios -b com.app.id      # Launch with app
agent-expo terminate                        # Stop the app
```

### Snapshot
```bash
agent-expo snapshot                         # Full accessibility tree
agent-expo snapshot -i                      # Interactive elements only
agent-expo snapshot --json                  # JSON output
agent-expo snapshot --with-screenshot       # Include base64 screenshot
```

### Interaction
```bash
agent-expo tap @e1                          # Tap element
agent-expo doubletap @e1                    # Double tap
agent-expo longpress @e1 --duration 1000    # Long press
agent-expo fill @e2 "text"                  # Fill input
agent-expo fill @e2 "text" --clear          # Clear then fill
agent-expo scroll down                      # Scroll direction
agent-expo scroll down --to @e10            # Scroll until visible
```

### Navigation
```bash
agent-expo navigate "myapp://home"          # Deep link
agent-expo back                             # Press back (Android)
agent-expo home                             # Press home
```

### API Verification
```bash
agent-expo network requests                 # All requests
agent-expo network requests --filter "/api" # Filter by URL
agent-expo supabase calls                   # Supabase calls
agent-expo supabase calls --table users     # Filter by table
agent-expo convex calls                     # Convex calls
agent-expo convex calls --type mutation     # Filter by type
```

### Assertions
```bash
agent-expo assert @e1 visible               # Check visible
agent-expo assert @e1 hasText "Login"       # Check text
agent-expo wait-for @e5 visible --timeout 5000
```

## SDK Usage

```typescript
import { AgentExpoClient } from '@agent-expo/sdk';

const client = new AgentExpoClient();

// Launch and interact
await client.launch({ platform: 'ios', bundleId: 'com.example.app' });

// Get snapshot
const snapshot = await client.snapshot({ interactive: true });
console.log(snapshot.tree);
// - button "Login" [ref=@e1]
// - textbox "Email" [ref=@e2]

// Interact
await client.fill('@e2', 'test@example.com');
await client.tap('@e1');

// Verify API calls
const requests = await client.getRequests({ url: '/api/login' });
console.log(requests[0].response.status); // 200

const supabaseCalls = await client.getSupabaseCalls({ table: 'users' });
```

## AI Agent Integration

agent-expo provides tool definitions for AI agents:

```typescript
import { aiTools, getClaudeTools, getOpenAITools } from '@agent-expo/sdk';

// For Claude
const tools = getClaudeTools();

// For OpenAI
const functions = getOpenAITools();
```

### Example Agent Workflow

```typescript
// AI agent testing a login flow:

// 1. Get initial state
const snapshot = await client.snapshot({ interactive: true });
// AI sees: textbox "Email" [ref=@e3], textbox "Password" [ref=@e4], button "Login" [ref=@e5]

// 2. Fill form
await client.fill('@e3', 'test@example.com');
await client.fill('@e4', 'password123');

// 3. Submit
await client.tap('@e5');

// 4. Verify API call
const requests = await client.getRequests({ url: '/api/auth/login' });
// AI verifies: POST to /api/auth/login, status 200

// 5. Check new state
const newSnapshot = await client.snapshot();
// AI sees: Welcome screen with user's name
```

## Supabase/Convex Tracking

Track API calls in your app:

```tsx
import { useSupabaseTracking } from '@agent-expo/bridge';

function MyComponent() {
  const { wrapClient, getCalls } = useSupabaseTracking();
  const supabase = wrapClient(originalSupabaseClient);

  // All Supabase calls are now tracked
  await supabase.from('users').select('*');

  // Check calls
  const calls = getCalls({ table: 'users' });
}
```

## Development

```bash
# Clone the repo
git clone https://github.com/kndri/agent-expo.git
cd agent-expo

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run in development
pnpm dev
```

## Requirements

- Node.js 18+
- For iOS: Xcode, iOS Simulator, optionally [idb](https://fbidb.io/)
- For Android: Android Studio, Android Emulator, adb

## How It Works

1. **CLI/SDK** sends JSON commands to the **Daemon**
2. **Daemon** controls the simulator/emulator using native tools (simctl, adb)
3. **Bridge** (in-app module) provides rich accessibility data and network tracking
4. **AI agents** receive structured snapshots with deterministic refs
5. Agents can interact using refs (`@e1`, `@e2`) without complex selectors

## Roadmap

- [ ] Detox integration for robust element targeting
- [ ] Visual regression testing
- [ ] Record and replay
- [ ] Expo Go support
- [ ] Remote device farms (AWS Device Farm, BrowserStack)

## License

MIT

## Acknowledgments

Inspired by [agent-browser](https://github.com/anthropics/agent-browser) by Anthropic.

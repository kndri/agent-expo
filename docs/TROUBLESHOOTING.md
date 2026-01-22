# Troubleshooting Guide

This guide covers common issues and their solutions when using agent-expo.

## Table of Contents

- [Connection Issues](#connection-issues)
- [Device Issues](#device-issues)
- [Element Issues](#element-issues)
- [Visual Testing Issues](#visual-testing-issues)
- [Native Mode Issues](#native-mode-issues)
- [Debug Commands](#debug-commands)

## Connection Issues

### BRIDGE_NOT_CONNECTED

**Error:** `No React Native app is connected to the bridge`

**Causes:**
- AgentBridgeProvider not added to app
- App not running in development mode
- Network connectivity issues

**Solutions:**

1. **Ensure AgentBridgeProvider wraps your app:**

```tsx
// App.tsx
import { AgentBridgeProvider } from '@agent-expo/bridge';

export default function App() {
  return (
    <AgentBridgeProvider>
      <YourApp />
    </AgentBridgeProvider>
  );
}
```

2. **Check app is in development mode:**
   - Metro bundler should be running
   - App should show "Development Mode" or similar indicator

3. **Verify network connectivity:**
   - Simulator/emulator must reach your machine
   - Check firewall settings
   - Try restarting the daemon: `agent-expo daemon stop && agent-expo daemon start`

4. **Check app console for errors:**
   - Look for WebSocket connection errors
   - Verify the bridge URL is correct

### DAEMON_NOT_RUNNING

**Error:** `Cannot connect to agent-expo daemon`

**Causes:**
- Daemon not started
- Socket file missing
- Another process using the socket

**Solutions:**

1. **Start daemon manually:**
```bash
agent-expo daemon start
```

2. **Use auto-start in SDK:**
```typescript
await client.connect({ autoStart: true });
```

3. **Check daemon logs:**
```bash
cat ~/.agent-expo/daemon.log
```

4. **Clean up stale socket:**
```bash
rm /tmp/agent-expo-default.sock
agent-expo daemon start
```

### SDK_NOT_CONNECTED

**Error:** `SDK client is not connected to the daemon`

**Causes:**
- `connect()` not called before operations
- Daemon stopped after connection

**Solutions:**

1. **Ensure connection before operations:**
```typescript
const client = new AgentExpoClient();
await client.connect();  // Must call this first
await client.snapshot();
```

2. **Use auto-start for reliability:**
```typescript
await client.connect({ autoStart: true });
```

### CONNECTION_TIMEOUT

**Error:** `Connection to [target] timed out`

**Causes:**
- Slow startup
- Resource constraints
- Network issues

**Solutions:**

1. **Increase timeout:**
```typescript
await client.connect({ startTimeout: 30000 });
```

2. **Check system resources:**
   - Close unnecessary applications
   - Check CPU/memory usage

3. **Use retry with backoff:**
```typescript
await client.connectWithRetry({
  maxAttempts: 10,
  initialDelay: 500,
  maxDelay: 5000,
});
```

## Device Issues

### DEVICE_NOT_FOUND

**Error:** `Device "[deviceId]" not found`

**Causes:**
- Device name misspelled
- Device not created
- Simulator/emulator not installed

**Solutions:**

1. **List available devices:**
```bash
agent-expo devices list
# or
xcrun simctl list devices  # iOS
emulator -list-avds        # Android
```

2. **Use correct device name:**
```bash
# Find exact name
agent-expo devices list --platform ios

# Use it
agent-expo launch -p ios -d "iPhone 15 Pro"
```

### NO_IOS_SIMULATORS

**Error:** `No available iOS simulators found`

**Causes:**
- Xcode not installed
- No simulator runtimes downloaded

**Solutions:**

1. **Install Xcode from App Store**

2. **Download simulator runtimes:**
   - Open Xcode → Preferences → Components
   - Download iOS simulator runtime

3. **Create simulator via command line:**
```bash
xcrun simctl create "iPhone 15" "com.apple.CoreSimulator.SimDeviceType.iPhone-15" "com.apple.CoreSimulator.SimRuntime.iOS-17-0"
```

### NO_ANDROID_EMULATORS

**Error:** `No Android AVDs found`

**Causes:**
- Android Studio not installed
- No AVDs created

**Solutions:**

1. **Create AVD via Android Studio:**
   - Open Android Studio → AVD Manager
   - Create Virtual Device

2. **Create AVD via command line:**
```bash
# List available system images
sdkmanager --list | grep system-images

# Install a system image
sdkmanager "system-images;android-34;google_apis;x86_64"

# Create AVD
avdmanager create avd -n "Pixel_7" -k "system-images;android-34;google_apis;x86_64"
```

### IOS_BACK_BUTTON

**Error:** `iOS does not have a hardware back button`

**Causes:**
- Using `back()` on iOS

**Solutions:**

1. **Use in-app navigation instead:**
```typescript
// Tap back button in navigation bar
await client.tap('@back-button');

// Or use deep link
await client.navigate('myapp://previous-screen');
```

2. **Use swipe gesture:**
```typescript
await client.swipe(
  { x: 0, y: 300 },
  { x: 200, y: 300 },
  200
);
```

## Element Issues

### ELEMENT_NOT_FOUND

**Error:** `Element with ref "@e5" not found in the accessibility tree`

**Causes:**
- Element not visible
- Element not accessible
- Wrong ref

**Solutions:**

1. **Check available elements:**
```bash
agent-expo snapshot
# or interactive only
agent-expo snapshot -i
```

2. **Add testID to element:**
```tsx
<TouchableOpacity testID="login-button">
  <Text>Login</Text>
</TouchableOpacity>
```

3. **Wait for element to appear:**
```typescript
await client.waitFor('@e5', 'visible', 5000);
await client.tap('@e5');
```

4. **Scroll to element:**
```typescript
await client.scroll('down', { toRef: '@e5' });
await client.tap('@e5');
```

### Element not tappable

**Symptoms:** Tap succeeds but nothing happens

**Causes:**
- Element covered by another element
- Element disabled
- Incorrect element targeted

**Solutions:**

1. **Check element is enabled:**
```typescript
const result = await client.assert('@e1', 'enabled');
```

2. **Use snapshot to verify element:**
```bash
agent-expo snapshot --json | jq '.elements[] | select(.ref == "@e1")'
```

3. **Try tapping parent or child element**

## Visual Testing Issues

### BASELINE_NOT_FOUND

**Error:** `Baseline "login-screen" not found`

**Causes:**
- Baseline not saved
- Wrong name
- Baselines cleared

**Solutions:**

1. **Save baseline first:**
```bash
agent-expo screenshot save "login-screen"
```

2. **List existing baselines:**
```bash
agent-expo screenshot list
```

3. **Check baseline directory:**
```bash
ls ~/.agent-expo/baselines/
```

### Visual comparison failing unexpectedly

**Symptoms:** Screenshots match visually but comparison fails

**Causes:**
- Anti-aliasing differences
- Timing issues (animations)
- Dynamic content

**Solutions:**

1. **Lower threshold:**
```bash
agent-expo screenshot compare "screen" --threshold 90
```

2. **Wait for animations to complete:**
```typescript
await delay(500);  // Wait for animations
await client.screenshot();
```

3. **Use element screenshot instead of full screen**

## Native Mode Issues

### NATIVE_TOOL_UNAVAILABLE

**Error:** `Native mode requires idb but it's not installed`

**Causes:**
- idb-companion not installed (iOS)
- adb not in PATH (Android)

**Solutions:**

**For iOS (idb):**
```bash
brew tap facebook/fb
brew install idb-companion
```

**For Android (adb):**
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### IDB_REQUIRED

**Error:** `Operation "swipe" requires idb on iOS`

**Causes:**
- Advanced operation without idb installed

**Solutions:**

1. **Install idb:**
```bash
brew tap facebook/fb
brew install idb-companion
```

2. **Use bridge mode instead:**
   - Ensure app has AgentBridgeProvider
   - Bridge mode doesn't require idb

## Debug Commands

### Enable verbose logging

```bash
# CLI
agent-expo --log-level debug snapshot

# Environment variable
AGENT_EXPO_LOG_LEVEL=debug agent-expo snapshot

# Trace level (most verbose)
AGENT_EXPO_LOG_LEVEL=trace agent-expo snapshot
```

### Check daemon status

```bash
agent-expo status
```

### View daemon logs

```bash
# Full log
cat ~/.agent-expo/daemon.log

# Live tail
tail -f ~/.agent-expo/daemon.log
```

### Test daemon connection

```bash
# Simple ping
agent-expo ping
```

### Reset everything

```bash
# Stop daemon
agent-expo daemon stop

# Clear socket
rm /tmp/agent-expo-*.sock

# Clear logs (optional)
rm ~/.agent-expo/daemon.log

# Restart
agent-expo daemon start
```

### SDK debugging

```typescript
import { logger, LogLevel } from '@agent-expo/protocol';

// Enable debug logging
logger.setLevel(LogLevel.DEBUG);

const client = new AgentExpoClient();
await client.connect({ autoStart: true });
```

## Getting Help

If you're still having issues:

1. **Check GitHub Issues:** [agent-expo/issues](https://github.com/kndri/agent-expo/issues)
2. **Enable debug logging** and share the output
3. **Include:**
   - OS and version
   - Node.js version
   - React Native version
   - Full error message and stack trace

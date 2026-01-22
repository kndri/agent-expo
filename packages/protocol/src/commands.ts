/**
 * Command schemas for agent-expo using Zod
 */

import { z } from 'zod';

// Base command schema
const BaseCommand = z.object({
  id: z.string(),
});

// ============================================
// Lifecycle Commands
// ============================================

export const LaunchCommand = BaseCommand.extend({
  action: z.literal('launch'),
  platform: z.enum(['ios', 'android']),
  device: z.string().optional(),
  app: z.string().optional(), // Path to .app or .apk
  bundleId: z.string().optional(),
  clearState: z.boolean().optional(),
  headless: z.boolean().optional(),
  locale: z.string().optional(),
});

export const TerminateCommand = BaseCommand.extend({
  action: z.literal('terminate'),
});

export const ReinstallCommand = BaseCommand.extend({
  action: z.literal('reinstall'),
  app: z.string().optional(),
});

// ============================================
// Snapshot Commands
// ============================================

export const SnapshotCommand = BaseCommand.extend({
  action: z.literal('snapshot'),
  interactive: z.boolean().optional(), // Only interactive elements
  compact: z.boolean().optional(), // Compact output
  maxDepth: z.number().optional(), // Limit tree depth
  withScreenshot: z.boolean().optional(), // Include base64 screenshot
  native: z.boolean().optional(), // Use native accessibility APIs instead of bridge
});

// ============================================
// Interaction Commands
// ============================================

export const TapCommand = BaseCommand.extend({
  action: z.literal('tap'),
  ref: z.string().optional(), // @e1, @e2, etc.
  testID: z.string().optional(),
  label: z.string().optional(),
  coordinates: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  count: z.number().optional(), // Double tap = 2
  duration: z.number().optional(), // Long press duration in ms
});

export const DoubleTapCommand = BaseCommand.extend({
  action: z.literal('doubleTap'),
  ref: z.string().optional(),
  testID: z.string().optional(),
  coordinates: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

export const LongPressCommand = BaseCommand.extend({
  action: z.literal('longPress'),
  ref: z.string().optional(),
  testID: z.string().optional(),
  coordinates: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  duration: z.number().optional(), // Default 500ms
});

export const FillCommand = BaseCommand.extend({
  action: z.literal('fill'),
  ref: z.string().optional(),
  testID: z.string().optional(),
  text: z.string(),
  clear: z.boolean().optional(), // Clear existing text first
});

export const ClearCommand = BaseCommand.extend({
  action: z.literal('clear'),
  ref: z.string().optional(),
  testID: z.string().optional(),
});

export const TypeCommand = BaseCommand.extend({
  action: z.literal('type'),
  text: z.string(),
  delay: z.number().optional(), // Delay between keystrokes in ms
});

// ============================================
// Scroll & Swipe Commands
// ============================================

export const ScrollCommand = BaseCommand.extend({
  action: z.literal('scroll'),
  ref: z.string().optional(), // Scroll within this element
  direction: z.enum(['up', 'down', 'left', 'right']),
  distance: z.number().optional(), // Pixels
  toRef: z.string().optional(), // Scroll until this ref visible
  toTestID: z.string().optional(),
  speed: z.enum(['slow', 'normal', 'fast']).optional(),
});

export const SwipeCommand = BaseCommand.extend({
  action: z.literal('swipe'),
  from: z.object({ x: z.number(), y: z.number() }),
  to: z.object({ x: z.number(), y: z.number() }),
  duration: z.number().optional(), // Duration in ms
});

export const PinchCommand = BaseCommand.extend({
  action: z.literal('pinch'),
  ref: z.string().optional(),
  scale: z.number(), // < 1 for pinch in, > 1 for pinch out
  speed: z.enum(['slow', 'normal', 'fast']).optional(),
});

// ============================================
// Navigation Commands
// ============================================

export const NavigateCommand = BaseCommand.extend({
  action: z.literal('navigate'),
  url: z.string(), // Deep link URL
});

export const BackCommand = BaseCommand.extend({
  action: z.literal('back'),
});

export const HomeCommand = BaseCommand.extend({
  action: z.literal('home'),
});

export const ReloadCommand = BaseCommand.extend({
  action: z.literal('reload'),
});

export const ShakeCommand = BaseCommand.extend({
  action: z.literal('shake'),
});

// ============================================
// Screenshot & Visual Commands
// ============================================

export const ScreenshotCommand = BaseCommand.extend({
  action: z.literal('screenshot'),
  path: z.string().optional(),
  element: z.string().optional(), // Ref to capture specific element
  fullPage: z.boolean().optional(),
  format: z.enum(['png', 'jpeg']).optional(),
  quality: z.number().min(0).max(100).optional(), // JPEG quality
});

export const VisualCompareCommand = BaseCommand.extend({
  action: z.literal('visualCompare'),
  baseline: z.string(), // Path to baseline image
  current: z.string().optional(), // Path to current image, or capture new
  threshold: z.number().optional(), // 0-1, default 0.1
  maxDiffPercent: z.number().optional(), // Max acceptable diff %
});

// ============================================
// Visual Testing Commands
// ============================================

export const ScreenshotSaveCommand = BaseCommand.extend({
  action: z.literal('screenshotSave'),
  name: z.string(), // Baseline name
});

export const ScreenshotCompareCommand = BaseCommand.extend({
  action: z.literal('screenshotCompare'),
  name: z.string(), // Baseline name to compare against
  threshold: z.number().optional(), // Match percentage required (0-100, default 95)
  generateDiff: z.boolean().optional(), // Generate diff image
});

export const ScreenshotDiffCommand = BaseCommand.extend({
  action: z.literal('screenshotDiff'),
  name: z.string(), // Baseline name
  outputPath: z.string().optional(), // Where to save diff image
});

export const ScreenshotListCommand = BaseCommand.extend({
  action: z.literal('screenshotList'),
});

export const ScreenshotDeleteCommand = BaseCommand.extend({
  action: z.literal('screenshotDelete'),
  name: z.string(),
});

// ============================================
// Assertion Commands
// ============================================

export const AssertCommand = BaseCommand.extend({
  action: z.literal('assert'),
  ref: z.string().optional(),
  testID: z.string().optional(),
  assertion: z.enum([
    'visible',
    'hidden',
    'enabled',
    'disabled',
    'exists',
    'notExists',
    'hasText',
    'hasValue',
    'checked',
    'unchecked',
  ]),
  value: z.string().optional(),
  timeout: z.number().optional(), // Wait timeout in ms
});

export const WaitForCommand = BaseCommand.extend({
  action: z.literal('waitFor'),
  ref: z.string().optional(),
  testID: z.string().optional(),
  condition: z.enum(['visible', 'hidden', 'exists', 'notExists']),
  timeout: z.number().optional(), // Default 5000ms
});

// ============================================
// Network Commands
// ============================================

export const NetworkRequestsCommand = BaseCommand.extend({
  action: z.literal('networkRequests'),
  filter: z.string().optional(), // URL pattern
  method: z.string().optional(),
  status: z.number().optional(),
  limit: z.number().optional(),
});

export const NetworkMockCommand = BaseCommand.extend({
  action: z.literal('networkMock'),
  pattern: z.string(), // URL pattern to match
  response: z.object({
    status: z.number().optional(),
    statusText: z.string().optional(),
    headers: z.record(z.string()).optional(),
    body: z.union([z.string(), z.record(z.unknown())]).optional(),
    delay: z.number().optional(),
  }),
});

export const NetworkClearMocksCommand = BaseCommand.extend({
  action: z.literal('networkClearMocks'),
  pattern: z.string().optional(), // Clear specific pattern, or all if omitted
});

// ============================================
// Supabase Commands
// ============================================

export const SupabaseCallsCommand = BaseCommand.extend({
  action: z.literal('supabaseCalls'),
  table: z.string().optional(),
  operation: z.string().optional(),
  type: z.enum(['query', 'mutation', 'realtime', 'auth', 'storage']).optional(),
  limit: z.number().optional(),
});

export const SupabaseClearCommand = BaseCommand.extend({
  action: z.literal('supabaseClear'),
});

// ============================================
// Convex Commands
// ============================================

export const ConvexCallsCommand = BaseCommand.extend({
  action: z.literal('convexCalls'),
  functionName: z.string().optional(),
  type: z.enum(['query', 'mutation', 'action']).optional(),
  limit: z.number().optional(),
});

export const ConvexClearCommand = BaseCommand.extend({
  action: z.literal('convexClear'),
});

// ============================================
// Device Commands
// ============================================

export const DeviceListCommand = BaseCommand.extend({
  action: z.literal('deviceList'),
  platform: z.enum(['ios', 'android']).optional(),
});

export const DeviceInfoCommand = BaseCommand.extend({
  action: z.literal('deviceInfo'),
});

export const SetLocationCommand = BaseCommand.extend({
  action: z.literal('setLocation'),
  latitude: z.number(),
  longitude: z.number(),
});

export const SetPermissionCommand = BaseCommand.extend({
  action: z.literal('setPermission'),
  permission: z.string(), // e.g., 'camera', 'location', 'notifications'
  grant: z.boolean(),
});

// ============================================
// Keyboard Commands
// ============================================

export const KeyboardCommand = BaseCommand.extend({
  action: z.literal('keyboard'),
  subAction: z.enum(['show', 'hide', 'isVisible']),
});

export const PressKeyCommand = BaseCommand.extend({
  action: z.literal('pressKey'),
  key: z.string(), // e.g., 'enter', 'backspace', 'tab'
});

// ============================================
// Status Commands
// ============================================

export const StatusCommand = BaseCommand.extend({
  action: z.literal('status'),
});

export const PingCommand = BaseCommand.extend({
  action: z.literal('ping'),
});

// ============================================
// Union of all commands
// ============================================

export const Command = z.discriminatedUnion('action', [
  // Lifecycle
  LaunchCommand,
  TerminateCommand,
  ReinstallCommand,
  // Snapshot
  SnapshotCommand,
  // Interaction
  TapCommand,
  DoubleTapCommand,
  LongPressCommand,
  FillCommand,
  ClearCommand,
  TypeCommand,
  // Scroll & Swipe
  ScrollCommand,
  SwipeCommand,
  PinchCommand,
  // Navigation
  NavigateCommand,
  BackCommand,
  HomeCommand,
  ReloadCommand,
  ShakeCommand,
  // Screenshot & Visual
  ScreenshotCommand,
  VisualCompareCommand,
  ScreenshotSaveCommand,
  ScreenshotCompareCommand,
  ScreenshotDiffCommand,
  ScreenshotListCommand,
  ScreenshotDeleteCommand,
  // Assertions
  AssertCommand,
  WaitForCommand,
  // Network
  NetworkRequestsCommand,
  NetworkMockCommand,
  NetworkClearMocksCommand,
  // Supabase
  SupabaseCallsCommand,
  SupabaseClearCommand,
  // Convex
  ConvexCallsCommand,
  ConvexClearCommand,
  // Device
  DeviceListCommand,
  DeviceInfoCommand,
  SetLocationCommand,
  SetPermissionCommand,
  // Keyboard
  KeyboardCommand,
  PressKeyCommand,
  // Status
  StatusCommand,
  PingCommand,
]);

export type Command = z.infer<typeof Command>;

// Export individual command types
export type LaunchCommand = z.infer<typeof LaunchCommand>;
export type TerminateCommand = z.infer<typeof TerminateCommand>;
export type SnapshotCommand = z.infer<typeof SnapshotCommand>;
export type TapCommand = z.infer<typeof TapCommand>;
export type FillCommand = z.infer<typeof FillCommand>;
export type ScrollCommand = z.infer<typeof ScrollCommand>;
export type SwipeCommand = z.infer<typeof SwipeCommand>;
export type NavigateCommand = z.infer<typeof NavigateCommand>;
export type ScreenshotCommand = z.infer<typeof ScreenshotCommand>;
export type AssertCommand = z.infer<typeof AssertCommand>;
export type NetworkRequestsCommand = z.infer<typeof NetworkRequestsCommand>;
export type NetworkMockCommand = z.infer<typeof NetworkMockCommand>;

/**
 * Parse and validate a command from JSON string or object
 */
export function parseCommand(input: string | object): Command {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  return Command.parse(data);
}

/**
 * Safely parse a command, returning null on failure
 */
export function safeParseCommand(
  input: string | object
): { success: true; data: Command } | { success: false; error: z.ZodError } {
  try {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    return Command.safeParse(data);
  } catch (e) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          path: [],
          message: e instanceof Error ? e.message : 'Invalid JSON',
        },
      ]),
    };
  }
}

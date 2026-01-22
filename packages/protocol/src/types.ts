/**
 * Core types for agent-expo
 */

export type Platform = 'ios' | 'android';

export type DeviceState = 'booted' | 'shutdown' | 'unknown';

export interface Device {
  id: string;
  name: string;
  platform: Platform;
  state: DeviceState;
  osVersion: string;
  isAvailable: boolean;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export type AccessibilityRole =
  | 'none'
  | 'button'
  | 'link'
  | 'search'
  | 'image'
  | 'text'
  | 'adjustable'
  | 'header'
  | 'summary'
  | 'alert'
  | 'checkbox'
  | 'combobox'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'scrollbar'
  | 'spinbutton'
  | 'switch'
  | 'tab'
  | 'tablist'
  | 'timer'
  | 'toolbar'
  | 'list'
  | 'grid'
  | 'textbox'
  | 'scrollview';

export interface AccessibilityState {
  disabled?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  busy?: boolean;
  expanded?: boolean;
}

export interface AccessibilityValue {
  min?: number;
  max?: number;
  now?: number;
  text?: string;
}

export interface AccessibilityNode {
  ref: string;
  role: AccessibilityRole | string;
  label?: string;
  hint?: string;
  testID?: string;
  placeholder?: string;
  state?: AccessibilityState;
  value?: AccessibilityValue;
  bounds: Bounds;
  children: AccessibilityNode[];
}

export interface RefEntry {
  role: string;
  label?: string;
  hint?: string;
  testID?: string;
  placeholder?: string;
  bounds: Bounds;
  state?: AccessibilityState;
  value?: AccessibilityValue;
}

export interface RefMap {
  [ref: string]: RefEntry;
}

export interface EnhancedSnapshot {
  tree: string;
  refs: RefMap;
  viewport: Viewport;
  route?: string;
  timestamp: string;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: string;
}

export interface NetworkResponse {
  id: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string;
  duration: number;
}

export interface TrackedRequest {
  request: NetworkRequest;
  response?: NetworkResponse;
  error?: string;
}

export interface SupabaseCall {
  id: string;
  type: 'query' | 'mutation' | 'realtime' | 'auth' | 'storage';
  table?: string;
  operation?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
  timestamp: string;
  duration: number;
}

export interface ConvexCall {
  id: string;
  type: 'query' | 'mutation' | 'action';
  functionName: string;
  args: unknown;
  result?: unknown;
  error?: unknown;
  timestamp: string;
  duration: number;
}

export interface MockConfig {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string | object;
  delay?: number;
}

export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

export type AssertionType =
  | 'visible'
  | 'hidden'
  | 'enabled'
  | 'disabled'
  | 'exists'
  | 'notExists'
  | 'hasText'
  | 'hasValue'
  | 'checked'
  | 'unchecked';

export interface AssertionResult {
  passed: boolean;
  message: string;
  actual?: unknown;
  expected?: unknown;
}

export interface ScreenshotResult {
  base64?: string;
  path?: string;
  width: number;
  height: number;
}

export interface CompareResult {
  match: boolean;
  diffPercentage: number;
  diffPixels: number;
  diffImageBase64?: string;
}

// ============================================
// Recording Types
// ============================================

/**
 * Target for a recorded step - can be ref, testID, label, or coordinates
 */
export interface RecordedTarget {
  ref?: string;
  testID?: string;
  label?: string;
  coordinates?: Point;
}

/**
 * A single recorded step/action
 */
export interface RecordedStep {
  action: string;
  target?: RecordedTarget;
  value?: string | number;
  duration?: number;
  timeout?: number;
  timestamp: number; // Relative to recording start (ms)
}

/**
 * Device info captured at recording start
 */
export interface RecordedDevice {
  platform: Platform;
  name: string;
  osVersion?: string;
}

/**
 * Complete recording metadata and steps
 */
export interface Recording {
  name: string;
  createdAt: string;
  device: RecordedDevice;
  steps: RecordedStep[];
  duration: number; // Total duration in ms
}

/**
 * Recording status info
 */
export interface RecordingStatus {
  isRecording: boolean;
  name?: string;
  startedAt?: string;
  stepCount?: number;
}

/**
 * Recording list entry
 */
export interface RecordingInfo {
  name: string;
  createdAt: string;
  device: RecordedDevice;
  stepCount: number;
  duration: number;
}

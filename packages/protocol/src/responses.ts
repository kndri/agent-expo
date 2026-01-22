/**
 * Response types for agent-expo
 */

import { z } from 'zod';
import type {
  AssertionResult,
  CompareResult,
  ConvexCall,
  Device,
  EnhancedSnapshot,
  ScreenshotResult,
  SupabaseCall,
  TrackedRequest,
} from './types.js';

// Base response schemas
export const SuccessResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    id: z.string(),
    success: z.literal(true),
    data: dataSchema,
  });

export const ErrorResponse = z.object({
  id: z.string(),
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponse>;

// Generic response type
export type Response<T = unknown> =
  | { id: string; success: true; data: T }
  | { id: string; success: false; error: string; code?: string; details?: unknown };

// ============================================
// Specific Response Data Types
// ============================================

export interface LaunchResponseData {
  launched: true;
  device: Device;
  bundleId?: string;
}

export interface TerminateResponseData {
  terminated: true;
}

export interface SnapshotResponseData extends EnhancedSnapshot {
  screenshot?: string; // Base64 if withScreenshot was true
}

export interface TapResponseData {
  tapped: true;
  ref?: string;
  coordinates?: { x: number; y: number };
}

export interface FillResponseData {
  filled: true;
  ref?: string;
  text: string;
}

export interface ClearResponseData {
  cleared: true;
  ref?: string;
}

export interface ScrollResponseData {
  scrolled: true;
  direction: string;
  distance?: number;
  reachedEnd?: boolean;
}

export interface SwipeResponseData {
  swiped: true;
}

export interface NavigateResponseData {
  navigated: true;
  url: string;
}

export interface BackResponseData {
  pressed: 'back';
}

export interface HomeResponseData {
  pressed: 'home';
}

export interface ScreenshotResponseData extends ScreenshotResult {}

export interface VisualCompareResponseData extends CompareResult {}

export interface AssertResponseData extends AssertionResult {}

export interface WaitForResponseData {
  found: boolean;
  elapsed: number;
}

export interface NetworkRequestsResponseData {
  requests: TrackedRequest[];
  count: number;
}

export interface NetworkMockResponseData {
  mocked: true;
  pattern: string;
}

export interface NetworkClearMocksResponseData {
  cleared: true;
  count: number;
}

export interface SupabaseCallsResponseData {
  calls: SupabaseCall[];
  count: number;
}

export interface ConvexCallsResponseData {
  calls: ConvexCall[];
  count: number;
}

export interface DeviceListResponseData {
  devices: Device[];
  count: number;
}

export interface DeviceInfoResponseData {
  device: Device;
  app?: {
    bundleId: string;
    version?: string;
    buildNumber?: string;
  };
}

export interface SetLocationResponseData {
  set: true;
  latitude: number;
  longitude: number;
}

export interface SetPermissionResponseData {
  set: true;
  permission: string;
  granted: boolean;
}

export interface KeyboardResponseData {
  visible?: boolean;
  action?: 'show' | 'hide';
}

export interface StatusResponseData {
  daemon: {
    version: string;
    uptime: number;
  };
  device?: Device;
  app?: {
    bundleId: string;
    state: 'running' | 'stopped' | 'unknown';
  };
  bridge: {
    connected: boolean;
  };
}

export interface PingResponseData {
  pong: true;
  timestamp: string;
}

// ============================================
// Response Utilities
// ============================================

/**
 * Create a success response
 */
export function success<T>(id: string, data: T): Response<T> {
  return { id, success: true, data };
}

/**
 * Create an error response
 */
export function error(
  id: string,
  message: string,
  code?: string,
  details?: unknown
): ErrorResponse {
  return { id, success: false, error: message, code, details };
}

/**
 * Serialize a response to JSON string (newline-delimited)
 */
export function serializeResponse(response: Response<unknown>): string {
  return JSON.stringify(response) + '\n';
}

/**
 * Parse a response from JSON string
 */
export function parseResponse<T>(json: string): Response<T> {
  return JSON.parse(json.trim()) as Response<T>;
}

/**
 * Check if a response is successful
 */
export function isSuccess<T>(
  response: Response<T>
): response is { id: string; success: true; data: T } {
  return response.success === true;
}

/**
 * Check if a response is an error
 */
export function isError(response: Response<unknown>): response is ErrorResponse {
  return response.success === false;
}

/**
 * Error codes
 */
export const ErrorCode = {
  // General
  UNKNOWN: 'UNKNOWN',
  INVALID_COMMAND: 'INVALID_COMMAND',
  TIMEOUT: 'TIMEOUT',

  // Device
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_NOT_BOOTED: 'DEVICE_NOT_BOOTED',
  DEVICE_BOOT_FAILED: 'DEVICE_BOOT_FAILED',

  // App
  APP_NOT_INSTALLED: 'APP_NOT_INSTALLED',
  APP_NOT_RUNNING: 'APP_NOT_RUNNING',
  APP_LAUNCH_FAILED: 'APP_LAUNCH_FAILED',

  // Element
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  ELEMENT_NOT_VISIBLE: 'ELEMENT_NOT_VISIBLE',
  ELEMENT_NOT_INTERACTABLE: 'ELEMENT_NOT_INTERACTABLE',
  REF_NOT_FOUND: 'REF_NOT_FOUND',

  // Bridge
  BRIDGE_NOT_CONNECTED: 'BRIDGE_NOT_CONNECTED',
  BRIDGE_TIMEOUT: 'BRIDGE_TIMEOUT',

  // Assertion
  ASSERTION_FAILED: 'ASSERTION_FAILED',

  // File
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_WRITE_FAILED: 'FILE_WRITE_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * @agent-expo/protocol
 *
 * Shared types, schemas, and utilities for agent-expo
 */

// Types
export * from './types.js';

// Commands
export {
  // Command schemas
  Command,
  LaunchCommand,
  TerminateCommand,
  ReinstallCommand,
  SnapshotCommand,
  TapCommand,
  DoubleTapCommand,
  LongPressCommand,
  FillCommand,
  ClearCommand,
  TypeCommand,
  ScrollCommand,
  SwipeCommand,
  PinchCommand,
  NavigateCommand,
  BackCommand,
  HomeCommand,
  ReloadCommand,
  ShakeCommand,
  ScreenshotCommand,
  VisualCompareCommand,
  AssertCommand,
  WaitForCommand,
  NetworkRequestsCommand,
  NetworkMockCommand,
  NetworkClearMocksCommand,
  SupabaseCallsCommand,
  SupabaseClearCommand,
  ConvexCallsCommand,
  ConvexClearCommand,
  DeviceListCommand,
  DeviceInfoCommand,
  SetLocationCommand,
  SetPermissionCommand,
  KeyboardCommand,
  PressKeyCommand,
  StatusCommand,
  PingCommand,
  // Utilities
  parseCommand,
  safeParseCommand,
} from './commands.js';

// Responses
export {
  // Response utilities
  success,
  error,
  serializeResponse,
  parseResponse,
  isSuccess,
  isError,
  ErrorCode,
  // Response types
  type ErrorResponse,
  type Response,
  type LaunchResponseData,
  type TerminateResponseData,
  type SnapshotResponseData,
  type TapResponseData,
  type FillResponseData,
  type ClearResponseData,
  type ScrollResponseData,
  type SwipeResponseData,
  type NavigateResponseData,
  type BackResponseData,
  type HomeResponseData,
  type ScreenshotResponseData,
  type VisualCompareResponseData,
  type AssertResponseData,
  type WaitForResponseData,
  type NetworkRequestsResponseData,
  type NetworkMockResponseData,
  type NetworkClearMocksResponseData,
  type SupabaseCallsResponseData,
  type ConvexCallsResponseData,
  type DeviceListResponseData,
  type DeviceInfoResponseData,
  type SetLocationResponseData,
  type SetPermissionResponseData,
  type KeyboardResponseData,
  type StatusResponseData,
  type PingResponseData,
} from './responses.js';

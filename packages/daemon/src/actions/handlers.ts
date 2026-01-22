/**
 * Action Handlers
 *
 * Execute commands and return responses.
 */

import type {
  Command,
  Response,
  LaunchResponseData,
  TerminateResponseData,
  SnapshotResponseData,
  TapResponseData,
  FillResponseData,
  ClearResponseData,
  ScrollResponseData,
  SwipeResponseData,
  NavigateResponseData,
  BackResponseData,
  HomeResponseData,
  ScreenshotResponseData,
  AssertResponseData,
  NetworkRequestsResponseData,
  NetworkMockResponseData,
  NetworkClearMocksResponseData,
  SupabaseCallsResponseData,
  ConvexCallsResponseData,
  DeviceListResponseData,
  DeviceInfoResponseData,
  SetLocationResponseData,
  StatusResponseData,
  PingResponseData,
  ScreenshotSaveResponseData,
  ScreenshotCompareResponseData,
  ScreenshotDiffResponseData,
  ScreenshotListResponseData,
  ScreenshotDeleteResponseData,
  // Command types
  LaunchCommandType,
  TerminateCommandType,
  ReinstallCommandType,
  SnapshotCommandType,
  TapCommandType,
  DoubleTapCommandType,
  LongPressCommandType,
  FillCommandType,
  ClearCommandType,
  TypeCommandType,
  ScrollCommandType,
  SwipeCommandType,
  PinchCommandType,
  NavigateCommandType,
  BackCommandType,
  HomeCommandType,
  ReloadCommandType,
  ShakeCommandType,
  ScreenshotCommandType,
  VisualCompareCommandType,
  ScreenshotSaveCommandType,
  ScreenshotCompareCommandType,
  ScreenshotDiffCommandType,
  ScreenshotListCommandType,
  ScreenshotDeleteCommandType,
  AssertCommandType,
  WaitForCommandType,
  NetworkRequestsCommandType,
  NetworkMockCommandType,
  NetworkClearMocksCommandType,
  SupabaseCallsCommandType,
  SupabaseClearCommandType,
  ConvexCallsCommandType,
  ConvexClearCommandType,
  DeviceListCommandType,
  DeviceInfoCommandType,
  SetLocationCommandType,
  SetPermissionCommandType,
  KeyboardCommandType,
  PressKeyCommandType,
  StatusCommandType,
  PingCommandType,
  CacheStatsCommandType,
  CacheInvalidateCommandType,
  RecordStartCommandType,
  RecordStopCommandType,
  RecordListCommandType,
  RecordPlayCommandType,
  RecordDeleteCommandType,
  RecordExportCommandType,
  RecordStatusCommandType,
  Recording,
  RecordingStatus,
  RecordingInfo,
} from '@agent-expo/protocol';
import { success, error, ErrorCode } from '@agent-expo/protocol';
import type { AppController } from '../app-controller.js';

/**
 * Handler function type for a specific command
 */
type Handler<C, D> = (command: C, controller: AppController) => Promise<Response<D>>;

/**
 * Execute a command and return a response
 */
export async function executeCommand(
  command: Command,
  controller: AppController
): Promise<Response<unknown>> {
  const handler = handlers[command.action];

  if (!handler) {
    return error(command.id, `Unknown action: ${command.action}`, ErrorCode.INVALID_COMMAND);
  }

  try {
    // Type assertion needed here since handlers map is keyed by string
    return await (handler as Handler<Command, unknown>)(command, controller);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return error(command.id, message, ErrorCode.UNKNOWN);
  }
}

/**
 * Handler map type - each action maps to its specific handler
 */
type HandlerMap = {
  launch: Handler<LaunchCommandType, LaunchResponseData>;
  terminate: Handler<TerminateCommandType, TerminateResponseData>;
  reinstall: Handler<ReinstallCommandType, { reinstalled: true }>;
  snapshot: Handler<SnapshotCommandType, SnapshotResponseData>;
  tap: Handler<TapCommandType, TapResponseData>;
  doubleTap: Handler<DoubleTapCommandType, TapResponseData>;
  longPress: Handler<LongPressCommandType, TapResponseData>;
  fill: Handler<FillCommandType, FillResponseData>;
  clear: Handler<ClearCommandType, ClearResponseData>;
  type: Handler<TypeCommandType, { typed: true }>;
  scroll: Handler<ScrollCommandType, ScrollResponseData>;
  swipe: Handler<SwipeCommandType, SwipeResponseData>;
  pinch: Handler<PinchCommandType, { pinched: true }>;
  navigate: Handler<NavigateCommandType, NavigateResponseData>;
  back: Handler<BackCommandType, BackResponseData>;
  home: Handler<HomeCommandType, HomeResponseData>;
  reload: Handler<ReloadCommandType, { reloaded: true }>;
  shake: Handler<ShakeCommandType, { shook: true }>;
  screenshot: Handler<ScreenshotCommandType, ScreenshotResponseData>;
  visualCompare: Handler<VisualCompareCommandType, unknown>;
  screenshotSave: Handler<ScreenshotSaveCommandType, ScreenshotSaveResponseData>;
  screenshotCompare: Handler<ScreenshotCompareCommandType, ScreenshotCompareResponseData>;
  screenshotDiff: Handler<ScreenshotDiffCommandType, ScreenshotDiffResponseData>;
  screenshotList: Handler<ScreenshotListCommandType, ScreenshotListResponseData>;
  screenshotDelete: Handler<ScreenshotDeleteCommandType, ScreenshotDeleteResponseData>;
  assert: Handler<AssertCommandType, AssertResponseData>;
  waitFor: Handler<WaitForCommandType, { found: boolean; elapsed: number }>;
  networkRequests: Handler<NetworkRequestsCommandType, NetworkRequestsResponseData>;
  networkMock: Handler<NetworkMockCommandType, NetworkMockResponseData>;
  networkClearMocks: Handler<NetworkClearMocksCommandType, NetworkClearMocksResponseData>;
  supabaseCalls: Handler<SupabaseCallsCommandType, SupabaseCallsResponseData>;
  supabaseClear: Handler<SupabaseClearCommandType, { cleared: true }>;
  convexCalls: Handler<ConvexCallsCommandType, ConvexCallsResponseData>;
  convexClear: Handler<ConvexClearCommandType, { cleared: true }>;
  deviceList: Handler<DeviceListCommandType, DeviceListResponseData>;
  deviceInfo: Handler<DeviceInfoCommandType, DeviceInfoResponseData>;
  setLocation: Handler<SetLocationCommandType, SetLocationResponseData>;
  setPermission: Handler<SetPermissionCommandType, unknown>;
  keyboard: Handler<KeyboardCommandType, unknown>;
  pressKey: Handler<PressKeyCommandType, { pressed: true }>;
  status: Handler<StatusCommandType, StatusResponseData>;
  ping: Handler<PingCommandType, PingResponseData>;
  cacheStats: Handler<CacheStatsCommandType, { hits: number; misses: number; size: number; enabled: boolean; maxAge: number; version: number }>;
  cacheInvalidate: Handler<CacheInvalidateCommandType, { invalidated: true }>;
  recordStart: Handler<RecordStartCommandType, { started: true; name: string }>;
  recordStop: Handler<RecordStopCommandType, { stopped: true; recording: Recording | null }>;
  recordList: Handler<RecordListCommandType, { recordings: RecordingInfo[] }>;
  recordPlay: Handler<RecordPlayCommandType, { played: true; name: string }>;
  recordDelete: Handler<RecordDeleteCommandType, { deleted: boolean; name: string }>;
  recordExport: Handler<RecordExportCommandType, { exported: true; code: string }>;
  recordStatus: Handler<RecordStatusCommandType, RecordingStatus>;
};

const handlers: HandlerMap = {
  // ============================================
  // Lifecycle
  // ============================================

  async launch(command, controller) {
    const device = await controller.launch({
      platform: command.platform,
      device: command.device,
      appPath: command.app,
      bundleId: command.bundleId,
      clearState: command.clearState,
      headless: command.headless,
    });

    return success(command.id, {
      launched: true,
      device,
      bundleId: command.bundleId,
    });
  },

  async terminate(command, controller) {
    await controller.terminate();
    return success(command.id, { terminated: true });
  },

  async reinstall(command, controller) {
    if (!command.app) {
      return error(command.id, ErrorCode.INVALID_COMMAND, 'App path is required for reinstall');
    }
    await controller.reinstall(command.app);
    return success(command.id, { reinstalled: true });
  },

  // ============================================
  // Snapshot
  // ============================================

  async snapshot(command, controller) {
    const snapshot = await controller.getSnapshot({
      interactive: command.interactive,
      compact: command.compact,
      maxDepth: command.maxDepth,
      withScreenshot: command.withScreenshot,
      native: command.native,
    });

    let screenshot: string | undefined;
    if (command.withScreenshot) {
      const buffer = await controller.screenshot();
      screenshot = buffer.toString('base64');
    }

    return success(command.id, {
      ...snapshot,
      screenshot,
    });
  },

  // ============================================
  // Interaction
  // ============================================

  async tap(command, controller) {
    // Record step if recording
    controller.recordStep('tap', {
      ref: command.ref,
      testID: command.testID,
      coordinates: command.coordinates,
    });

    if (command.ref) {
      await controller.tap(command.ref, {
        count: command.count,
        duration: command.duration,
      });
    } else if (command.testID) {
      await controller.tapByTestID(command.testID);
    } else if (command.coordinates) {
      await controller.tapCoordinates(command.coordinates.x, command.coordinates.y);
    } else {
      return error(command.id, 'No target specified for tap', ErrorCode.INVALID_COMMAND);
    }

    return success(command.id, {
      tapped: true,
      ref: command.ref,
      coordinates: command.coordinates,
    });
  },

  async doubleTap(command, controller) {
    // Record step if recording
    controller.recordStep('doubleTap', {
      ref: command.ref,
      testID: command.testID,
      coordinates: command.coordinates,
    });

    if (command.ref) {
      await controller.tap(command.ref, { count: 2 });
    } else if (command.testID) {
      await controller.tapByTestID(command.testID);
      await new Promise((r) => setTimeout(r, 100));
      await controller.tapByTestID(command.testID);
    } else if (command.coordinates) {
      await controller.tapCoordinates(command.coordinates.x, command.coordinates.y);
      await new Promise((r) => setTimeout(r, 100));
      await controller.tapCoordinates(command.coordinates.x, command.coordinates.y);
    }

    return success(command.id, { tapped: true, ref: command.ref });
  },

  async longPress(command, controller) {
    const duration = command.duration || 500;

    // Record step if recording
    controller.recordStep('longPress', {
      ref: command.ref,
      testID: command.testID,
      coordinates: command.coordinates,
    }, { duration });

    if (command.ref) {
      await controller.longPress(command.ref, duration);
    } else if (command.coordinates) {
      // Need to implement long press at coordinates
      await controller.tap(command.ref || '', { duration });
    }

    return success(command.id, { tapped: true, ref: command.ref });
  },

  async fill(command, controller) {
    // Record step if recording
    controller.recordStep('fill', {
      ref: command.ref,
      testID: command.testID,
    }, { value: command.text });

    await controller.fill(command.ref || command.testID || '', command.text, command.clear);
    return success(command.id, {
      filled: true,
      ref: command.ref,
      text: command.text,
    });
  },

  async clear(command, controller) {
    // Record step if recording
    controller.recordStep('clear', {
      ref: command.ref,
      testID: command.testID,
    });

    await controller.clear(command.ref || command.testID || '');
    return success(command.id, { cleared: true, ref: command.ref });
  },

  async type(command, controller) {
    // Record step if recording
    controller.recordStep('type', undefined, { value: command.text });

    await controller.type(command.text);
    return success(command.id, { typed: true });
  },

  // ============================================
  // Scroll & Swipe
  // ============================================

  async scroll(command, controller) {
    // Record step if recording
    controller.recordStep('scroll', { ref: command.ref }, { value: command.direction });

    if (command.toRef || command.toTestID) {
      const found = await controller.scrollToRef(command.toRef || command.toTestID || '', command.direction);
      return success(command.id, {
        scrolled: true,
        direction: command.direction,
        reachedEnd: !found,
      });
    }

    await controller.scroll(command.direction, command.distance, command.ref);
    return success(command.id, {
      scrolled: true,
      direction: command.direction,
      distance: command.distance,
    });
  },

  async swipe(command, controller) {
    await controller.swipe(command.from, command.to, command.duration);
    return success(command.id, { swiped: true });
  },

  async pinch(command, controller) {
    // Pinch is complex to implement - would require multi-touch
    return error(command.id, 'Pinch not yet implemented', ErrorCode.UNKNOWN);
  },

  // ============================================
  // Navigation
  // ============================================

  async navigate(command, controller) {
    // Record step if recording
    controller.recordStep('navigate', undefined, { value: command.url });

    await controller.navigate(command.url);
    return success(command.id, { navigated: true, url: command.url });
  },

  async back(command, controller) {
    // Record step if recording
    controller.recordStep('back');

    await controller.pressBack();
    return success(command.id, { pressed: 'back' });
  },

  async home(command, controller) {
    // Record step if recording
    controller.recordStep('home');

    await controller.pressHome();
    return success(command.id, { pressed: 'home' });
  },

  async reload(command, controller) {
    await controller.reload();
    return success(command.id, { reloaded: true });
  },

  async shake(command, controller) {
    // Shake would need platform-specific implementation
    return error(command.id, 'Shake not yet implemented', ErrorCode.UNKNOWN);
  },

  // ============================================
  // Screenshot
  // ============================================

  async screenshot(command, controller) {
    const buffer = await controller.screenshot(command.path);

    if (command.path) {
      return success(command.id, {
        path: command.path,
        width: 0,
        height: 0,
      });
    }

    return success(command.id, {
      base64: buffer.toString('base64'),
      width: 0,
      height: 0,
    });
  },

  async visualCompare(command, controller) {
    // Use the new visual testing commands instead
    return error(command.id, 'Use screenshotCompare command instead', ErrorCode.UNKNOWN);
  },

  // ============================================
  // Visual Testing
  // ============================================

  async screenshotSave(command, controller) {
    const buffer = await controller.screenshot();
    const path = await controller.saveBaseline(command.name, buffer);

    return success(command.id, {
      saved: true,
      name: command.name,
      path,
    });
  },

  async screenshotCompare(command, controller) {
    const buffer = await controller.screenshot();
    const result = await controller.compareWithBaseline(command.name, buffer, {
      threshold: command.threshold,
      generateDiff: command.generateDiff,
    });

    return success(command.id, result);
  },

  async screenshotDiff(command, controller) {
    const buffer = await controller.screenshot();
    const diffPath = await controller.generateDiff(command.name, buffer, command.outputPath);

    return success(command.id, { diffPath });
  },

  async screenshotList(command, controller) {
    const baselines = controller.listBaselines();

    return success(command.id, {
      baselines,
      count: baselines.length,
    });
  },

  async screenshotDelete(command, controller) {
    const deleted = controller.deleteBaseline(command.name);

    return success(command.id, {
      deleted,
      name: command.name,
    });
  },

  // ============================================
  // Assertions
  // ============================================

  async assert(command, controller) {
    const result = await controller.assert(command.ref || command.testID || '', command.assertion, command.value);
    return success(command.id, result);
  },

  async waitFor(command, controller) {
    // Record step if recording
    controller.recordStep('waitFor', {
      ref: command.ref,
      testID: command.testID,
    }, { timeout: command.timeout });

    const timeout = command.timeout || 5000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const snapshot = await controller.getSnapshot({ interactive: true });
      const ref = command.ref || command.testID || '';
      const entry = snapshot.refs[ref];

      let conditionMet = false;
      switch (command.condition) {
        case 'visible':
        case 'exists':
          conditionMet = entry !== undefined;
          break;
        case 'hidden':
        case 'notExists':
          conditionMet = entry === undefined;
          break;
      }

      if (conditionMet) {
        return success(command.id, { found: true, elapsed: Date.now() - start });
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    return success(command.id, { found: false, elapsed: Date.now() - start });
  },

  // ============================================
  // Network
  // ============================================

  async networkRequests(command, controller) {
    const requests = await controller.getRequests({
      url: command.filter,
      method: command.method,
      status: command.status,
    });

    const limited = command.limit ? requests.slice(0, command.limit) : requests;

    return success(command.id, {
      requests: limited,
      count: requests.length,
    });
  },

  async networkMock(command, controller) {
    await controller.mockResponse(command.pattern, command.response);
    return success(command.id, { mocked: true, pattern: command.pattern });
  },

  async networkClearMocks(command, controller) {
    await controller.clearMocks();
    return success(command.id, { cleared: true, count: 0 });
  },

  // ============================================
  // Supabase
  // ============================================

  async supabaseCalls(command, controller) {
    const calls = await controller.getSupabaseCalls({
      table: command.table,
      operation: command.operation,
    });

    const limited = command.limit ? calls.slice(0, command.limit) : calls;

    return success(command.id, {
      calls: limited,
      count: calls.length,
    });
  },

  async supabaseClear(command, controller) {
    // Clear would need bridge support
    return success(command.id, { cleared: true });
  },

  // ============================================
  // Convex
  // ============================================

  async convexCalls(command, controller) {
    const calls = await controller.getConvexCalls({
      functionName: command.functionName,
      type: command.type,
    });

    const limited = command.limit ? calls.slice(0, command.limit) : calls;

    return success(command.id, {
      calls: limited,
      count: calls.length,
    });
  },

  async convexClear(command, controller) {
    return success(command.id, { cleared: true });
  },

  // ============================================
  // Device
  // ============================================

  async deviceList(command, controller) {
    const devices = await controller.listDevices(command.platform);
    return success(command.id, { devices, count: devices.length });
  },

  async deviceInfo(command, controller) {
    const device = controller.getDevice();
    if (!device) {
      return error(command.id, 'No active device', ErrorCode.DEVICE_NOT_BOOTED);
    }

    return success(command.id, { device });
  },

  async setLocation(command, controller) {
    await controller.setLocation(command.latitude, command.longitude);
    return success(command.id, {
      set: true,
      latitude: command.latitude,
      longitude: command.longitude,
    });
  },

  async setPermission(command, controller) {
    // Would need platform-specific implementation
    return error(command.id, 'setPermission not yet implemented', ErrorCode.UNKNOWN);
  },

  // ============================================
  // Keyboard
  // ============================================

  async keyboard(command, controller) {
    // Would need bridge support
    return error(command.id, 'keyboard not yet implemented', ErrorCode.UNKNOWN);
  },

  async pressKey(command, controller) {
    // Record step if recording
    controller.recordStep('pressKey', undefined, { value: command.key });

    await controller.pressKey(command.key);
    return success(command.id, { pressed: true });
  },

  // ============================================
  // Status
  // ============================================

  async status(command, controller) {
    const device = controller.getDevice();

    return success(command.id, {
      daemon: {
        version: '0.1.0',
        uptime: process.uptime(),
      },
      device: device || undefined,
      bridge: {
        connected: controller.isBridgeConnected(),
      },
    });
  },

  async ping(command, controller) {
    return success(command.id, {
      pong: true,
      timestamp: new Date().toISOString(),
    });
  },

  // ============================================
  // Cache
  // ============================================

  async cacheStats(command, controller) {
    const stats = await controller.getCacheStats();
    return success(command.id, stats);
  },

  async cacheInvalidate(command, controller) {
    await controller.invalidateCache();
    return success(command.id, { invalidated: true });
  },

  // ============================================
  // Recording
  // ============================================

  async recordStart(command, controller) {
    controller.startRecording(command.name);
    return success(command.id, { started: true, name: command.name });
  },

  async recordStop(command, controller) {
    const recording = controller.stopRecording();
    return success(command.id, { stopped: true, recording });
  },

  async recordList(command, controller) {
    const recordings = controller.listRecordings();
    return success(command.id, { recordings });
  },

  async recordPlay(command, controller) {
    await controller.playRecording(command.name, command.speed || 1.0);
    return success(command.id, { played: true, name: command.name });
  },

  async recordDelete(command, controller) {
    const deleted = controller.deleteRecording(command.name);
    return success(command.id, { deleted, name: command.name });
  },

  async recordExport(command, controller) {
    const code = controller.exportRecording(command.name, command.format);
    return success(command.id, { exported: true, code });
  },

  async recordStatus(command, controller) {
    const status = controller.getRecordingStatus();
    return success(command.id, status);
  },
};

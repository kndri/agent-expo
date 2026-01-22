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
} from '@agent-expo/protocol';
import { success, error, ErrorCode } from '@agent-expo/protocol';
import type { AppController } from '../app-controller.js';

type ActionHandler<C extends Command, D> = (
  command: C,
  controller: AppController
) => Promise<Response<D>>;

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
    return await handler(command as any, controller);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return error(command.id, message, ErrorCode.UNKNOWN);
  }
}

const handlers: Record<string, ActionHandler<any, any>> = {
  // ============================================
  // Lifecycle
  // ============================================

  async launch(command: any, controller: AppController): Promise<Response<LaunchResponseData>> {
    const device = await controller.launch({
      platform: command.platform,
      device: command.device,
      appPath: command.app,
      bundleId: command.bundleId,
      clearState: command.clearState,
    });

    return success(command.id, {
      launched: true,
      device,
      bundleId: command.bundleId,
    });
  },

  async terminate(command: any, controller: AppController): Promise<Response<TerminateResponseData>> {
    await controller.terminate();
    return success(command.id, { terminated: true });
  },

  async reinstall(command: any, controller: AppController): Promise<Response<{ reinstalled: true }>> {
    await controller.reinstall(command.app);
    return success(command.id, { reinstalled: true });
  },

  // ============================================
  // Snapshot
  // ============================================

  async snapshot(command: any, controller: AppController): Promise<Response<SnapshotResponseData>> {
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

  async tap(command: any, controller: AppController): Promise<Response<TapResponseData>> {
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

  async doubleTap(command: any, controller: AppController): Promise<Response<TapResponseData>> {
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

  async longPress(command: any, controller: AppController): Promise<Response<TapResponseData>> {
    const duration = command.duration || 500;

    if (command.ref) {
      await controller.longPress(command.ref, duration);
    } else if (command.coordinates) {
      // Need to implement long press at coordinates
      await controller.tap(command.ref || '', { duration });
    }

    return success(command.id, { tapped: true, ref: command.ref });
  },

  async fill(command: any, controller: AppController): Promise<Response<FillResponseData>> {
    await controller.fill(command.ref || command.testID, command.text, command.clear);
    return success(command.id, {
      filled: true,
      ref: command.ref,
      text: command.text,
    });
  },

  async clear(command: any, controller: AppController): Promise<Response<ClearResponseData>> {
    await controller.clear(command.ref || command.testID);
    return success(command.id, { cleared: true, ref: command.ref });
  },

  async type(command: any, controller: AppController): Promise<Response<{ typed: true }>> {
    await controller.type(command.text);
    return success(command.id, { typed: true });
  },

  // ============================================
  // Scroll & Swipe
  // ============================================

  async scroll(command: any, controller: AppController): Promise<Response<ScrollResponseData>> {
    if (command.toRef || command.toTestID) {
      const found = await controller.scrollToRef(command.toRef || command.toTestID, command.direction);
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

  async swipe(command: any, controller: AppController): Promise<Response<SwipeResponseData>> {
    await controller.swipe(command.from, command.to, command.duration);
    return success(command.id, { swiped: true });
  },

  async pinch(command: any, controller: AppController): Promise<Response<{ pinched: true }>> {
    // Pinch is complex to implement - would require multi-touch
    return error(command.id, 'Pinch not yet implemented', ErrorCode.UNKNOWN);
  },

  // ============================================
  // Navigation
  // ============================================

  async navigate(command: any, controller: AppController): Promise<Response<NavigateResponseData>> {
    await controller.navigate(command.url);
    return success(command.id, { navigated: true, url: command.url });
  },

  async back(command: any, controller: AppController): Promise<Response<BackResponseData>> {
    await controller.pressBack();
    return success(command.id, { pressed: 'back' });
  },

  async home(command: any, controller: AppController): Promise<Response<HomeResponseData>> {
    await controller.pressHome();
    return success(command.id, { pressed: 'home' });
  },

  async reload(command: any, controller: AppController): Promise<Response<{ reloaded: true }>> {
    await controller.reload();
    return success(command.id, { reloaded: true });
  },

  async shake(command: any, controller: AppController): Promise<Response<{ shook: true }>> {
    // Shake would need platform-specific implementation
    return error(command.id, 'Shake not yet implemented', ErrorCode.UNKNOWN);
  },

  // ============================================
  // Screenshot
  // ============================================

  async screenshot(command: any, controller: AppController): Promise<Response<ScreenshotResponseData>> {
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

  async visualCompare(command: any, controller: AppController): Promise<Response<any>> {
    // Use the new visual testing commands instead
    return error(command.id, 'Use screenshotCompare command instead', ErrorCode.UNKNOWN);
  },

  // ============================================
  // Visual Testing
  // ============================================

  async screenshotSave(command: any, controller: AppController): Promise<Response<ScreenshotSaveResponseData>> {
    const buffer = await controller.screenshot();
    const path = await controller.saveBaseline(command.name, buffer);

    return success(command.id, {
      saved: true,
      name: command.name,
      path,
    });
  },

  async screenshotCompare(command: any, controller: AppController): Promise<Response<ScreenshotCompareResponseData>> {
    const buffer = await controller.screenshot();
    const result = await controller.compareWithBaseline(command.name, buffer, {
      threshold: command.threshold,
      generateDiff: command.generateDiff,
    });

    return success(command.id, result);
  },

  async screenshotDiff(command: any, controller: AppController): Promise<Response<ScreenshotDiffResponseData>> {
    const buffer = await controller.screenshot();
    const diffPath = await controller.generateDiff(command.name, buffer, command.outputPath);

    return success(command.id, { diffPath });
  },

  async screenshotList(command: any, controller: AppController): Promise<Response<ScreenshotListResponseData>> {
    const baselines = controller.listBaselines();

    return success(command.id, {
      baselines,
      count: baselines.length,
    });
  },

  async screenshotDelete(command: any, controller: AppController): Promise<Response<ScreenshotDeleteResponseData>> {
    const deleted = controller.deleteBaseline(command.name);

    return success(command.id, {
      deleted,
      name: command.name,
    });
  },

  // ============================================
  // Assertions
  // ============================================

  async assert(command: any, controller: AppController): Promise<Response<AssertResponseData>> {
    const result = await controller.assert(command.ref || command.testID, command.assertion, command.value);
    return success(command.id, result);
  },

  async waitFor(command: any, controller: AppController): Promise<Response<{ found: boolean; elapsed: number }>> {
    const timeout = command.timeout || 5000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const snapshot = await controller.getSnapshot({ interactive: true });
      const entry = snapshot.refs[command.ref];

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

  async networkRequests(command: any, controller: AppController): Promise<Response<NetworkRequestsResponseData>> {
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

  async networkMock(command: any, controller: AppController): Promise<Response<NetworkMockResponseData>> {
    await controller.mockResponse(command.pattern, command.response);
    return success(command.id, { mocked: true, pattern: command.pattern });
  },

  async networkClearMocks(command: any, controller: AppController): Promise<Response<NetworkClearMocksResponseData>> {
    await controller.clearMocks();
    return success(command.id, { cleared: true, count: 0 });
  },

  // ============================================
  // Supabase
  // ============================================

  async supabaseCalls(command: any, controller: AppController): Promise<Response<SupabaseCallsResponseData>> {
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

  async supabaseClear(command: any, controller: AppController): Promise<Response<{ cleared: true }>> {
    // Clear would need bridge support
    return success(command.id, { cleared: true });
  },

  // ============================================
  // Convex
  // ============================================

  async convexCalls(command: any, controller: AppController): Promise<Response<ConvexCallsResponseData>> {
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

  async convexClear(command: any, controller: AppController): Promise<Response<{ cleared: true }>> {
    return success(command.id, { cleared: true });
  },

  // ============================================
  // Device
  // ============================================

  async deviceList(command: any, controller: AppController): Promise<Response<DeviceListResponseData>> {
    const devices = await controller.listDevices(command.platform);
    return success(command.id, { devices, count: devices.length });
  },

  async deviceInfo(command: any, controller: AppController): Promise<Response<DeviceInfoResponseData>> {
    const device = controller.getDevice();
    if (!device) {
      return error(command.id, 'No active device', ErrorCode.DEVICE_NOT_BOOTED);
    }

    return success(command.id, { device });
  },

  async setLocation(command: any, controller: AppController): Promise<Response<SetLocationResponseData>> {
    await controller.setLocation(command.latitude, command.longitude);
    return success(command.id, {
      set: true,
      latitude: command.latitude,
      longitude: command.longitude,
    });
  },

  async setPermission(command: any, controller: AppController): Promise<Response<any>> {
    // Would need platform-specific implementation
    return error(command.id, 'setPermission not yet implemented', ErrorCode.UNKNOWN);
  },

  // ============================================
  // Keyboard
  // ============================================

  async keyboard(command: any, controller: AppController): Promise<Response<any>> {
    // Would need bridge support
    return error(command.id, 'keyboard not yet implemented', ErrorCode.UNKNOWN);
  },

  async pressKey(command: any, controller: AppController): Promise<Response<{ pressed: true }>> {
    await controller.pressKey(command.key);
    return success(command.id, { pressed: true });
  },

  // ============================================
  // Status
  // ============================================

  async status(command: any, controller: AppController): Promise<Response<StatusResponseData>> {
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

  async ping(command: any, controller: AppController): Promise<Response<PingResponseData>> {
    return success(command.id, {
      pong: true,
      timestamp: new Date().toISOString(),
    });
  },
};

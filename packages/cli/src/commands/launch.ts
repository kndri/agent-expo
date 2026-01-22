/**
 * Launch command
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import type { LaunchCommandType } from '@agent-expo/protocol';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerLaunchCommand(program: Commander, client: DaemonClient, options: OutputOptions): void {
  program
    .command('launch')
    .description('Launch a device and optionally an app')
    .requiredOption('-p, --platform <platform>', 'Platform: ios or android')
    .option('-d, --device <device>', 'Device ID or name')
    .option('-a, --app <path>', 'Path to .app or .apk file')
    .option('-b, --bundle-id <bundleId>', 'App bundle ID / package name')
    .option('--clear', 'Clear app state before launching')
    .option('--headless', 'Run simulator/emulator without visible window (for CI/CD)')
    .action(async (opts) => {
      // Support AGENT_EXPO_HEADLESS env var
      const headless = opts.headless || process.env.AGENT_EXPO_HEADLESS === '1';

      const command: LaunchCommandType = {
        id: uuid(),
        action: 'launch',
        platform: opts.platform,
        device: opts.device,
        app: opts.app,
        bundleId: opts.bundleId,
        clearState: opts.clear,
        headless,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });
}

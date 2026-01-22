/**
 * Screenshot commands
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import type {
  ScreenshotSaveResponseData,
  ScreenshotCompareResponseData,
  ScreenshotDiffResponseData,
  ScreenshotListResponseData,
  ScreenshotDeleteResponseData,
} from '@agent-expo/protocol';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerScreenshotCommands(program: Commander, client: DaemonClient, options: OutputOptions): void {
  const screenshot = program
    .command('screenshot')
    .description('Screenshot and visual testing commands');

  // Take a screenshot
  screenshot
    .command('take')
    .description('Take a screenshot')
    .option('--path <path>', 'Save to file path')
    .option('--element <ref>', 'Capture specific element')
    .option('--format <format>', 'Image format (png, jpeg)', 'png')
    .option('--quality <quality>', 'JPEG quality (0-100)', parseInt)
    .action(async (opts) => {
      const command = {
        id: uuid(),
        action: 'screenshot',
        path: opts.path,
        element: opts.element,
        format: opts.format,
        quality: opts.quality,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Save screenshot as baseline
  screenshot
    .command('save <name>')
    .description('Save current screenshot as baseline for visual comparison')
    .action(async (name) => {
      const command = {
        id: uuid(),
        action: 'screenshotSave',
        name,
      };

      const response = await client.send(command);

      if (response.success) {
        const data = response.data as ScreenshotSaveResponseData;
        console.log(`Baseline saved: ${name}`);
        console.log(`Path: ${data.path}`);
      } else {
        console.error(`Error: ${response.error}`);
        process.exit(1);
      }
    });

  // Compare screenshot with baseline
  screenshot
    .command('compare <name>')
    .description('Compare current screenshot with saved baseline')
    .option('--threshold <percent>', 'Match percentage required (0-100)', parseFloat, 95)
    .option('--diff', 'Generate diff image if mismatch')
    .action(async (name, opts) => {
      const command = {
        id: uuid(),
        action: 'screenshotCompare',
        name,
        threshold: opts.threshold,
        generateDiff: opts.diff,
      };

      const response = await client.send(command);

      if (response.success) {
        const data = response.data as ScreenshotCompareResponseData;
        const status = data.matched ? 'PASS' : 'FAIL';
        console.log(`Match: ${data.matchPercentage}% (threshold: ${data.threshold}%) - ${status}`);

        if (data.diffPath) {
          console.log(`Diff image: ${data.diffPath}`);
        }

        if (!data.matched) {
          process.exit(1);
        }
      } else {
        console.error(`Error: ${response.error}`);
        process.exit(1);
      }
    });

  // Generate diff image
  screenshot
    .command('diff <name>')
    .description('Generate visual diff between current screenshot and baseline')
    .option('--output <path>', 'Output path for diff image')
    .action(async (name, opts) => {
      const command = {
        id: uuid(),
        action: 'screenshotDiff',
        name,
        outputPath: opts.output,
      };

      const response = await client.send(command);

      if (response.success) {
        const data = response.data as ScreenshotDiffResponseData;
        console.log(`Diff image saved: ${data.diffPath}`);
      } else {
        console.error(`Error: ${response.error}`);
        process.exit(1);
      }
    });

  // List baselines
  screenshot
    .command('list')
    .description('List saved screenshot baselines')
    .action(async () => {
      const command = {
        id: uuid(),
        action: 'screenshotList',
      };

      const response = await client.send(command);

      if (response.success) {
        const data = response.data as ScreenshotListResponseData;
        if (data.baselines.length === 0) {
          console.log('No baselines saved yet.');
        } else {
          console.log(`Saved baselines (${data.baselines.length}):`);
          for (const name of data.baselines) {
            console.log(`  - ${name}`);
          }
        }
      } else {
        console.error(`Error: ${response.error}`);
        process.exit(1);
      }
    });

  // Delete baseline
  screenshot
    .command('delete <name>')
    .description('Delete a saved baseline')
    .action(async (name) => {
      const command = {
        id: uuid(),
        action: 'screenshotDelete',
        name,
      };

      const response = await client.send(command);

      if (response.success) {
        const data = response.data as ScreenshotDeleteResponseData;
        if (data.deleted) {
          console.log(`Baseline deleted: ${name}`);
        } else {
          console.log(`Baseline not found: ${name}`);
        }
      } else {
        console.error(`Error: ${response.error}`);
        process.exit(1);
      }
    });
}

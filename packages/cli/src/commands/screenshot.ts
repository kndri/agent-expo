/**
 * Screenshot commands
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerScreenshotCommands(program: Commander, client: DaemonClient, options: OutputOptions): void {
  program
    .command('screenshot')
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
}

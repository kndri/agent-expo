/**
 * Snapshot command
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import type { SnapshotCommand } from '@agent-expo/protocol';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerSnapshotCommand(program: Commander, client: DaemonClient, options: OutputOptions): void {
  program
    .command('snapshot')
    .description('Get the accessibility tree snapshot')
    .option('-i, --interactive', 'Only include interactive elements')
    .option('-c, --compact', 'Compact output')
    .option('--max-depth <depth>', 'Maximum tree depth', parseInt)
    .option('--with-screenshot', 'Include base64 screenshot')
    .action(async (opts) => {
      const command: SnapshotCommand = {
        id: uuid(),
        action: 'snapshot',
        interactive: opts.interactive,
        compact: opts.compact,
        maxDepth: opts.maxDepth,
        withScreenshot: opts.withScreenshot,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });
}

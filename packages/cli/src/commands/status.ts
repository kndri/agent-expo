/**
 * Status commands
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerStatusCommands(program: Commander, client: DaemonClient, options: OutputOptions): void {
  program
    .command('status')
    .description('Get daemon and device status')
    .action(async () => {
      const command = {
        id: uuid(),
        action: 'status',
      };

      const response = await client.send(command);
      printResponse(response, options);
    });

  program
    .command('ping')
    .description('Ping the daemon')
    .action(async () => {
      const command = {
        id: uuid(),
        action: 'ping',
      };

      const response = await client.send(command);
      printResponse(response, options);
    });

  program
    .command('devices')
    .description('List available devices')
    .option('-p, --platform <platform>', 'Filter by platform (ios, android)')
    .action(async (opts) => {
      const command = {
        id: uuid(),
        action: 'deviceList',
        platform: opts.platform,
      };

      const response = await client.send(command);
      printResponse(response, options);
    });

  program
    .command('terminate')
    .description('Terminate the current app')
    .action(async () => {
      const command = {
        id: uuid(),
        action: 'terminate',
      };

      const response = await client.send(command);
      printResponse(response, options);
    });
}

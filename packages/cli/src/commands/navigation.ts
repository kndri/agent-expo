/**
 * Navigation commands
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerNavigationCommands(program: Commander, client: DaemonClient, options: OutputOptions): void {
  // Navigate (deep link)
  program
    .command('navigate <url>')
    .description('Open a deep link URL')
    .action(async (url) => {
      const command = {
        id: uuid(),
        action: 'navigate',
        url,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Back
  program
    .command('back')
    .description('Press the back button (Android only)')
    .action(async () => {
      const command = {
        id: uuid(),
        action: 'back',
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Home
  program
    .command('home')
    .description('Press the home button')
    .action(async () => {
      const command = {
        id: uuid(),
        action: 'home',
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Reload
  program
    .command('reload')
    .description('Reload the app')
    .action(async () => {
      const command = {
        id: uuid(),
        action: 'reload',
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });
}

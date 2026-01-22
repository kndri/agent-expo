/**
 * Cache commands
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import type { CacheStatsCommandType, CacheInvalidateCommandType } from '@agent-expo/protocol';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerCacheCommands(program: Commander, client: DaemonClient, options: OutputOptions): void {
  program
    .command('cache-stats')
    .description('Get snapshot cache statistics')
    .action(async () => {
      const command: CacheStatsCommandType = {
        id: uuid(),
        action: 'cacheStats',
      };

      const response = await client.send(command);
      printResponse(response, options);
    });

  program
    .command('cache-invalidate')
    .description('Invalidate the snapshot cache')
    .action(async () => {
      const command: CacheInvalidateCommandType = {
        id: uuid(),
        action: 'cacheInvalidate',
      };

      const response = await client.send(command);
      printResponse(response, options);
    });
}

/**
 * Assertion commands
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerAssertCommands(program: Commander, client: DaemonClient, options: OutputOptions): void {
  program
    .command('assert <ref> <assertion>')
    .description('Assert something about an element (visible, hidden, enabled, disabled, exists, hasText)')
    .option('--value <value>', 'Expected value (for hasText, hasValue)')
    .option('--timeout <ms>', 'Wait timeout in ms', parseInt)
    .action(async (ref, assertion, opts) => {
      const command = {
        id: uuid(),
        action: 'assert' as const,
        ref,
        assertion: assertion as 'visible' | 'hidden' | 'exists' | 'notExists' | 'enabled' | 'disabled' | 'hasText' | 'hasValue' | 'checked' | 'unchecked',
        value: opts.value,
        timeout: opts.timeout,
      };

      const response = await client.send(command);
      printResponse(response, options);

      // Exit with error code if assertion failed
      if (!response.success || (response.data as any)?.passed === false) {
        process.exit(1);
      }
    });

  program
    .command('wait-for <ref> <condition>')
    .description('Wait for an element to meet a condition (visible, hidden, exists, notExists)')
    .option('--timeout <ms>', 'Timeout in ms', parseInt, 5000)
    .action(async (ref, condition, opts) => {
      const command = {
        id: uuid(),
        action: 'waitFor' as const,
        ref,
        condition: condition as 'visible' | 'hidden' | 'exists' | 'notExists',
        timeout: opts.timeout,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success || (response.data as any)?.found === false) {
        process.exit(1);
      }
    });
}

/**
 * Network commands
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerNetworkCommands(program: Commander, client: DaemonClient, options: OutputOptions): void {
  const network = program
    .command('network')
    .description('Network request commands');

  // Get requests
  network
    .command('requests')
    .description('Get logged network requests')
    .option('--filter <pattern>', 'URL pattern to filter')
    .option('--method <method>', 'HTTP method filter')
    .option('--status <status>', 'Status code filter', parseInt)
    .option('--limit <n>', 'Limit results', parseInt)
    .action(async (opts) => {
      const command = {
        id: uuid(),
        action: 'networkRequests',
        filter: opts.filter,
        method: opts.method,
        status: opts.status,
        limit: opts.limit,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Mock response
  network
    .command('mock <pattern>')
    .description('Mock a network response')
    .option('--status <status>', 'Response status code', parseInt, 200)
    .option('--body <json>', 'Response body (JSON string)')
    .option('--delay <ms>', 'Response delay in ms', parseInt)
    .action(async (pattern, opts) => {
      let body: unknown;
      if (opts.body) {
        try {
          body = JSON.parse(opts.body);
        } catch {
          body = opts.body;
        }
      }

      const command = {
        id: uuid(),
        action: 'networkMock',
        pattern,
        response: {
          status: opts.status,
          body,
          delay: opts.delay,
        },
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Clear mocks
  network
    .command('clear-mocks')
    .description('Clear all network mocks')
    .action(async () => {
      const command = {
        id: uuid(),
        action: 'networkClearMocks',
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Supabase commands
  const supabase = program
    .command('supabase')
    .description('Supabase API call tracking');

  supabase
    .command('calls')
    .description('Get logged Supabase calls')
    .option('--table <table>', 'Table name filter')
    .option('--operation <op>', 'Operation filter (select, insert, update, delete)')
    .option('--limit <n>', 'Limit results', parseInt)
    .action(async (opts) => {
      const command = {
        id: uuid(),
        action: 'supabaseCalls',
        table: opts.table,
        operation: opts.operation,
        limit: opts.limit,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Convex commands
  const convex = program
    .command('convex')
    .description('Convex API call tracking');

  convex
    .command('calls')
    .description('Get logged Convex calls')
    .option('--function <name>', 'Function name filter')
    .option('--type <type>', 'Type filter (query, mutation, action)')
    .option('--limit <n>', 'Limit results', parseInt)
    .action(async (opts) => {
      const command = {
        id: uuid(),
        action: 'convexCalls',
        functionName: opts.function,
        type: opts.type,
        limit: opts.limit,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });
}

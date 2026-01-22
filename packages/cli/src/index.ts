/**
 * @agent-expo/cli
 *
 * Command-line interface for agent-expo
 */

import { Command } from 'commander';
import { logger, parseLogLevel } from '@agent-expo/protocol';
import { DaemonClient } from './daemon-client.js';
import { registerLaunchCommand } from './commands/launch.js';
import { registerSnapshotCommand } from './commands/snapshot.js';
import { registerInteractionCommands } from './commands/interaction.js';
import { registerNavigationCommands } from './commands/navigation.js';
import { registerNetworkCommands } from './commands/network.js';
import { registerAssertCommands } from './commands/assert.js';
import { registerScreenshotCommands } from './commands/screenshot.js';
import { registerStatusCommands } from './commands/status.js';
import { handleError, type OutputOptions } from './output.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('agent-expo')
    .description('AI-powered automation for React Native and Expo applications')
    .version('0.1.0')
    .option('--json', 'Output in JSON format')
    .option('--silent', 'Suppress output')
    .option('--session <name>', 'Session name for isolated instances', 'default')
    .option('--log-level <level>', 'Log level (silent, error, warn, info, debug, trace)', 'info');

  return program;
}

export async function runCLI(args: string[] = process.argv): Promise<void> {
  const program = createCLI();

  // Get session from environment or default
  const session = process.env.AGENT_EXPO_SESSION || 'default';
  const client = new DaemonClient(session);

  // Default output options (will be updated after parsing)
  const outputOptions: OutputOptions = {
    json: false,
    silent: false,
  };

  // Register all commands first
  registerLaunchCommand(program, client, outputOptions);
  registerSnapshotCommand(program, client, outputOptions);
  registerInteractionCommands(program, client, outputOptions);
  registerNavigationCommands(program, client, outputOptions);
  registerNetworkCommands(program, client, outputOptions);
  registerAssertCommands(program, client, outputOptions);
  registerScreenshotCommands(program, client, outputOptions);
  registerStatusCommands(program, client, outputOptions);

  // Add hook to update output options and log level after parsing
  program.hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    outputOptions.json = opts.json || false;
    outputOptions.silent = opts.silent || false;

    // Set log level from CLI option or environment variable
    const logLevel = opts.logLevel || process.env.AGENT_EXPO_LOG_LEVEL || 'info';
    logger.setLevel(parseLogLevel(logLevel));
  });

  // Disconnect client after each command to allow process to exit
  program.hook('postAction', () => {
    client.disconnect();
  });

  // Configure error handling
  program.configureOutput({
    writeErr: (str) => process.stderr.write(str),
    outputError: (str, write) => write(str),
  });

  // Parse and execute
  try {
    await program.parseAsync(args, { from: 'node' });
  } catch (error) {
    handleError(error);
  }
}

export { DaemonClient } from './daemon-client.js';
export type { OutputOptions } from './output.js';

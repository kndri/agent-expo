/**
 * Output formatting utilities
 */

import chalk from 'chalk';
import { isAgentExpoError, type AgentExpoError, type Response } from '@agent-expo/protocol';

export interface OutputOptions {
  json: boolean;
  silent: boolean;
}

/**
 * Format and print a response
 */
export function printResponse(response: Response<unknown>, options: OutputOptions): void {
  if (options.silent) {
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(response, null, 2));
    return;
  }

  if (response.success) {
    printSuccess(response.data);
  } else {
    printError(response.error);
  }
}

/**
 * Print success data in human-readable format
 */
function printSuccess(data: unknown): void {
  if (data === null || data === undefined) {
    return;
  }

  if (typeof data === 'object') {
    // Special formatting for known response types
    const obj = data as Record<string, unknown>;

    // Snapshot response
    if ('tree' in obj && 'refs' in obj) {
      console.log(obj.tree);
      return;
    }

    // Device list
    if ('devices' in obj && Array.isArray(obj.devices)) {
      for (const device of obj.devices as any[]) {
        const status = device.state === 'booted' ? '●' : '○';
        console.log(`${status} ${device.name} (${device.id}) - ${device.platform} ${device.osVersion}`);
      }
      return;
    }

    // Network requests
    if ('requests' in obj && Array.isArray(obj.requests)) {
      for (const req of obj.requests as any[]) {
        const status = req.response?.status || '---';
        const duration = req.response?.duration ? `${req.response.duration}ms` : '---';
        console.log(`${req.request.method} ${req.request.url} → ${status} (${duration})`);
      }
      return;
    }

    // Screenshot
    if ('base64' in obj) {
      console.log(`Screenshot captured (${(obj.base64 as string).length} bytes base64)`);
      return;
    }

    if ('path' in obj) {
      console.log(`Screenshot saved to ${obj.path}`);
      return;
    }

    // Assertion result
    if ('passed' in obj && 'message' in obj) {
      const symbol = obj.passed ? '✓' : '✗';
      console.log(`${symbol} ${obj.message}`);
      return;
    }

    // Generic success
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(String(data));
  }
}

/**
 * Print error message
 */
function printError(message: string): void {
  console.error(chalk.red(`Error: ${message}`));
}

/**
 * Print an AgentExpoError with full formatting
 */
export function printAgentError(error: AgentExpoError): void {
  console.error(chalk.red(`\n[${error.code}] ${error.message}`));
  console.error(chalk.yellow(`\nHint: ${error.hint}`));
  if (error.docs) {
    console.error(chalk.blue(`\nDocs: ${error.docs}`));
  }
  console.error(''); // Empty line for readability
}

/**
 * Handle errors in CLI commands
 */
export function handleError(error: unknown): void {
  if (isAgentExpoError(error)) {
    printAgentError(error);
  } else if (error instanceof Error) {
    console.error(chalk.red(`Error: ${error.message}`));
  } else {
    console.error(chalk.red(`Error: ${String(error)}`));
  }
  process.exit(1);
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(message);
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  console.warn(`Warning: ${message}`);
}

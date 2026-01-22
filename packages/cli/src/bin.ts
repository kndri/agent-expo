#!/usr/bin/env node

/**
 * agent-expo CLI entry point
 */

import { logger, parseLogLevel } from '@agent-expo/protocol';
import { runCLI } from './index.js';

// Configure log level from env (will be overridden by CLI flag if provided)
const envLevel = process.env.AGENT_EXPO_LOG_LEVEL;
if (envLevel) {
  logger.setLevel(parseLogLevel(envLevel));
}

const log = logger.child('cli');

runCLI().catch((err) => {
  log.error('Error:', err.message);
  process.exit(1);
});

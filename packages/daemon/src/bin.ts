#!/usr/bin/env node

/**
 * agent-expo-daemon
 *
 * Entry point for running the daemon as a standalone process.
 */

import { logger, parseLogLevel } from '@agent-expo/protocol';
import { startDaemon } from './daemon.js';

// Configure log level from env
const envLevel = process.env.AGENT_EXPO_LOG_LEVEL;
if (envLevel) {
  logger.setLevel(parseLogLevel(envLevel));
}

const log = logger.child('daemon');
const PORT = process.env.AGENT_EXPO_PORT ? parseInt(process.env.AGENT_EXPO_PORT, 10) : undefined;

startDaemon({ port: PORT }).catch((err) => {
  log.error('Failed to start daemon:', err);
  process.exit(1);
});

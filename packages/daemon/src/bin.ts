#!/usr/bin/env node

/**
 * agent-expo-daemon
 *
 * Entry point for running the daemon as a standalone process.
 */

import { startDaemon } from './daemon.js';

const PORT = process.env.AGENT_EXPO_PORT ? parseInt(process.env.AGENT_EXPO_PORT, 10) : undefined;

startDaemon({ port: PORT }).catch((err) => {
  console.error('Failed to start daemon:', err);
  process.exit(1);
});

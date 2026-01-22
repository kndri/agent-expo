#!/usr/bin/env node

/**
 * agent-expo CLI entry point
 */

import { runCLI } from './index.js';

runCLI().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

/**
 * Daemon Starter
 *
 * Utilities for starting and managing the daemon process.
 */

import { spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { Errors, logger } from '@agent-expo/protocol';

const log = logger.child('starter');

const DEFAULT_PORT = 9876;

export interface DaemonStartOptions {
  /** How long to wait for daemon to start (ms) */
  timeout?: number;
  /** Custom path to daemon executable */
  daemonPath?: string;
  /** Custom log file path */
  logFile?: string;
  /** Session name */
  session?: string;
  /** Port for TCP connection (Windows) */
  port?: number;
}

/**
 * Start the daemon process.
 */
export async function startDaemon(options: DaemonStartOptions = {}): Promise<void> {
  const timeout = options.timeout ?? 10000;
  const session = options.session ?? 'default';

  // Check if already running
  if (await isDaemonRunning(session, options.port)) {
    log.debug('Daemon already running');
    return;
  }

  // Find daemon executable
  const daemonPath = options.daemonPath ?? findDaemonPath();
  if (!daemonPath) {
    throw Errors.DAEMON_NOT_FOUND();
  }

  log.debug(`Starting daemon from ${daemonPath}`);

  // Ensure log directory exists
  const logFile = options.logFile ?? getDefaultLogPath();
  const logDir = path.dirname(logFile);
  fs.mkdirSync(logDir, { recursive: true });

  // Open log file for daemon output
  const out = fs.openSync(logFile, 'a');
  const err = fs.openSync(logFile, 'a');

  // Spawn daemon as detached process
  const isWindows = os.platform() === 'win32';
  const daemon = spawn('node', [daemonPath], {
    detached: true,
    stdio: ['ignore', out, err],
    shell: isWindows, // Use shell on Windows for better compatibility
    windowsHide: true, // Hide the console window on Windows
    env: {
      ...process.env,
      AGENT_EXPO_DAEMON: '1',
      AGENT_EXPO_SESSION: session,
    },
  });

  // Unref to allow parent to exit
  daemon.unref();

  log.debug(`Daemon spawned with PID ${daemon.pid}`);

  // Wait for daemon to be ready
  await waitForDaemon(session, timeout, options.port);
}

/**
 * Check if daemon is running.
 */
export async function isDaemonRunning(
  session: string = 'default',
  port?: number
): Promise<boolean> {
  return new Promise((resolve) => {
    let socket: net.Socket;

    if (os.platform() === 'win32') {
      // Always use TCP on Windows
      socket = net.createConnection({ port: port || DEFAULT_PORT, host: '127.0.0.1' });
    } else {
      const socketPath = getSocketPath(session);
      if (!fs.existsSync(socketPath)) {
        resolve(false);
        return;
      }
      socket = net.createConnection(socketPath);
    }

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 1000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      socket.end();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

/**
 * Wait for daemon to become available.
 */
async function waitForDaemon(
  session: string,
  timeout: number,
  port?: number
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await isDaemonRunning(session, port)) {
      log.debug('Daemon is ready');
      return;
    }
    await sleep(100);
  }

  throw Errors.DAEMON_START_TIMEOUT(timeout);
}

/**
 * Find the daemon executable path.
 */
function findDaemonPath(): string | null {
  const locations = [
    // Local node_modules (most common for monorepo or npm install)
    path.join(process.cwd(), 'node_modules', '@agent-expo', 'daemon', 'dist', 'bin.js'),
    // Relative to SDK (for monorepo setup)
    path.join(__dirname, '..', '..', 'daemon', 'dist', 'bin.js'),
    // Global pnpm/npm
    path.join(__dirname, '..', '..', '..', 'daemon', 'dist', 'bin.js'),
  ];

  for (const loc of locations) {
    const resolved = path.resolve(loc);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}

/**
 * Get the default log file path.
 */
function getDefaultLogPath(): string {
  const homeDir = os.homedir();
  const logDir = path.join(homeDir, '.agent-expo');
  return path.join(logDir, 'daemon.log');
}

/**
 * Get the socket path for a session.
 */
function getSocketPath(session: string): string {
  const tmpDir = os.tmpdir();
  return path.join(tmpDir, `agent-expo-${session}.sock`);
}

/**
 * Sleep helper.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stop the daemon (sends shutdown command via socket).
 */
export async function stopDaemon(
  session: string = 'default',
  port?: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    let socket: net.Socket;

    if (os.platform() === 'win32') {
      // Always use TCP on Windows
      socket = net.createConnection({ port: port || DEFAULT_PORT, host: '127.0.0.1' });
    } else {
      const socketPath = getSocketPath(session);
      if (!fs.existsSync(socketPath)) {
        resolve(); // Already stopped
        return;
      }
      socket = net.createConnection(socketPath);
    }

    socket.on('connect', () => {
      // Send shutdown command
      socket.write(JSON.stringify({ action: 'shutdown' }) + '\n');
      socket.end();
      resolve();
    });

    socket.on('error', (err) => {
      // If can't connect, daemon is already stopped
      resolve();
    });
  });
}

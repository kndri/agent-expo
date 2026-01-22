/**
 * DaemonClient
 *
 * Connects to the agent-expo daemon and sends commands.
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';
import type { Response } from '@agent-expo/protocol';
import { parseResponse } from '@agent-expo/protocol';

const DEFAULT_PORT = 9876;
const CONNECTION_TIMEOUT = 5000;
const REQUEST_TIMEOUT = 60000;

export class DaemonClient {
  private socket: net.Socket | null = null;
  private session: string;
  private responseBuffer: string = '';
  private pendingResolve: ((response: Response<unknown>) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;

  constructor(session: string = 'default') {
    this.session = session;
  }

  /**
   * Get the socket path for the current session
   */
  private getSocketPath(): string {
    const tmpDir = os.tmpdir();
    return path.join(tmpDir, `agent-expo-${this.session}.sock`);
  }

  /**
   * Get the PID file path
   */
  private getPidPath(): string {
    const tmpDir = os.tmpdir();
    return path.join(tmpDir, `agent-expo-${this.session}.pid`);
  }

  /**
   * Check if daemon is running
   */
  isDaemonRunning(): boolean {
    const pidPath = this.getPidPath();
    if (!fs.existsSync(pidPath)) {
      return false;
    }

    const pid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Start the daemon if not running
   */
  async ensureDaemon(): Promise<void> {
    if (this.isDaemonRunning()) {
      return;
    }

    // Start daemon in background
    const daemonPath = this.findDaemonScript();

    const child = spawn('node', [daemonPath], {
      detached: true,
      stdio: 'ignore',
      env: {
        ...process.env,
        AGENT_EXPO_SESSION: this.session,
        AGENT_EXPO_DAEMON: '1',
      },
    });

    child.unref();

    // Wait for daemon to start
    const maxWait = 10000;
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      if (this.isDaemonRunning()) {
        // Give it a moment to start listening
        await this.sleep(500);
        return;
      }
      await this.sleep(200);
    }

    throw new Error('Failed to start daemon');
  }

  /**
   * Find the daemon script path
   */
  private findDaemonScript(): string {
    // Try development path first (monorepo structure)
    const devPath = path.join(__dirname, '../../daemon/dist/bin.js');
    if (fs.existsSync(devPath)) {
      return devPath;
    }

    // Try to resolve from node_modules
    try {
      return require.resolve('@agent-expo/daemon/dist/bin.js');
    } catch {
      // Not found in node_modules
    }

    throw new Error('Could not find daemon script. Make sure @agent-expo/daemon is installed.');
  }

  /**
   * Connect to the daemon
   */
  async connect(): Promise<void> {
    if (this.socket) {
      return;
    }

    await this.ensureDaemon();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONNECTION_TIMEOUT);

      if (os.platform() === 'win32') {
        // TCP connection on Windows
        this.socket = net.createConnection({ port: DEFAULT_PORT, host: '127.0.0.1' });
      } else {
        // Unix socket on macOS/Linux
        const socketPath = this.getSocketPath();
        this.socket = net.createConnection({ path: socketPath });
      }

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.setupListeners();
        resolve();
      });

      this.socket.on('error', (err) => {
        clearTimeout(timeout);
        this.socket = null;
        reject(err);
      });
    });
  }

  /**
   * Setup socket listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('data', (data) => {
      this.responseBuffer += data.toString();

      // Process complete lines
      const lines = this.responseBuffer.split('\n');
      this.responseBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = parseResponse(line);
          if (this.pendingResolve) {
            this.pendingResolve(response);
            this.pendingResolve = null;
            this.pendingReject = null;
          }
        } catch (e) {
          if (this.pendingReject) {
            this.pendingReject(new Error('Invalid response from daemon'));
            this.pendingResolve = null;
            this.pendingReject = null;
          }
        }
      }
    });

    this.socket.on('close', () => {
      this.socket = null;
      if (this.pendingReject) {
        this.pendingReject(new Error('Connection closed'));
        this.pendingResolve = null;
        this.pendingReject = null;
      }
    });

    this.socket.on('error', (err) => {
      if (this.pendingReject) {
        this.pendingReject(err);
        this.pendingResolve = null;
        this.pendingReject = null;
      }
    });
  }

  /**
   * Send a command and wait for response
   */
  async send<T>(command: Record<string, unknown>): Promise<Response<T>> {
    await this.connect();

    if (!this.socket) {
      throw new Error('Not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResolve = null;
        this.pendingReject = null;
        reject(new Error('Request timeout'));
      }, REQUEST_TIMEOUT);

      this.pendingResolve = (response) => {
        clearTimeout(timeout);
        resolve(response as Response<T>);
      };

      this.pendingReject = (error) => {
        clearTimeout(timeout);
        reject(error);
      };

      const json = JSON.stringify(command) + '\n';
      this.socket!.write(json);
    });
  }

  /**
   * Disconnect from daemon
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

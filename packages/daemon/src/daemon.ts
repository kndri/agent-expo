/**
 * Daemon Server
 *
 * Unix socket / TCP server that accepts commands and executes them.
 * Also runs a WebSocket server for bridge connections from React Native apps.
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseCommand, serializeResponse, error, ErrorCode, logger } from '@agent-expo/protocol';
import { AppController } from './app-controller.js';
import { executeCommand } from './actions/index.js';
import { BridgeServer } from './bridge/server.js';

const log = logger.child('daemon');

const DEFAULT_PORT = 9876;
const DEFAULT_BRIDGE_PORT = 8765;
const SESSION_NAME = process.env.AGENT_EXPO_SESSION || 'default';

interface DaemonConfig {
  port?: number;
  socketPath?: string;
  bridgePort?: number;
}

export class Daemon {
  private server: net.Server | null = null;
  private bridgeServer: BridgeServer;
  private controller: AppController;
  private config: DaemonConfig;
  private connections: Set<net.Socket> = new Set();

  constructor(config: DaemonConfig = {}) {
    this.config = config;
    this.controller = new AppController();
    this.bridgeServer = new BridgeServer(config.bridgePort || DEFAULT_BRIDGE_PORT);

    // Wire up bridge server to controller
    this.controller.setBridgeServer(this.bridgeServer);
  }

  /**
   * Get the socket path for the current session
   */
  private getSocketPath(): string {
    if (this.config.socketPath) {
      return this.config.socketPath;
    }

    const tmpDir = os.tmpdir();
    return path.join(tmpDir, `agent-expo-${SESSION_NAME}.sock`);
  }

  /**
   * Get the PID file path
   */
  private getPidPath(): string {
    const tmpDir = os.tmpdir();
    return path.join(tmpDir, `agent-expo-${SESSION_NAME}.pid`);
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    // Check if already running
    const pidPath = this.getPidPath();
    if (fs.existsSync(pidPath)) {
      const existingPid = parseInt(fs.readFileSync(pidPath, 'utf-8'), 10);
      if (this.isProcessRunning(existingPid)) {
        log.info(`Daemon already running with PID ${existingPid}`);
        process.exit(0);
      }
      // Stale PID file, clean up
      fs.unlinkSync(pidPath);
    }

    // Create CLI server (Unix socket or TCP)
    if (os.platform() === 'win32') {
      // Use TCP on Windows
      await this.startTcpServer();
    } else {
      // Use Unix socket on macOS/Linux
      await this.startUnixServer();
    }

    // Start bridge WebSocket server
    try {
      await this.bridgeServer.start();
    } catch (err) {
      log.error('Failed to start bridge server:', err);
      // Continue anyway - CLI will still work
    }

    // Write PID file
    fs.writeFileSync(pidPath, String(process.pid));

    // Setup cleanup handlers
    this.setupCleanup();

    log.info(`Daemon started (PID: ${process.pid})`);
  }

  /**
   * Start Unix socket server
   */
  private async startUnixServer(): Promise<void> {
    const socketPath = this.getSocketPath();

    // Remove existing socket file if it exists
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath);
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.on('error', (err) => {
        log.error('Server error:', err);
        reject(err);
      });

      this.server.listen(socketPath, () => {
        log.info(`Listening on ${socketPath}`);
        // Set permissions so other users can connect
        fs.chmodSync(socketPath, 0o777);
        resolve();
      });
    });
  }

  /**
   * Start TCP server (for Windows)
   */
  private async startTcpServer(): Promise<void> {
    const port = this.config.port || DEFAULT_PORT;

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));

      this.server.on('error', (err) => {
        log.error('Server error:', err);
        reject(err);
      });

      this.server.listen(port, '127.0.0.1', () => {
        log.info(`Listening on TCP port ${port}`);
        resolve();
      });
    });
  }

  /**
   * Handle a new connection
   */
  private handleConnection(socket: net.Socket): void {
    this.connections.add(socket);

    let buffer = '';

    socket.on('data', async (data) => {
      buffer += data.toString();

      // Process complete lines (newline-delimited JSON)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          await this.processCommand(socket, line);
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const response = error('unknown', message, ErrorCode.INVALID_COMMAND);
          socket.write(serializeResponse(response));
        }
      }
    });

    socket.on('close', () => {
      this.connections.delete(socket);
    });

    socket.on('error', (err) => {
      log.error('Socket error:', err);
      this.connections.delete(socket);
    });
  }

  /**
   * Process a command
   */
  private async processCommand(socket: net.Socket, line: string): Promise<void> {
    // Parse command
    const parseResult = parseCommand(line);
    const command = parseResult;

    // Execute command
    const response = await executeCommand(command, this.controller);

    // Send response
    socket.write(serializeResponse(response));
  }

  /**
   * Check if a process is running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Setup cleanup handlers
   */
  private setupCleanup(): void {
    const cleanup = () => {
      log.info('Shutting down daemon...');

      // Close all CLI connections
      for (const socket of this.connections) {
        socket.destroy();
      }

      // Close CLI server
      if (this.server) {
        this.server.close();
      }

      // Close bridge server
      this.bridgeServer.stop();

      // Remove socket file
      const socketPath = this.getSocketPath();
      if (fs.existsSync(socketPath)) {
        try {
          fs.unlinkSync(socketPath);
        } catch {
          // Ignore
        }
      }

      // Remove PID file
      const pidPath = this.getPidPath();
      if (fs.existsSync(pidPath)) {
        try {
          fs.unlinkSync(pidPath);
        } catch {
          // Ignore
        }
      }

      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('SIGHUP', cleanup);
  }

  /**
   * Stop the daemon
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

/**
 * Start daemon if this is the main module
 */
export async function startDaemon(config?: DaemonConfig): Promise<Daemon> {
  const daemon = new Daemon(config);
  await daemon.start();
  return daemon;
}

/**
 * RecordingManager
 *
 * Manages recording and playback of user interactions.
 * Records actions as they happen, stores them to disk, and can replay them.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  logger,
  type Platform,
  type Recording,
  type RecordedStep,
  type RecordedDevice,
  type RecordingStatus,
  type RecordingInfo,
  type RecordedTarget,
} from '@agent-expo/protocol';

const log = logger.child('recording');

export interface RecordingManagerOptions {
  /** Directory to store recordings (default: ~/.agent-expo/recordings) */
  recordingsDir?: string;
}

/**
 * Manages recording and playback of interactions
 */
export class RecordingManager {
  private recordingsDir: string;
  private currentRecording: Recording | null = null;
  private recordingStartTime: number = 0;

  constructor(options: RecordingManagerOptions = {}) {
    this.recordingsDir =
      options.recordingsDir ||
      path.join(os.homedir(), '.agent-expo', 'recordings');
    this.ensureRecordingsDir();
  }

  /**
   * Ensure the recordings directory exists
   */
  private ensureRecordingsDir(): void {
    if (!fs.existsSync(this.recordingsDir)) {
      fs.mkdirSync(this.recordingsDir, { recursive: true });
    }
  }

  /**
   * Start a new recording
   */
  startRecording(name: string, device: RecordedDevice): void {
    if (this.currentRecording) {
      throw new Error('A recording is already in progress');
    }

    this.currentRecording = {
      name,
      createdAt: new Date().toISOString(),
      device,
      steps: [],
      duration: 0,
    };
    this.recordingStartTime = Date.now();

    log.info(`Recording started: ${name}`);
  }

  /**
   * Stop the current recording and save it
   */
  stopRecording(): Recording | null {
    if (!this.currentRecording) {
      return null;
    }

    this.currentRecording.duration = Date.now() - this.recordingStartTime;
    const recording = this.currentRecording;

    // Save to disk
    this.saveRecording(recording);

    log.info(`Recording stopped: ${recording.name} (${recording.steps.length} steps)`);

    this.currentRecording = null;
    this.recordingStartTime = 0;

    return recording;
  }

  /**
   * Record an action step
   */
  recordStep(
    action: string,
    target?: RecordedTarget,
    options?: {
      value?: string | number;
      duration?: number;
      timeout?: number;
    }
  ): void {
    if (!this.currentRecording) {
      return; // Not recording, ignore
    }

    const step: RecordedStep = {
      action,
      target,
      value: options?.value,
      duration: options?.duration,
      timeout: options?.timeout,
      timestamp: Date.now() - this.recordingStartTime,
    };

    this.currentRecording.steps.push(step);
    log.debug(`Recorded step: ${action}`, { target, options });
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.currentRecording !== null;
  }

  /**
   * Get current recording status
   */
  getStatus(): RecordingStatus {
    if (!this.currentRecording) {
      return { isRecording: false };
    }

    return {
      isRecording: true,
      name: this.currentRecording.name,
      startedAt: this.currentRecording.createdAt,
      stepCount: this.currentRecording.steps.length,
    };
  }

  /**
   * Save a recording to disk
   */
  private saveRecording(recording: Recording): void {
    const filePath = this.getRecordingPath(recording.name);
    fs.writeFileSync(filePath, JSON.stringify(recording, null, 2));
    log.debug(`Recording saved to: ${filePath}`);
  }

  /**
   * Load a recording from disk
   */
  loadRecording(name: string): Recording {
    const filePath = this.getRecordingPath(name);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Recording not found: ${name}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Recording;
  }

  /**
   * List all saved recordings
   */
  listRecordings(): RecordingInfo[] {
    const files = fs.readdirSync(this.recordingsDir).filter((f) => f.endsWith('.json'));

    return files.map((file) => {
      const filePath = path.join(this.recordingsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const recording = JSON.parse(content) as Recording;

      return {
        name: recording.name,
        createdAt: recording.createdAt,
        device: recording.device,
        stepCount: recording.steps.length,
        duration: recording.duration,
      };
    });
  }

  /**
   * Delete a recording
   */
  deleteRecording(name: string): boolean {
    const filePath = this.getRecordingPath(name);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    fs.unlinkSync(filePath);
    log.info(`Recording deleted: ${name}`);
    return true;
  }

  /**
   * Check if a recording exists
   */
  hasRecording(name: string): boolean {
    return fs.existsSync(this.getRecordingPath(name));
  }

  /**
   * Get file path for a recording
   */
  private getRecordingPath(name: string): string {
    // Sanitize name for filesystem
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.recordingsDir, `${safeName}.json`);
  }

  /**
   * Export a recording to TypeScript code
   */
  exportToTypeScript(recording: Recording): string {
    const lines: string[] = [
      `/**`,
      ` * Generated test from recording: ${recording.name}`,
      ` * Created: ${recording.createdAt}`,
      ` * Device: ${recording.device.name} (${recording.device.platform})`,
      ` */`,
      ``,
      `import { AgentExpoClient } from '@agent-expo/sdk';`,
      ``,
      `export async function ${this.toCamelCase(recording.name)}() {`,
      `  const client = new AgentExpoClient();`,
      `  await client.connect();`,
      ``,
    ];

    for (const step of recording.steps) {
      const code = this.stepToTypeScript(step);
      if (code) {
        lines.push(`  ${code}`);
      }
    }

    lines.push(``);
    lines.push(`  client.disconnect();`);
    lines.push(`}`);
    lines.push(``);

    return lines.join('\n');
  }

  /**
   * Export a recording to Jest test code
   */
  exportToJest(recording: Recording): string {
    const lines: string[] = [
      `/**`,
      ` * Generated Jest test from recording: ${recording.name}`,
      ` * Created: ${recording.createdAt}`,
      ` * Device: ${recording.device.name} (${recording.device.platform})`,
      ` */`,
      ``,
      `import { AgentExpoClient } from '@agent-expo/sdk';`,
      ``,
      `describe('${recording.name}', () => {`,
      `  let client: AgentExpoClient;`,
      ``,
      `  beforeAll(async () => {`,
      `    client = new AgentExpoClient();`,
      `    await client.connect();`,
      `  });`,
      ``,
      `  afterAll(() => {`,
      `    client.disconnect();`,
      `  });`,
      ``,
      `  it('should replay recorded actions', async () => {`,
    ];

    for (const step of recording.steps) {
      const code = this.stepToTypeScript(step);
      if (code) {
        lines.push(`    ${code}`);
      }
    }

    lines.push(`  });`);
    lines.push(`});`);
    lines.push(``);

    return lines.join('\n');
  }

  /**
   * Convert a step to TypeScript code
   */
  private stepToTypeScript(step: RecordedStep): string {
    const target = this.formatTarget(step.target);

    switch (step.action) {
      case 'tap':
        return `await client.tap(${target});`;

      case 'doubleTap':
        return `await client.tap(${target}, { count: 2 });`;

      case 'longPress':
        const duration = step.duration || 1000;
        return `await client.longPress(${target}, ${duration});`;

      case 'fill':
        return `await client.fill(${target}, '${this.escapeString(String(step.value || ''))}');`;

      case 'clear':
        return `await client.clear(${target});`;

      case 'type':
        return `await client.type('${this.escapeString(String(step.value || ''))}');`;

      case 'scroll':
        return `await client.scroll('${step.value || 'down'}');`;

      case 'swipe':
        return `await client.swipe(/* coordinates from recording */);`;

      case 'navigate':
        return `await client.navigate('${step.value}');`;

      case 'back':
        return `await client.back();`;

      case 'home':
        return `await client.home();`;

      case 'waitFor':
        const timeout = step.timeout || 5000;
        return `await client.waitFor(${target}, ${timeout});`;

      case 'pressKey':
        return `await client.pressKey('${step.value}');`;

      default:
        return `// Unknown action: ${step.action}`;
    }
  }

  /**
   * Format a target for code generation
   */
  private formatTarget(target?: RecordedTarget): string {
    if (!target) {
      return '/* no target */';
    }

    if (target.testID) {
      return `'@${target.testID}'`;
    }

    if (target.ref) {
      return `'${target.ref}'`;
    }

    if (target.label) {
      return `{ label: '${this.escapeString(target.label)}' }`;
    }

    if (target.coordinates) {
      return `{ x: ${target.coordinates.x}, y: ${target.coordinates.y} }`;
    }

    return '/* no target */';
  }

  /**
   * Convert string to camelCase for function names
   */
  private toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
      .replace(/^[A-Z]/, (char) => char.toLowerCase())
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Escape string for code generation
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}

/**
 * Record commands
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import type {
  RecordStartCommandType,
  RecordStopCommandType,
  RecordListCommandType,
  RecordPlayCommandType,
  RecordDeleteCommandType,
  RecordExportCommandType,
  RecordStatusCommandType,
  Recording,
  RecordingInfo,
  RecordingStatus,
} from '@agent-expo/protocol';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerRecordCommands(
  program: Commander,
  client: DaemonClient,
  options: OutputOptions
): void {
  const record = program.command('record').description('Recording and playback commands');

  // Start recording
  record
    .command('start <name>')
    .description('Start recording interactions')
    .option('-o, --output <path>', 'Output file path')
    .action(async (name: string, opts) => {
      const command: RecordStartCommandType = {
        id: uuid(),
        action: 'recordStart',
        name,
        output: opts.output,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }

      console.log(`\nRecording started: ${name}`);
      console.log('Perform actions in your app, then run: agent-expo record stop');
    });

  // Stop recording
  record
    .command('stop')
    .description('Stop recording and save')
    .action(async () => {
      const command: RecordStopCommandType = {
        id: uuid(),
        action: 'recordStop',
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }

      const data = response.data as { stopped: boolean; recording: Recording | null };
      if (data.recording) {
        console.log(`\nRecording saved: ${data.recording.name}`);
        console.log(`Steps: ${data.recording.steps.length}`);
        console.log(`Duration: ${Math.round(data.recording.duration / 1000)}s`);
      }
    });

  // List recordings
  record
    .command('list')
    .alias('ls')
    .description('List all saved recordings')
    .action(async () => {
      const command: RecordListCommandType = {
        id: uuid(),
        action: 'recordList',
      };

      const response = await client.send(command);

      if (!response.success) {
        printResponse(response, options);
        process.exit(1);
      }

      const data = response.data as { recordings: RecordingInfo[] };
      const recordings = data.recordings;

      if (recordings.length === 0) {
        console.log('No recordings found.');
        return;
      }

      console.log('Saved Recordings:\n');
      for (const rec of recordings) {
        const duration = Math.round(rec.duration / 1000);
        console.log(`  ${rec.name}`);
        console.log(`    Device: ${rec.device.name} (${rec.device.platform})`);
        console.log(`    Steps: ${rec.stepCount} | Duration: ${duration}s`);
        console.log(`    Created: ${new Date(rec.createdAt).toLocaleString()}`);
        console.log('');
      }
    });

  // Play recording
  record
    .command('play <name>')
    .description('Play back a recording')
    .option('-s, --speed <multiplier>', 'Playback speed multiplier (default: 1.0)', '1.0')
    .action(async (name: string, opts) => {
      const speed = parseFloat(opts.speed);

      console.log(`Playing recording: ${name} (speed: ${speed}x)\n`);

      const command: RecordPlayCommandType = {
        id: uuid(),
        action: 'recordPlay',
        name,
        speed,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }

      console.log('\nPlayback completed.');
    });

  // Delete recording
  record
    .command('delete <name>')
    .alias('rm')
    .description('Delete a recording')
    .action(async (name: string) => {
      const command: RecordDeleteCommandType = {
        id: uuid(),
        action: 'recordDelete',
        name,
      };

      const response = await client.send(command);

      if (!response.success) {
        printResponse(response, options);
        process.exit(1);
      }

      const data = response.data as { deleted: boolean; name: string };
      if (data.deleted) {
        console.log(`Recording deleted: ${name}`);
      } else {
        console.log(`Recording not found: ${name}`);
        process.exit(1);
      }
    });

  // Export recording
  record
    .command('export <name>')
    .description('Export a recording to code')
    .requiredOption('-f, --format <format>', 'Export format: typescript, jest, json')
    .option('-o, --output <path>', 'Output file path')
    .action(async (name: string, opts) => {
      const format = opts.format as 'typescript' | 'jest' | 'json';

      if (!['typescript', 'jest', 'json'].includes(format)) {
        console.error(`Invalid format: ${format}. Must be typescript, jest, or json.`);
        process.exit(1);
      }

      const command: RecordExportCommandType = {
        id: uuid(),
        action: 'recordExport',
        name,
        format,
        output: opts.output,
      };

      const response = await client.send(command);

      if (!response.success) {
        printResponse(response, options);
        process.exit(1);
      }

      const data = response.data as { exported: boolean; code: string };
      const code = data.code;

      if (opts.output) {
        fs.writeFileSync(opts.output, code);
        console.log(`Exported to: ${opts.output}`);
      } else {
        console.log(code);
      }
    });

  // Recording status
  record
    .command('status')
    .description('Check current recording status')
    .action(async () => {
      const command: RecordStatusCommandType = {
        id: uuid(),
        action: 'recordStatus',
      };

      const response = await client.send(command);

      if (!response.success) {
        printResponse(response, options);
        process.exit(1);
      }

      const data = response.data as RecordingStatus;
      if (data.isRecording) {
        console.log('Recording Status: ACTIVE\n');
        console.log(`  Name: ${data.name}`);
        console.log(`  Started: ${data.startedAt}`);
        console.log(`  Steps: ${data.stepCount}`);
      } else {
        console.log('Recording Status: INACTIVE');
        console.log('\nRun `agent-expo record start <name>` to start recording.');
      }
    });
}

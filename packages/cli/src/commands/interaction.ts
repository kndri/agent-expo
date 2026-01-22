/**
 * Interaction commands (tap, fill, scroll, etc.)
 */

import type { Command as Commander } from 'commander';
import { v4 as uuid } from 'uuid';
import { DaemonClient } from '../daemon-client.js';
import { printResponse, type OutputOptions } from '../output.js';

export function registerInteractionCommands(program: Commander, client: DaemonClient, options: OutputOptions): void {
  // Tap
  program
    .command('tap [ref]')
    .description('Tap on an element')
    .option('--test-id <testID>', 'Element testID')
    .option('-x <x>', 'X coordinate', parseInt)
    .option('-y <y>', 'Y coordinate', parseInt)
    .option('--count <count>', 'Number of taps', parseInt)
    .option('--duration <ms>', 'Long press duration in ms', parseInt)
    .action(async (ref, opts) => {
      const command: any = {
        id: uuid(),
        action: 'tap',
        ref,
        testID: opts.testId,
        count: opts.count,
        duration: opts.duration,
      };

      if (opts.x !== undefined && opts.y !== undefined) {
        command.coordinates = { x: opts.x, y: opts.y };
      }

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Double tap
  program
    .command('doubletap [ref]')
    .description('Double tap on an element')
    .option('--test-id <testID>', 'Element testID')
    .action(async (ref, opts) => {
      const command = {
        id: uuid(),
        action: 'doubleTap',
        ref,
        testID: opts.testId,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Long press
  program
    .command('longpress [ref]')
    .description('Long press on an element')
    .option('--test-id <testID>', 'Element testID')
    .option('--duration <ms>', 'Duration in ms', parseInt, 1000)
    .action(async (ref, opts) => {
      const command = {
        id: uuid(),
        action: 'longPress',
        ref,
        testID: opts.testId,
        duration: opts.duration,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Fill
  program
    .command('fill <ref> <text>')
    .description('Fill text into an input')
    .option('--clear', 'Clear existing text first')
    .action(async (ref, text, opts) => {
      const command = {
        id: uuid(),
        action: 'fill',
        ref,
        text,
        clear: opts.clear,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Clear
  program
    .command('clear <ref>')
    .description('Clear text from an input')
    .action(async (ref) => {
      const command = {
        id: uuid(),
        action: 'clear',
        ref,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Type
  program
    .command('type <text>')
    .description('Type text (without focusing)')
    .action(async (text) => {
      const command = {
        id: uuid(),
        action: 'type',
        text,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Scroll
  program
    .command('scroll <direction>')
    .description('Scroll in a direction (up, down, left, right)')
    .option('--distance <pixels>', 'Scroll distance in pixels', parseInt)
    .option('--to <ref>', 'Scroll until this element is visible')
    .option('--within <ref>', 'Scroll within this element')
    .action(async (direction, opts) => {
      const command = {
        id: uuid(),
        action: 'scroll',
        direction,
        distance: opts.distance,
        toRef: opts.to,
        ref: opts.within,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });

  // Swipe
  program
    .command('swipe')
    .description('Swipe gesture')
    .requiredOption('--from <x,y>', 'Start coordinates (x,y)')
    .requiredOption('--to <x,y>', 'End coordinates (x,y)')
    .option('--duration <ms>', 'Duration in ms', parseInt)
    .action(async (opts) => {
      const parseCoords = (str: string) => {
        const [x, y] = str.split(',').map(Number);
        return { x, y };
      };

      const command = {
        id: uuid(),
        action: 'swipe',
        from: parseCoords(opts.from),
        to: parseCoords(opts.to),
        duration: opts.duration,
      };

      const response = await client.send(command);
      printResponse(response, options);

      if (!response.success) {
        process.exit(1);
      }
    });
}

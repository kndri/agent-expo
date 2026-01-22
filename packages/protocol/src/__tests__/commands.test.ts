import { parseCommand, safeParseCommand } from '../commands';

describe('Command Parsing', () => {
  describe('TapCommand', () => {
    it('should parse valid tap command with ref', () => {
      const command = {
        id: 'test-id',
        action: 'tap',
        ref: '@e1',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(command);
      }
    });

    it('should parse tap command without ref (optional)', () => {
      const command = {
        id: 'test-id',
        action: 'tap',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });

    it('should accept tap command with coordinates', () => {
      const command = {
        id: 'test-id',
        action: 'tap',
        coordinates: { x: 100, y: 200 },
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });

    it('should accept tap command with testID', () => {
      const command = {
        id: 'test-id',
        action: 'tap',
        testID: 'submit-button',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });
  });

  describe('SnapshotCommand', () => {
    it('should parse snapshot with options', () => {
      const command = {
        id: 'test-id',
        action: 'snapshot',
        interactive: true,
        compact: true,
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });

    it('should parse snapshot without options', () => {
      const command = {
        id: 'test-id',
        action: 'snapshot',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });

    it('should accept maxDepth option', () => {
      const command = {
        id: 'test-id',
        action: 'snapshot',
        maxDepth: 5,
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });
  });

  describe('LaunchCommand', () => {
    it('should parse launch command with platform', () => {
      const command = {
        id: 'test-id',
        action: 'launch',
        platform: 'ios',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });

    it('should reject launch command without platform', () => {
      const command = {
        id: 'test-id',
        action: 'launch',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(false);
    });

    it('should accept launch with all options', () => {
      const command = {
        id: 'test-id',
        action: 'launch',
        platform: 'android',
        device: 'Pixel_5',
        app: '/path/to/app.apk',
        bundleId: 'com.example.app',
        clearState: true,
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });
  });

  describe('ScrollCommand', () => {
    it('should parse scroll command with direction', () => {
      const command = {
        id: 'test-id',
        action: 'scroll',
        direction: 'down',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });

    it('should reject invalid direction', () => {
      const command = {
        id: 'test-id',
        action: 'scroll',
        direction: 'diagonal',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(false);
    });
  });

  describe('FillCommand', () => {
    it('should parse fill command with text', () => {
      const command = {
        id: 'test-id',
        action: 'fill',
        text: 'Hello World',
        ref: '@e5',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });

    it('should reject fill command without text', () => {
      const command = {
        id: 'test-id',
        action: 'fill',
        ref: '@e5',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(false);
    });
  });

  describe('AssertCommand', () => {
    it('should parse assert command', () => {
      const command = {
        id: 'test-id',
        action: 'assert',
        ref: '@e1',
        assertion: 'visible',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });

    it('should accept all assertion types', () => {
      const assertions = [
        'visible',
        'hidden',
        'enabled',
        'disabled',
        'exists',
        'notExists',
        'hasText',
        'hasValue',
        'checked',
        'unchecked',
      ];

      for (const assertion of assertions) {
        const command = {
          id: 'test-id',
          action: 'assert',
          assertion,
        };

        const result = safeParseCommand(command);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('NetworkMockCommand', () => {
    it('should parse network mock command', () => {
      const command = {
        id: 'test-id',
        action: 'networkMock',
        pattern: 'https://api.example.com/*',
        response: {
          status: 200,
          body: { success: true },
        },
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid commands', () => {
    it('should reject unknown action', () => {
      const command = {
        id: 'test-id',
        action: 'unknownAction',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(false);
    });

    it('should reject command without id', () => {
      const command = {
        action: 'tap',
        ref: '@e1',
      };

      const result = safeParseCommand(command);
      expect(result.success).toBe(false);
    });

    it('should handle invalid JSON string', () => {
      const result = safeParseCommand('not valid json');
      expect(result.success).toBe(false);
    });
  });

  describe('parseCommand', () => {
    it('should return parsed command', () => {
      const command = {
        id: 'test-id',
        action: 'ping',
      };

      const result = parseCommand(command);
      expect(result).toMatchObject(command);
    });

    it('should throw on invalid command', () => {
      const command = {
        action: 'tap',
      };

      expect(() => parseCommand(command)).toThrow();
    });
  });
});

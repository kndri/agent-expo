/**
 * Logger Utility
 *
 * Configurable logging with levels, prefixes, and optional colors.
 */

export enum LogLevel {
  SILENT = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
  TRACE = 5,
}

export interface LoggerConfig {
  level: LogLevel;
  prefix?: string;
  timestamps?: boolean;
  colors?: boolean;
}

const levelColors: Record<LogLevel, string> = {
  [LogLevel.SILENT]: '',
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.WARN]: '\x1b[33m', // Yellow
  [LogLevel.INFO]: '\x1b[36m', // Cyan
  [LogLevel.DEBUG]: '\x1b[90m', // Gray
  [LogLevel.TRACE]: '\x1b[90m', // Gray
};

const levelNames: Record<LogLevel, string> = {
  [LogLevel.SILENT]: '',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE',
};

const RESET = '\x1b[0m';

/**
 * Logger class with configurable levels and child logger support.
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      timestamps: false,
      colors: (typeof process !== 'undefined' && process.stdout?.isTTY) ?? true,
      ...config,
    };
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level === LogLevel.SILENT || level > this.config.level) return;

    const parts: string[] = [];

    // Timestamp
    if (this.config.timestamps) {
      parts.push(`[${new Date().toISOString()}]`);
    }

    // Level
    const levelName = levelNames[level];
    if (this.config.colors) {
      parts.push(`${levelColors[level]}${levelName}${RESET}`);
    } else {
      parts.push(levelName);
    }

    // Prefix
    if (this.config.prefix) {
      if (this.config.colors) {
        parts.push(`\x1b[35m[${this.config.prefix}]${RESET}`);
      } else {
        parts.push(`[${this.config.prefix}]`);
      }
    }

    // Message
    parts.push(message);

    const output = parts.join(' ');

    if (level <= LogLevel.ERROR) {
      console.error(output, ...args);
    } else if (level <= LogLevel.WARN) {
      console.warn(output, ...args);
    } else {
      console.log(output, ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  trace(message: string, ...args: unknown[]): void {
    this.log(LogLevel.TRACE, message, ...args);
  }

  /**
   * Create a child logger with an additional prefix.
   */
  child(prefix: string): Logger {
    return new Logger({
      ...this.config,
      prefix: this.config.prefix ? `${this.config.prefix}:${prefix}` : prefix,
    });
  }

  /**
   * Set the log level.
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get the current log level.
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Check if a specific level is enabled.
   */
  isLevelEnabled(level: LogLevel): boolean {
    return level <= this.config.level;
  }
}

/**
 * Parse log level from string.
 */
export function parseLogLevel(level: string): LogLevel {
  const map: Record<string, LogLevel> = {
    silent: LogLevel.SILENT,
    error: LogLevel.ERROR,
    warn: LogLevel.WARN,
    info: LogLevel.INFO,
    debug: LogLevel.DEBUG,
    trace: LogLevel.TRACE,
  };
  return map[level.toLowerCase()] ?? LogLevel.INFO;
}

/**
 * Get log level name from value.
 */
export function getLogLevelName(level: LogLevel): string {
  return levelNames[level] || 'UNKNOWN';
}

// Global logger instance
const defaultLevel =
  typeof process !== 'undefined' && process.env?.AGENT_EXPO_LOG_LEVEL
    ? parseLogLevel(process.env.AGENT_EXPO_LOG_LEVEL)
    : LogLevel.INFO;

export const logger = new Logger({
  prefix: 'agent-expo',
  level: defaultLevel,
});

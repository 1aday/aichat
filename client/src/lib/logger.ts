type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
}

class Logger {
  private config: LoggerConfig;
  private prefix: string;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      enabled: true,
      level: 'debug',
      ...config
    };
    this.prefix = config?.prefix || '';
    console.log('Logger instance created with config:', this.config);
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.config.level);
  }

  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${this.prefix}${level.toUpperCase()}: ${message}`;
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', ''), ...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', ''), ...args);
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', ''), ...args);
    }
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', ''), ...args);
    }
  }

  group(label: string) {
    if (this.config.enabled) {
      console.group(this.formatMessage('debug', label));
    }
  }

  groupEnd() {
    if (this.config.enabled) {
      console.groupEnd();
    }
  }

  table(label: string, data: any) {
    if (this.config.enabled) {
      this.group(label);
      console.table(data);
      this.groupEnd();
    }
  }

  log(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', ''), ...args);
    }
  }
}

// Create loggers for different parts of the application
export const apiLogger = new Logger({ prefix: '[API] ' });
export const chatLogger = new Logger({ prefix: '[Chat] ' });
export const toolLogger = new Logger({ prefix: '[Tool] ' });

console.log('Logger module initialized');
chatLogger.debug('Chat logger initialized');
apiLogger.debug('API logger initialized');
toolLogger.debug('Tool logger initialized'); 
import { ENV } from '../config';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(metadata && { metadata }),
  };

  const formatted = formatLog(entry);

  if (level === 'error') {
    process.stderr.write(formatted + '\n');
  } else {
    process.stdout.write(formatted + '\n');
  }
}

export const logger = {
  info: (message: string, metadata?: Record<string, unknown>) => log('info', message, metadata),
  warn: (message: string, metadata?: Record<string, unknown>) => log('warn', message, metadata),
  error: (message: string, metadata?: Record<string, unknown>) => log('error', message, metadata),
};

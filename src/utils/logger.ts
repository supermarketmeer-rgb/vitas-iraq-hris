export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  eventType: string;
  message: string;
  details?: any;
}

const LOG_STORAGE_KEY = 'vitas_hris_system_logs';
const MAX_LOGS = 500;

class SystemLogger {
  private logs: LogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      if (this.logs.length > MAX_LOGS) {
        this.logs = this.logs.slice(this.logs.length - MAX_LOGS);
      }
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {}
  }

  public log(level: LogLevel, eventType: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      eventType,
      message,
      details
    };

    this.logs.push(entry);
    this.saveLogs();

    const consoleFn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
    consoleFn(`[${entry.timestamp}] [${level}] [${eventType}] ${message}`, details || '');
  }

  public info(eventType: string, message: string, details?: any) {
    this.log('INFO', eventType, message, details);
  }

  public warn(eventType: string, message: string, details?: any) {
    this.log('WARN', eventType, message, details);
  }

  public error(eventType: string, message: string, details?: any) {
    this.log('ERROR', eventType, message, details);
  }

  public debug(eventType: string, message: string, details?: any) {
    this.log('DEBUG', eventType, message, details);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs].reverse();
  }

  public clearLogs() {
    this.logs = [];
    localStorage.removeItem(LOG_STORAGE_KEY);
  }
}

export const logger = new SystemLogger();

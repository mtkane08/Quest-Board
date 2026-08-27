/**
 * Minimal structured logger: one JSON object per line to stdout, satisfying
 * Section 40's "centralized structured logs" requirement without pulling in
 * a full observability stack at Gate 2. Swap for pino/OpenTelemetry at a
 * later hardening gate if volume/tracing needs grow — the call sites
 * (`logger.info(...)`) don't need to change.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface LogFields {
  [key: string]: unknown;
}

export function createLogger(minLevel: Level = 'info') {
  const threshold = LEVEL_ORDER[minLevel];

  function log(level: Level, message: string, fields?: LogFields) {
    if (LEVEL_ORDER[level] < threshold) return;
    const line = {
      time: new Date().toISOString(),
      level,
      message,
      ...fields,
    };
    const out = level === 'error' || level === 'warn' ? console.error : console.log;
    out(JSON.stringify(line));
  }

  return {
    debug: (message: string, fields?: LogFields) => log('debug', message, fields),
    info: (message: string, fields?: LogFields) => log('info', message, fields),
    warn: (message: string, fields?: LogFields) => log('warn', message, fields),
    error: (message: string, fields?: LogFields) => log('error', message, fields),
  };
}

export type Logger = ReturnType<typeof createLogger>;

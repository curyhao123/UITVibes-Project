type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function normalizeLevel(value: string | undefined): LogLevel {
  const lower = value?.toLowerCase();
  if (lower === 'debug' || lower === 'info' || lower === 'warn' || lower === 'error' || lower === 'silent') {
    return lower;
  }
  return __DEV__ ? 'warn' : 'silent';
}

const configuredLevel = normalizeLevel(process.env.EXPO_PUBLIC_LOG_LEVEL);

function canLog(level: Exclude<LogLevel, 'silent'>): boolean {
  return LEVEL_ORDER[configuredLevel] >= LEVEL_ORDER[level];
}

function withScope(scope: string, args: unknown[]) {
  return [`[${scope}]`, ...args];
}

export function createLogger(scope: string) {
  return {
    debug: (...args: unknown[]) => {
      if (canLog('debug')) console.debug(...withScope(scope, args));
    },
    info: (...args: unknown[]) => {
      if (canLog('info')) console.info(...withScope(scope, args));
    },
    warn: (...args: unknown[]) => {
      if (canLog('warn')) console.warn(...withScope(scope, args));
    },
    error: (...args: unknown[]) => {
      if (canLog('error')) console.error(...withScope(scope, args));
    },
  };
}

export const logger = createLogger('UITVibes');

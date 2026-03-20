const LOG_LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const resolveLogLevel = () => {
  const rawLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return LOG_LEVELS[rawLevel] ? rawLevel : 'info';
};

const shouldLog = (activeLevel, messageLevel) => {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[activeLevel];
};

const emit = (level, scope, message, meta = undefined) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  const serialized = JSON.stringify(payload);

  if (level === 'warn' || level === 'error') {
    process.stderr.write(`${serialized}\n`);
    return;
  }

  process.stdout.write(`${serialized}\n`);
};

export const createLogger = (scope) => {
  const activeLevel = resolveLogLevel();

  return {
    debug(message, meta) {
      if (shouldLog(activeLevel, 'debug')) {
        emit('debug', scope, message, meta);
      }
    },
    info(message, meta) {
      if (shouldLog(activeLevel, 'info')) {
        emit('info', scope, message, meta);
      }
    },
    warn(message, meta) {
      if (shouldLog(activeLevel, 'warn')) {
        emit('warn', scope, message, meta);
      }
    },
    error(message, meta) {
      if (shouldLog(activeLevel, 'error')) {
        emit('error', scope, message, meta);
      }
    },
  };
};

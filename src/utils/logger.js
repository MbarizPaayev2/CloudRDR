/**
 * @file src/utils/logger.js
 * Singleton pino logger. Import this everywhere instead of console.log.
 * Structured JSON output in production; pretty-printed in development.
 */

import pino from 'pino';
import cfg from '../config/index.js';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: cfg.log.level,
  // In dev, use pino-pretty for human-readable output
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Redact sensitive fields — never log secrets or full file hashes in prod
  redact: {
    paths: ['*.serviceKey', '*.apiKey', '*.password', '*.secret'],
    censor: '[REDACTED]',
  },
  base: {
    app: 'cloudrdr',
  },
});

export default logger;

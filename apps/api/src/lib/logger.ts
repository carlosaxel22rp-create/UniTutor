import { pino } from 'pino'

/**
 * Logs estructurados SIN datos sensibles (A09). Se redactan tokens,
 * cookies, firmas de webhooks y correos antes de salir del proceso.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["stripe-signature"]',
      'req.headers["x-webhook-signature"]',
      '*.email',
      '*.token',
      '*.client_secret',
      '*.clientSecret',
    ],
    censor: '[REDACTED]',
  },
  base: { service: 'educonnect-api' },
})

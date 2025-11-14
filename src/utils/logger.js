const winston = require('winston');

const logLevel = process.env.LOG_LEVEL || 'info';
const logFormat = process.env.LOG_FORMAT || 'json';

// Define log format
const formats = {
  json: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  simple: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      let msg = `${timestamp} [${level}]: ${message}`;
      if (Object.keys(meta).length > 0) {
        msg += ` ${JSON.stringify(meta)}`;
      }
      return msg;
    }),
  ),
};

// Create logger
const logger = winston.createLogger({
  level: logLevel,
  format: formats[logFormat] || formats.json,
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'account-service',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// File transports are disabled in containerized environments
// Logs are captured from stdout/stderr by the container runtime
// For persistent log storage, use external logging solutions (e.g., ELK, Loki, CloudWatch)

module.exports = logger;

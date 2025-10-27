require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

const logger = require('./utils/logger');
const { createCircuitBreaker } = require('./middleware/circuitBreaker');
const authMiddleware = require('./middleware/auth');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security
app.use(helmet());

// CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Request ID
app.use((req, res, next) => {
  req.id = require('uuid').v4();
  res.setHeader('X-Request-ID', req.id);
  res.setHeader('X-Gateway', 'BankApp-API-Gateway');
  next();
});

// Distributed Rate Limiting with Redis
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.connect().catch((err) => {
  logger.error('Redis connection failed for rate limiting:', err);
});

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
  message: 'Too many requests, please try again later'
});

app.use('/api', limiter);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Authentication middleware for protected routes
app.use('/api', authMiddleware);

// Circuit Breaker for Account Service
const accountServiceBreaker = createCircuitBreaker('account-service', {
  timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 3000,
  errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD) || 50,
  resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000
});

// Circuit Breaker for Transaction Service
const transactionServiceBreaker = createCircuitBreaker('transaction-service', {
  timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 3000,
  errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD) || 50,
  resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000
});

// Proxy to Account Service
app.use('/api/v1/users', accountServiceBreaker, createProxyMiddleware({
  target: process.env.ACCOUNT_SERVICE_URL || 'http://account-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/users': '/api/v1/users'
  },
  onError: (err, req, res) => {
    logger.error('Account Service proxy error:', err);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Account Service is temporarily unavailable',
      requestId: req.id
    });
  },
  onProxyReq: (proxyReq, req) => {
    proxyReq.setHeader('X-Forwarded-Request-ID', req.id);
  }
}));

app.use('/api/v1/accounts', accountServiceBreaker, createProxyMiddleware({
  target: process.env.ACCOUNT_SERVICE_URL || 'http://account-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/accounts': '/api/v1/accounts'
  },
  onError: (err, req, res) => {
    logger.error('Account Service proxy error:', err);
    res.status(503).json({ error: 'Service Unavailable', requestId: req.id });
  }
}));

app.use('/api/v1/kyc', accountServiceBreaker, createProxyMiddleware({
  target: process.env.ACCOUNT_SERVICE_URL || 'http://account-service:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/kyc': '/api/v1/kyc'
  }
}));

// Proxy to Transaction Service
app.use('/api/v1/transactions', transactionServiceBreaker, createProxyMiddleware({
  target: process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/transactions': '/api/v1/transactions'
  },
  onError: (err, req, res) => {
    logger.error('Transaction Service proxy error:', err);
    res.status(503).json({ error: 'Service Unavailable', requestId: req.id });
  }
}));

app.use('/api/v1/fraud', transactionServiceBreaker, createProxyMiddleware({
  target: process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/fraud': '/api/v1/fraud'
  }
}));

app.use('/api/v1/payments', transactionServiceBreaker, createProxyMiddleware({
  target: process.env.TRANSACTION_SERVICE_URL || 'http://transaction-service:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1/payments': '/api/v1/payments'
  }
}));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Gateway error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;

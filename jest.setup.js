// Jest setup file
// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'bankapp_accounts_test';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.RABBITMQ_URL = 'amqp://localhost:5672';

// Mock external services
jest.mock('./src/config/rabbitmq', () => ({
  connectRabbitMQ: jest.fn().mockResolvedValue(true),
  disconnectRabbitMQ: jest.fn().mockResolvedValue(true),
  publishMessage: jest.fn().mockResolvedValue(true),
  getChannel: jest.fn()
}));

jest.mock('./src/config/redis', () => ({
  connectRedis: jest.fn().mockResolvedValue(true),
  disconnectRedis: jest.fn().mockResolvedValue(true),
  publishEvent: jest.fn().mockResolvedValue(true),
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheDel: jest.fn()
}));

// Increase timeout for integration tests
jest.setTimeout(10000);

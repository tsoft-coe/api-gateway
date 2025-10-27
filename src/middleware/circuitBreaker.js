const CircuitBreaker = require('opossum');
const logger = require('../utils/logger');

const breakers = new Map();

function createCircuitBreaker(serviceName, options = {}) {
  if (breakers.has(serviceName)) {
    return breakers.get(serviceName).middleware;
  }

  const defaultOptions = {
    timeout: 3000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    rollingCountTimeout: 10000,
    rollingCountBuckets: 10,
    name: serviceName
  };

  const breakerOptions = { ...defaultOptions, ...options };

  const breaker = new CircuitBreaker(async (req, res, next) => {
    return new Promise((resolve, reject) => {
      next();
      resolve();
    });
  }, breakerOptions);

  // Event listeners
  breaker.on('open', () => {
    logger.error(`Circuit breaker OPEN for ${serviceName}`);
  });

  breaker.on('halfOpen', () => {
    logger.warn(`Circuit breaker HALF-OPEN for ${serviceName}`);
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for ${serviceName}`);
  });

  breaker.on('failure', (error) => {
    logger.error(`Circuit breaker failure for ${serviceName}:`, error.message);
  });

  const middleware = (req, res, next) => {
    if (breaker.opened) {
      logger.warn(`Circuit breaker OPEN - rejecting request to ${serviceName}`);
      return res.status(503).json({
        error: 'Service Unavailable',
        message: `${serviceName} is temporarily unavailable. Please try again later.`,
        circuitBreakerState: 'OPEN',
        requestId: req.id
      });
    }

    if (breaker.halfOpen) {
      logger.info(`Circuit breaker HALF-OPEN - allowing test request to ${serviceName}`);
    }

    next();
  };

  breakers.set(serviceName, { breaker, middleware });
  return middleware;
}

function getCircuitBreakerStats() {
  const stats = {};
  breakers.forEach((value, key) => {
    const breaker = value.breaker;
    stats[key] = {
      state: breaker.opened ? 'OPEN' : (breaker.halfOpen ? 'HALF-OPEN' : 'CLOSED'),
      stats: breaker.stats
    };
  });
  return stats;
}

module.exports = {
  createCircuitBreaker,
  getCircuitBreakerStats
};

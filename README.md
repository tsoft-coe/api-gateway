# API Gateway

BankApp API Gateway - Central entry point for all client requests with authentication, rate limiting, and circuit breaker.

## Features

- **Request Routing**: Routes requests to appropriate microservices
- **Authentication**: JWT validation with Keycloak integration
- **Rate Limiting**: Distributed rate limiting with Redis
- **Circuit Breaker**: Automatic failover for unhealthy services
- **Load Balancing**: Distributes load across service instances
- **Request/Response Logging**: Comprehensive request tracking
- **CORS**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js integration

## Technology Stack

- Node.js 22 LTS
- Express.js 5.1
- http-proxy-middleware 3.0 (latest proxy library)
- opossum 8.1 (circuit breaker)
- rate-limit-redis 4.2 (distributed rate limiting)
- redis 4.7 (Node Redis v4)

## Architecture

```
Client Request
      ↓
  API Gateway (port 8080)
      ↓
  [Auth Middleware]
      ↓
  [Rate Limiter (Redis)]
      ↓
  [Circuit Breaker]
      ↓
  [Proxy Middleware]
      ↓
  Microservice (Account/Transaction)
```

## Installation

```bash
npm install
cp .env.example .env
vim .env
```

## Running

```bash
# Development
npm run dev

# Production
npm start
```

## Docker

```bash
docker build -t api-gateway:latest .
docker run -d -p 8080:8080 --env-file .env api-gateway:latest
```

## Routes

All routes require `Authorization: Bearer <token>` header except `/health`.

### Gateway Endpoints
- `GET /health` - Health check (no auth)

### Proxied to Account Service (port 3000)
- `/api/v1/users/*` → Account Service
- `/api/v1/accounts/*` → Account Service
- `/api/v1/kyc/*` → Account Service

### Proxied to Transaction Service (port 3001)
- `/api/v1/transactions/*` → Transaction Service
- `/api/v1/fraud/*` → Transaction Service
- `/api/v1/payments/*` → Transaction Service

## Circuit Breaker

Circuit breaker opens after 50% error rate (configurable).

**States:**
- **CLOSED**: Normal operation
- **OPEN**: Service unavailable, requests rejected immediately
- **HALF-OPEN**: Testing if service recovered

Configuration:
- Timeout: 3 seconds
- Error Threshold: 50%
- Reset Timeout: 30 seconds

## Rate Limiting

Distributed rate limiting using Redis:
- Window: 60 seconds (configurable)
- Max Requests: 100 per window (configurable)
- Shared across all gateway instances

## Authentication

JWT tokens validated against Keycloak public key. Token must include:
- `sub` or `userId`: User identifier
- `preferred_username` or `username`: Username
- `email`: User email
- `realm_access.roles`: User roles

## License

MIT

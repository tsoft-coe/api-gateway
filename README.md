# API Gateway

API Gateway con routing, autenticación y rate limiting para BankApp.

## Desarrollo

```bash
npm install
npm run dev  # http://localhost:3000
npm test
```

## Rutas

- `/api/v1/accounts/*` → Account Service
- `/api/v1/transactions/*` → Transaction Service

Ver `../../DEVELOPMENT.md` para detalles completos de arquitectura y despliegue.


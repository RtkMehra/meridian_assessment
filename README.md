# MeridianSquare Backend

Production-grade NestJS backend for the MeridianSquare asset tokenization platform.

## Architecture

- **Framework**: NestJS 11 + Fastify
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport.js
- **Authorization**: Role-based access control (RBAC)
- **Security**: Helmet, CORS, rate limiting, AES-256-GCM encryption
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest with 50+ unit tests

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

## Quick Start

### Local Development

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Start PostgreSQL**
   ```bash
   # Using Docker
   docker run -d --name meridian-db \
     -e POSTGRES_USER=meridian \
     -e POSTGRES_PASSWORD=meridian_dev \
     -e POSTGRES_DB=meridian_dev \
     -p 5432:5432 \
     postgres:16-alpine
   ```

4. **Run the application**
   ```bash
   npm run start:dev
   ```

5. **Access the API**
   - API: `http://localhost:3000/api/v1`
   - Swagger docs: `http://localhost:3000/api/docs`
   - Health check: `http://localhost:3000/api/v1/health`

### Docker Deployment

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

## API Endpoints

### Authentication

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login with credentials | No |
| GET | `/api/v1/auth/health` | Auth service health | No |

### Users

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/api/v1/users` | List all users | admin, compliance_officer |
| GET | `/api/v1/users/:id` | Get user by ID | Any authenticated |
| POST | `/api/v1/users` | Create user | admin |
| PUT | `/api/v1/users/:id` | Update user | Any authenticated |
| PUT | `/api/v1/users/:id/status` | Update user status | admin |
| DELETE | `/api/v1/users/:id` | Delete user | admin |

### KYC

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/api/v1/kyc` | List all KYC records | admin, kyc_reviewer, compliance_officer |
| GET | `/api/v1/kyc/:id` | Get KYC record | Any authenticated |
| GET | `/api/v1/kyc/user/:userId` | Get user's KYC records | Any authenticated |
| POST | `/api/v1/kyc` | Submit KYC verification | Any authenticated |
| PUT | `/api/v1/kyc/:id` | Update KYC (approve/reject) | kyc_reviewer, admin, compliance_officer |

### Assets

| Method | Path | Description | Roles |
|--------|------|-------------|-------|
| GET | `/api/v1/assets` | List all assets | Any authenticated |
| GET | `/api/v1/assets/:id` | Get asset by ID | Any authenticated |
| GET | `/api/v1/assets/status/:status` | Get assets by status | Any authenticated |
| POST | `/api/v1/assets` | Create asset | asset_manager, admin |
| PUT | `/api/v1/assets/:id` | Update asset | asset_manager, admin |
| POST | `/api/v1/assets/:id/approve` | Approve asset | admin, compliance_officer |
| DELETE | `/api/v1/assets/:id` | Delete asset | asset_manager, admin |

### Blockchain

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/blockchain/erc3643/status` | ERC-3643 status | Any authenticated |
| POST | `/api/v1/blockchain/tokenize` | Tokenize asset | Any authenticated |

## User Roles

- `investor` - Default role, can view assets and submit KYC
- `kyc_reviewer` - Can review and approve/reject KYC submissions
- `asset_manager` - Can create and manage assets
- `compliance_officer` - Can view all records and approve assets
- `admin` - Full access to all operations
- `operations` - Operational tasks

## Security Features

- **JWT Authentication**: Bearer token-based auth with configurable expiration
- **RBAC**: Role-based authorization guards on all endpoints
- **Encryption**: AES-256-GCM for PII and sensitive data at rest
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Configurable request limits per IP
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers (CSP, X-Frame-Options, etc.)
- **Input Validation**: class-validator DTOs with whitelist
- **Audit Logging**: Immutable audit trail for all operations

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `API_PREFIX` | API path prefix | `api/v1` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database user | `meridian` |
| `DB_PASSWORD` | Database password | - |
| `DB_NAME` | Database name | `meridian_dev` |
| `JWT_SECRET` | JWT signing key | - |
| `JWT_EXPIRATION` | Token expiry | `24h` |
| `ENCRYPTION_KEY` | AES encryption key | - |
| `CORS_ORIGIN` | Allowed origins | `*` |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `60000` |

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov
```

## Database Migrations

```bash
# Create migration
npm run db:migrate:create migration-name

# Run migrations
npm run db:migrate:run

# Revert last migration
npm run db:migrate:revert
```

## Project Structure

```
src/
├── auth/           # JWT authentication
├── users/          # User management
├── kyc/            # KYC verification
├── assets/         # Asset registry
├── blockchain/     # Blockchain tokenization
├── audit/          # Audit logging
├── common/         # Shared utilities
│   ├── encryption.service.ts
│   ├── config.service.ts
│   ├── database.config.ts
│   ├── env.validation.ts
│   ├── global-exception.filter.ts
│   ├── logging.interceptor.ts
│   ├── audit.interceptor.ts
│   ├── roles.guard.ts
│   ├── jwt-auth.guard.ts
│   └── audit.decorator.ts
├── app.module.ts
└── main.ts
```

## Assessment Documentation

See `docs/assessment/` for:
- Backend assessment submission
- Architecture diagrams
- Submission checklist

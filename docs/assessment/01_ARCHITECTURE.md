# Deliverable 1: High-Level Architecture Diagram

## Backend Stack Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                        │
│              Web App │ Mobile App │ Admin Portal │ Third-Party APIs               │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │ HTTPS/TLS 1.3
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  1. API LAYER                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  Fastify (NestJS 11) │ Global Prefix: /api/v1                              │  │
│  │  Security: Helmet (CSP, HSTS) │ CORS │ Rate Limiting (100 req/60s)        │  │
│  │  Validation: class-validator (whitelist, forbidNonWhitelisted)             │  │
│  │  Error Handling: Global Exception Filter (no stack traces in prod)         │  │
│  │  Documentation: Swagger/OpenAPI at /api/docs                               │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│  Controllers: Auth │ Users │ KYC │ Assets │ Blockchain                          │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  2. AUTHENTICATION & AUTHORIZATION                                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  Phase 1: JWT (local) │ Phase 2: Keycloak OIDC (self-hosted, UAE region)  │  │
│  │  Guards: JwtAuthGuard │ RolesGuard                                         │  │
│  │  RBAC: 6 roles — investor, kyc_reviewer, asset_manager,                    │  │
│  │          compliance_officer, admin, operations                             │  │
│  │  Resource ownership: assertSelfOrPrivileged() on all user-scoped endpoints │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  3. USER ONBOARDING & KYC INTEGRATION                                            │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  Registration → JWT issuance → KYC submission → Review → Approve/Reject    │  │
│  │  Phase 1: Internal KYC workflow with encrypted document metadata           │  │
│  │  Phase 2: KYC provider adapter (SumSub/Onfido) with webhook callbacks      │  │
│  │  AML flagging, jurisdiction checks, KYC expiry (1 year), re-verification   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  4. DATABASE LAYER                                                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL 16 (ACID-compliant) │ TypeORM                                   │  │
│  │  Entities: User │ KycRecord │ Asset │ AuditLog                             │  │
│  │  UUID primary keys │ Soft deletes (no hard deletes) │ Indexed queries       │  │
│  │  Relations: User 1:N KYC │ User 1:N CreatedAssets                          │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  5. EVENT & MESSAGE LAYER                                                        │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  Phase 1: EventEmitterPublisher (in-memory, Node.js EventEmitter)          │  │
│  │  12 event types: USER_*, KYC_*, ASSET_*, TOKEN_*                           │  │
│  │  DomainEvent interface: event, timestamp, payload, correlationId           │  │
│  │  Phase 3: Replace with RabbitMQ (AMQP) for cross-process messaging         │  │
│  │  Dead-letter queue, event replay, guaranteed delivery                      │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  6. SMART CONTRACT / ERC-3643 INTEGRATION                                        │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  ERC3643Service: BlockchainProvider interface + mock/production modes      │  │
│  │  Operations: getTokenInfo, checkIdentityStatus, mintTokens,                │  │
│  │               transferTokens, pauseTransfers                               │  │
│  │  Phase 1: Mock mode (simulated tx hashes, no on-chain interaction)         │  │
│  │  Phase 3: ethers.js v6 + Polygon RPC + T-REX contract deployment           │  │
│  │  Identity registry (ONCHAINID) for on-chain compliance                     │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  7. FIREBLOCKS CUSTODY INTEGRATION                                               │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  FireblocksService: FireblocksProvider interface + mock/production modes   │  │
│  │  Operations: getVaultAccount, createTransaction, getTransaction            │  │
│  │  Phase 1: Mock mode (simulated vault balances, tx IDs)                     │  │
│  │  Phase 3: Fireblocks REST API (MPC signing, transaction policies)          │  │
│  │  We never hold private keys — Fireblocks manages MPC key shards            │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  8. DOCUMENT STORAGE                                                             │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  DocumentStorageService: mock mode (Phase 1) → S3/MinIO (Phase 2)         │  │
│  │  Operations: upload, getPresignedUploadUrl, getPresignedDownloadUrl, delete│  │
│  │  Presigned URLs: 15min for upload, 1hr for download                        │  │
│  │  S3 server-side encryption (SSE-S3) + application-level AES-256-GCM        │  │
│  │  Cloud-agnostic: S3-compatible API works with AWS, MinIO, Cloudflare R2    │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  9. AUDIT LOGGING                                                                │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  AuditInterceptor (auto-capture IP, user-agent, response time)             │  │
│  │  @AuditLog decorator (declarative action + resource type on endpoints)     │  │
│  │  AuditEntity: append-only, SHA-256 content hash for tamper detection       │  │
│  │  Indexed on: userId, resourceId, action, createdAt                         │  │
│  │  Phase 2: Previous-hash chaining, before/after diff capture                │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  10. MONITORING & OBSERVABILITY                                                  │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  Current: Health check (/api/v1/health) │ Fastify (pino) JSON logging      │  │
│  │           NestJS Logger │ Request logging interceptor (method, path, ms)   │  │
│  │  Phase 4: OpenTelemetry (tracing) │ Prometheus (metrics) │ Grafana (dash) │  │
│  │           Log aggregation (Loki/ELK) │ Alerting (PagerDuty/Slack)          │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  11. ENCRYPTION & KEY MANAGEMENT                                                 │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  AES-256-GCM for PII (KYC docs, user metadata)                             │  │
│  │  bcrypt (cost 10) for passwords                                             │  │
│  │  SHA-256 for audit log integrity hashes                                     │  │
│  │  Phase 1: Key from ENCRYPTION_KEY env (SHA-256 derived)                    │  │
│  │  Phase 3+: AWS KMS / HashiCorp Vault with auto-rotation                    │  │
│  │  Fireblocks keys: RSA secret in Vault, never in code or env                │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┴───────────────────────────────────────────────┐
│  12. ADMIN & OPERATIONS LAYER                                                    │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │  RBAC across all endpoints (admin, compliance, operations roles)           │  │
│  │  Swagger UI at /api/docs for admin API exploration                         │  │
│  │  Phase 4: Admin web portal (user management, KYC review, asset approval)   │  │
│  │           Operations dashboards (Grafana) │ Incident response procedures   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                     CLOUD PORTABILITY STRATEGY                                   │
│                                                                                  │
│  AWS-Native (Acceptable)          │ Open-Source / Portable (Preferred)           │
│  ────────────────────────────────  │ ──────────────────────────────────────────  │
│  S3 (document storage)            │ MinIO (S3-compatible, self-hosted)          │
│  RDS/PostgreSQL                   │ PostgreSQL (runs on any cloud/on-prem)      │
│  KMS (key management, Phase 3+)   │ HashiCorp Vault (cloud-agnostic)            │
│  ECS/EKS (deployment)             │ Docker + Kubernetes (any cloud)             │
│  CloudWatch (logging)             │ OpenTelemetry + Loki/ELK (portable)         │
│                                  │                                             │
│  Principle: Use AWS where it provides  │ Use open-source where lock-in risk     │
│  significant value (S3, RDS) but    │ outweighs convenience (monitoring,       │
│  keep abstraction layers for easy   │ messaging, key management).              │
│  migration. All app code is cloud-  │                                        │
│  neutral — no AWS SDK in core logic.│                                        │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                     UAE DATA RESIDENCY                                          │
│                                                                                  │
│  All data stored in AWS me-central-1 (UAE) region                               │
│  Keycloak deployed in UAE region for OIDC                                      │
│  KYC provider with UAE data processing agreement (SumSub regional endpoint)    │
│  PostgreSQL backups encrypted and stored in UAE region                          │
│  S3 buckets configured with me-central-1 region constraint                      │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Module-to-Code Map

| Architecture Layer | Code Location | Status |
|---|---|---|
| API Layer | `src/main.ts`, `src/*/` controllers | Complete |
| Auth & AuthZ | `src/auth/`, `src/common/guards/` | Complete |
| User & KYC | `src/users/`, `src/kyc/` | Complete |
| Database | `src/common/config/database.config.ts`, entities | Complete |
| Events | `src/common/events.types.ts`, `event-emitter.publisher.ts` | Complete (Phase 1) |
| ERC-3643 | `src/blockchain/erc3643.service.ts` | Mock complete, prod stubbed |
| Fireblocks | `src/blockchain/fireblocks.service.ts` | Mock complete, prod stubbed |
| Document Storage | `src/common/storage/document-storage.service.ts` | Mock complete, S3 stubbed |
| Audit Logging | `src/audit/`, `src/common/interceptors/audit.interceptor.ts` | Complete |
| Monitoring | `src/app.controller.ts` (health), logging interceptor | Complete (Phase 1) |
| Encryption | `src/common/encryption.service.ts` | Complete |
| Admin/Ops | RBAC controllers, Swagger UI | Complete |

# Deliverable 3: Implementation Roadmap

## Phase 1: Foundation — User Management, Authentication, RBAC, Audit Logging
**Timeline: Weeks 1-4 | STATUS: COMPLETE**

### Deliverables
- [x] NestJS + Fastify project scaffold with `/api/v1` global prefix
- [x] PostgreSQL + TypeORM with 4 entities (User, KycRecord, Asset, AuditLog)
- [x] JWT authentication with bcrypt password hashing
- [x] Role-based access control (6 roles: investor, kyc_reviewer, asset_manager, compliance_officer, admin, operations)
- [x] User management CRUD with soft deletes (no hard deletes for compliance)
- [x] Audit logging — append-only, SHA-256 content hash, indexed queries
- [x] Security middleware: Helmet, CORS, rate limiting, input validation, global exception filter
- [x] Swagger/OpenAPI documentation at `/api/docs`
- [x] Docker + docker-compose for local development
- [x] Unit tests (55 passing, Jest)

### Exit Criteria
- All endpoints authenticated and role-protected
- Audit log captures every authenticated action
- Production build succeeds with zero errors
- API documentation accessible and complete

---

## Phase 2: KYC / Onboarding — KYC Provider Integration, Investor Status, Compliance States
**Timeline: Weeks 5-9**

### Deliverables
- [ ] Keycloak/OIDC deployment (AWS me-central-1 UAE region)
  - Configure realms, clients, role mapping from existing RBAC
  - Token introspection and refresh flows
  - MFA enforcement for admin/compliance roles
- [ ] KYC provider integration (SumSub preferred for UAE/VARA compliance)
  - Provider adapter interface (already designed in codebase)
  - Webhook endpoint for provider callbacks (document verification, AML screening)
  - KYC status synchronization with internal KycRecord
  - AML flagging and jurisdiction-specific compliance rules
- [ ] Document storage (AWS S3 with MinIO fallback for portability)
  - Enable S3 SDK code paths (already stubbed in `document-storage.service.ts`)
  - Server-side encryption (SSE-S3) + application-level AES-256-GCM (defense in depth)
  - Presigned URLs for secure upload/download (15min upload, 1hr download)
  - S3 lifecycle policies: 7-year retention → Glacier → secure deletion
- [ ] Audit logging enhancements
  - Previous-hash chaining (each entry hashes the prior entry's hash for tamper evidence)
  - Before/after diff capture for update operations
  - Tamper verification endpoint for compliance audits

### Dependencies
- Keycloak instance deployed and configured in UAE region
- SumSub (or equivalent) API credentials and sandbox access
- AWS S3 bucket provisioned in me-central-1
- Network connectivity to external KYC provider

### Risk Mitigation
- Keycloak deployment delays: Phase 1 JWT allows parallel development
- KYC provider API changes: Adapter interface abstracts provider specifics

---

## Phase 3: Asset / Property Registry — Property Records, Documents, Token Metadata
**Timeline: Weeks 10-12**

### Deliverables
- [ ] Enhanced asset registry
  - Property document upload via presigned S3 URLs (title deeds, valuations, legal opinions)
  - Asset metadata encryption (valuation, ownership history, encumbrances)
  - Asset approval workflow with compliance officer sign-off
  - Asset lifecycle tracking: draft → under_review → approved → tokenized → retired
- [ ] Token metadata layer
  - Token-to-asset mapping (ERC-3643 contract address per asset)
  - Token holder registry (off-chain cache of on-chain ownership)
  - Dividend distribution records (phase 4)
- [ ] Secondary market preparation
  - Transfer restriction rules engine (jurisdiction, KYC status, holding period)
  - Whitelist management for approved investors
  - Trading suspension capability (regulatory hold)

### Dependencies
- Phase 2 complete (KYC, document storage)
- Legal framework for UAE property tokenization

---

## Phase 4: Tokenization Integration — ERC-3643 Contract Integration, Token Lifecycle, Transfer Restrictions
**Timeline: Weeks 13-16**

### Deliverables
- [ ] ERC-3643 production integration
  - Deploy T-REX contracts to Polygon Amoy testnet
  - Enable ethers.js v6 code paths (already stubbed in `erc3643.service.ts`)
  - Identity registry (ONCHAINID) — register approved investors on-chain
  - Transfer restriction enforcement at contract level (not just off-chain)
  - Token minting workflow: asset approval → contract deployment → initial mint
- [ ] Fireblocks production integration
  - Enable Fireblocks API code paths (already stubbed in `fireblocks.service.ts`)
  - Vault account management, transaction policy configuration
  - MPC signing workflow — we never hold private keys
  - Transaction status monitoring and reconciliation
- [ ] End-to-end tokenization flow
  - Investor compliance checks before token transfer (KYC status, jurisdiction, AML)
  - Secondary market transfers with on-chain identity verification
  - Emergency pause capability (contract owner via Fireblocks MPC)
- [ ] RabbitMQ event bus (replace EventEmitterPublisher)
  - Guaranteed delivery for tokenization events
  - Dead-letter queue for failed event processing
  - Event replay capability for audit reconstruction

### Dependencies
- Polygon testnet RPC access and test MATIC
- Fireblocks API credentials and vault account provisioned
- ERC-3643 contracts audited and deployed to testnet
- RabbitMQ instance deployed

### Risk Mitigation
- Smart contract vulnerabilities: Formal audit before mainnet, testnet validation first
- Fireblocks integration complexity: Phase 3 dedicated with buffer time, mock mode developed first

---

## Phase 5: Production Hardening (Optional — Post-Assessment)
**Timeline: Weeks 17-20**

### Deliverables
- [ ] Infrastructure: Terraform IaC, Kubernetes (UAE region), TLS, auto-scaling
- [ ] Observability: OpenTelemetry, Prometheus, Grafana, log aggregation (Loki)
- [ ] Security: Penetration testing, secret rotation (KMS/Vault), WAF, network policies
- [ ] Performance: Load testing (k6), Redis caching, connection pooling (PgBouncer)
- [ ] Compliance: Data retention enforcement, UAE residency verification, audit reports
- [ ] CI/CD: GitHub Actions pipeline, staging environment parity, runbooks

---

## Timeline Summary

```
Week  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
      ├────────────┤  Phase 1: Foundation (DONE)
                  ├─────────────┤  Phase 2: KYC/Onboarding
                                ├──────┤  Phase 3: Asset Registry
                                       ├──────────┤  Phase 4: Tokenization
                                                  ├─────┤  Phase 5: Production
```

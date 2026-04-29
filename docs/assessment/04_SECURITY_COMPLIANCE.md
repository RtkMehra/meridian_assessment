# Deliverable 4: Security & Compliance Notes

## PII Encryption

| Data Type | Encryption Method | At Rest | In Transit | In Backups | In Logs |
|---|---|---|---|---|---|
| User identity (name, email) | AES-256-GCM | Encrypted in DB `encryptedMetadata` column | TLS 1.3 | Encrypted backup files | Masked (email: `jo****@example.com`) |
| KYC documents (passport, ID) | AES-256-GCM + S3 SSE-S3 | Double-encrypted: app-level + S3 server-side | TLS 1.3 | Encrypted | Never logged |
| KYC document metadata | AES-256-GCM | Encrypted in `encryptedDocumentData` column | TLS 1.3 | Encrypted | Never logged |
| Financial data (valuations) | AES-256-GCM | Encrypted in asset `encryptedMetadata` | TLS 1.3 | Encrypted | Masked |

**Implementation:** `src/common/encryption.service.ts`
- Format: `base64_iv:base64_tag:hex_encrypted` (random IV per operation)
- Identical plaintext produces different ciphertext (IV randomization)
- PII masking utility for safe logging: email masking, card number masking

## Financial Data Encryption

- **Asset valuations, token amounts, transaction values**: Encrypted at rest via AES-256-GCM in asset `encryptedMetadata` column
- **Blockchain transactions**: Transaction hashes stored plain (public on-chain), but investor wallet addresses mapped via encrypted internal records
- **Fireblocks transaction data**: Transaction IDs stored plain (for reconciliation), but amounts and destination addresses encrypted
- **Audit logs**: Content hashed (SHA-256) for integrity — the hash proves the record hasn't been tampered with, but sensitive values within metadata are encrypted before hashing

## Encryption Key Management & Fireblocks Integration

| Key Type | Current (Phase 1) | Production (Phase 3+) | Rotation |
|---|---|---|---|
| AES-256-GCM (PII) | `ENCRYPTION_KEY` env → SHA-256 derived | AWS KMS or HashiCorp Vault | Every 90 days (KMS auto-rotation) |
| JWT signing secret | `JWT_SECRET` env var | Keycloak-managed, per-policy rotation | Per Keycloak policy (default 30 days) |
| Fireblocks API key | Not configured | Stored in Vault/Secrets Manager | Per organizational policy |
| Fireblocks RSA secret | Not configured | Stored in Vault with restricted access | Never — asymmetric, rotate public key only |
| Database credentials | `.env` file | AWS Secrets Manager or Vault | Every 30 days (automated) |

**Fireblocks-specific security:**
- We **never hold private keys** — Fireblocks manages MPC key shards across geographically distributed nodes
- Transaction policies enforce multi-approval workflows (e.g., 2-of-2 for transactions >$10K)
- All Fireblocks API calls authenticated via JWT signed with RSA private key (stored in Vault)
- Fireblocks transaction IDs logged to our audit trail for cross-referencing
- Production: Fireblocks webhooks verified via HMAC signature to prevent spoofed callbacks

## Secrets Management

| Phase | Approach | Rationale |
|---|---|---|
| Phase 1 | `.env` file (gitignored) | Sufficient for development, not production |
| Phase 2 | AWS Secrets Manager | Native AWS integration, encrypted at rest, IAM-based access control |
| Phase 3+ | HashiCorp Vault (portable alternative) | Cloud-agnostic, dynamic secrets, audit logging, auto-rotation |

**Principles:**
- No secrets in source code, commit history, or CI/CD logs
- Secrets injected at runtime (env vars from Secrets Manager/Vault)
- Access via IAM roles (least privilege) — application role only gets secrets it needs
- Secret rotation without service restart (hot-reload supported by Vault SDK)

## Role-Based Permissions

6 roles following principle of least privilege:

| Role | Capabilities | Restrictions |
|---|---|---|
| **investor** | View own profile, submit own KYC, view own KYC status | Cannot view other users' data, cannot approve anything |
| **kyc_reviewer** | List all KYC records, approve/reject KYC submissions | Cannot manage users, cannot approve assets or deploy contracts |
| **asset_manager** | Create/update assets, initiate tokenization requests | Cannot approve own assets (separation of duties) |
| **compliance_officer** | View all KYC, approve assets, view audit logs | Cannot manage users or deploy contracts |
| **admin** | Full access to all endpoints | — |
| **operations** | Health checks, monitoring dashboards | Read-only — cannot modify data or approve anything |

**Enforcement layers (defense in depth):**
1. `JwtAuthGuard` — validates JWT signature and expiration
2. `RolesGuard` — checks `@Roles()` decorator metadata on controller methods
3. `assertSelfOrPrivileged()` — verifies resource ownership OR elevated role for user-scoped operations
4. Database-level: Row-level security policies (Phase 4) for direct DB access protection

## Audit Logs

- **Append-only**: `AuditEntity` has no UPDATE or DELETE operations — records are immutable once written
- **Content hash**: Each entry includes SHA-256 hash of the record payload for tamper detection
- **Indexed queries**: On `userId`, `resourceId`, `action`, `createdAt` for efficient compliance reporting
- **Auto-capture**: `AuditInterceptor` captures IP address, user-agent, response time on every decorated endpoint
- **Declarative**: `@AuditLog(AuditAction.KYC_APPROVED, 'kyc')` on controller methods specifies what to log

**What we log:**
- User lifecycle: create, update, login, logout, suspension
- KYC: submission, approval (with reviewer ID), rejection (with reason)
- Assets: creation, update, approval (with approver ID), retirement
- Blockchain: token minting, transfers (contract address, tx hash)
- Security: authentication failures, permission denied attempts

**Phase 2 enhancement**: Previous-hash chaining — each audit entry includes the hash of the prior entry, creating a cryptographic chain. Any modification breaks the chain.

## Data Retention

| Data Type | Retention Period | Method | Regulatory Basis |
|---|---|---|---|
| KYC documents | 7 years after account closure | S3 lifecycle: active → Glacier (5yr) → secure deletion (7yr) | UAE VARA, FATF |
| Audit logs | Indefinite | Database, no deletion, previous-hash chaining (Phase 2) | Financial regulation |
| User records | Indefinite (soft delete only) | Status set to INACTIVE — never hard deleted | Audit trail requirement |
| Asset records | Indefinite (soft delete = RETIRED) | Status-based retirement — never hard deleted | Asset provenance |
| JWT tokens | 24 hours | Stateless — no storage, auto-expire | Token lifecycle |
| Blockchain transactions | Indefinite | On-chain (immutable) + off-chain audit log | Regulatory reporting |

## Incident Response

1. **Detection**: Monitoring alerts (Phase 4), audit log anomaly detection, Fireblocks webhook alerts for unauthorized transaction attempts
2. **Containment**: Immediate key rotation via KMS/Vault, revoke Fireblocks API keys, suspend affected user accounts, pause smart contract transfers if compromise suspected
3. **Investigation**: Audit log forensics using content hash verification and previous-hash chain validation, Fireblocks transaction audit trail, database query log analysis
4. **Recovery**: Database restore from encrypted backups, re-deploy from versioned infrastructure (Terraform), re-issue credentials via Keycloak
5. **Notification**: Regulator notification per UAE VARA requirements within 72 hours, user notification for PII breaches, Fireblocks incident team coordination if custody involved

**Runbook items:**
- Key rotation procedure: documented, tested quarterly
- Database restore procedure: tested monthly
- Fireblocks emergency contact: 24/7 support channel established

## Secure API Access

- **Authentication required**: All endpoints require valid JWT except `/api/v1/health`, `/api/docs`, `/auth/register`, `/auth/login`
- **Rate limiting**: 100 requests per 60 seconds per IP (configurable via env), prevents brute force and DDoS
- **Security headers**: Helmet enforces CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- **CORS**: Explicit origins only — no wildcards with credentials enabled. Comma-separated multi-origin support for environment-specific allowlists
- **Input validation**: `class-validator` with `whitelist: true` (strips unknown fields) and `forbidNonWhitelisted: true` (rejects requests with unexpected fields)
- **Error handling**: Global exception filter returns structured errors — no stack traces, no internal paths, no database details in production
- **Request logging**: Method, path, status code, duration logged — no request body (avoids logging credentials or PII)

## Smart Contract Integration Risk

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Contract vulnerabilities (re-entrancy, overflow) | Critical | Low | Use OpenZeppelin-audited T-REX reference implementation. Formal verification before mainnet. Testnet validation first. |
| Identity registry spoofing | High | Low | ONCHAINID on-chain identity requires off-chain KYC verification. Identity claims must be signed by trusted issuer (our backend via Fireblocks MPC). |
| Transfer restriction bypass | High | Medium | Restrictions enforced at contract level (ERC-3643), not just off-chain. Contract checks identity registry before every transfer. |
| Private key compromise (signing) | Critical | Low | Fireblocks MPC — no single key exists. Requires multiple parties to sign. Transaction policies enforce approval workflows. |
| Gas price spikes / failed transactions | Medium | Medium | Transaction fee estimation with cap, retry logic with exponential backoff, alerting on repeated failures. |
| Network congestion (Polygon) | Medium | Low | Monitor Polygon network status, fallback to higher gas, queue transactions during congestion. |
| Contract upgrade risk | High | Low | ERC-3643 contracts are immutable. If upgrade needed, deploy new contract and migrate token holders via controlled transfer. |
| Regulatory change (UAE VARA) | High | Medium | Modular compliance layer — rules engine is configurable. Legal review checkpoints before each phase. Adapter pattern allows rapid compliance updates. |

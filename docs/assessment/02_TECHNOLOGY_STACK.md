# Deliverable 2: Technology Stack Recommendation

## Evaluation Criteria Applied
For each component, selections are evaluated against: (1) Maintainability, (2) Community, (3) Documentation, (4) Security, (5) License, (6) Performance, (7) Compliance, (8) Portability.

---

## API Layer

| Component | Choice | Alternatives | Reason |
|---|---|---|---|
| Framework | **NestJS 11 + Fastify** | Express, Koa, Go (Gin), Spring Boot | NestJS provides DI, modular architecture, TypeScript-first. Fastify delivers 2-3x throughput over Express. Express rejected for lower performance. Go rejected — strong but would lose TypeScript type safety across stack. Spring Boot rejected — heavier footprint, slower startup, Java ecosystem overhead. |
| API Docs | **Swagger/OpenAPI** | GraphQL, Redoc, Stoplight | Standard REST with auto-generated interactive docs. GraphQL rejected — adds schema complexity without benefit for CRUD-heavy system with few cross-resource queries. |
| Validation | **class-validator + class-transformer** | Joi, Zod, Yup | Native NestJS integration, DTO-level decorators. Zod considered — excellent DX but requires manual pipe integration. Joi rejected — less TypeScript-friendly. |

**Criteria**: (1) NestJS: monthly releases, 12+ year lifespan (2) 30k+ GitHub stars, large ecosystem (3) Official docs excellent, enterprise tutorials (4) Security patches within days, OWASP-aligned defaults (5) MIT license (6) Fastify handles 40k+ req/s on commodity hardware (7) Built-in guards, interceptors, validation for compliance (8) Cloud-neutral, runs anywhere Node.js runs.

---

## Authentication & Authorization

| Component | Choice | Alternatives | Reason |
|---|---|---|---|
| Auth Provider | **JWT (Phase 1) → Keycloak OIDC (Phase 2)** | Auth0, Okta, AWS Cognito, Supabase Auth | JWT enables immediate development without external dependency. Keycloak provides self-hosted OIDC with UAE data residency control. Auth0/Okta rejected — SaaS introduces vendor lock-in and UAE data residency uncertainty. Cognito rejected — AWS lock-in. |
| Password Hashing | **bcrypt (cost 10)** | Argon2id, scrypt | Industry standard, proven against GPU attacks. Argon2 considered — technically superior (memory-hard) but bcrypt has wider adoption, more audit history, and sufficient security for current scale. |
| RBAC Engine | **Custom Guards + Decorators** | CASL, OPA (Open Policy Agent) | Guard pattern integrates cleanly with NestJS request lifecycle. CASL considered — overkill for 6 roles with simple hierarchy. OPA rejected — adds operational complexity for current needs. |

**Criteria**: (1) Keycloak: active Red Hat project, quarterly releases (2) Massive enterprise adoption, active forums (3) Comprehensive admin guide, API docs (4) CVE response within 24h, FIPS 140-2 validated modules (5) Apache 2.0 (6) Handles 10k+ concurrent auth sessions (7) OIDC standard, SAML support, audit logs built-in (8) Self-hosted, runs on any infrastructure.

---

## Database Layer

| Component | Choice | Alternatives | Reason |
|---|---|---|---|
| Database | **PostgreSQL 16** | MySQL 8, MongoDB, DynamoDB | ACID compliance required for financial records and audit trails. Native JSONB for flexible metadata. Strong indexing, row-level security. MySQL rejected — weaker JSON support, less robust concurrency. MongoDB rejected — eventual consistency conflicts with financial audit requirements. DynamoDB rejected — AWS lock-in, eventual consistency. |
| ORM | **TypeORM** | Prisma, Drizzle, raw SQL | Mature NestJS integration, entity-relation mapping, migrations. Prisma considered — excellent DX and type safety but less flexible for complex financial queries and dynamic filtering. Drizzle rejected — newer ecosystem, less NestJS integration maturity. |

**Criteria**: (1) PostgreSQL: 30+ year project, annual major releases (2) Largest open-source DB community, 1000+ extensions (3) Official docs comprehensive, community tutorials abundant (4) CVE patches within weeks, SELinux support, row-level security (5) PostgreSQL License (BSD-like) (6) Handles millions of TPS with proper indexing, connection pooling (7) ACID, audit-friendly, regulatory compliance standard (8) Runs on any OS, any cloud, on-prem.

---

## KYC Integration

| Component | Choice | Alternatives | Reason |
|---|---|---|---|
| Provider Adapter | **Provider Interface Pattern** | Direct SumSub/Onfido SDK | Adapter interface enables swapping providers without service changes. SumSub favored for UAE compliance support and VARA alignment. Onfido considered — strong but less UAE-specific compliance coverage. Trulioo rejected — weaker global document coverage. |
| Document Storage | **S3-compatible (AWS S3 / MinIO)** | GCS, Azure Blob, IPFS | S3 is the industry standard for object storage. MinIO provides identical API for self-hosted/portable deployment. IPFS rejected — not suitable for PII (immutable, public by default). GCS/Azure rejected — cloud lock-in. |

**Criteria**: (1) MinIO: weekly releases, active development (2) 40k+ GitHub stars, CNCF project (3) Excellent docs, Kubernetes-native (4) TLS encryption, bucket policies, audit logging (5) AGPL v3 (self-hosted) / commercial (6) High-throughput, handles PB-scale (7) SOC 2, HIPAA, GDPR compliant (8) S3 API standard, runs on any infrastructure.

---

## Blockchain & Custody

| Component | Choice | Alternatives | Reason |
|---|---|---|---|
| Token Standard | **ERC-3643 (T-REX)** | ERC-20, ERC-1400, ERC-1155 | ERC-3643 built for permissioned securities with on-chain identity, transfer restrictions, and compliance enforcement. ERC-20 rejected — no transfer restrictions or identity. ERC-1400 rejected — superseded by ERC-3643 for security tokens. |
| Network | **Polygon (Amoy → mainnet)** | Ethereum, Arbitrum, Base | Low gas fees, EVM-compatible, institutional adoption for tokenized assets. Ethereum rejected — prohibitive gas costs for retail token transfers. Arbitrum/Base considered — good L2s but Polygon has stronger institutional tokenization adoption. |
| Contract Library | **ethers.js v6** | web3.js, viem | Modern API, TypeScript support, tree-shakable. web3.js rejected — older API design, larger bundle, slower adoption of EIPs. viem considered — excellent but newer ecosystem, less enterprise adoption. |
| Custody | **Fireblocks MPC** | Copper, BitGo, self-managed | Institutional MPC key management, transaction policies, audit trail. Fireblocks leads in regulated tokenization. Copper considered — strong but Fireblocks has broader institutional adoption. BitGo rejected — more focused on crypto-native custody. |

**Criteria**: (1) ethers.js: monthly releases, active EIP tracking (2) Used by most DeFi protocols, large community (3) Excellent API docs, migration guides (4) Audit-friendly, no known vulnerabilities in v6 (5) MIT license (6) Sub-100ms RPC calls, batched requests (7) EVM standard, Polygon official SDK (8) Network-agnostic, works with any EVM chain.

---

## Event & Messaging

| Component | Choice | Alternatives | Reason |
|---|---|---|---|
| Phase 1 | **Node.js EventEmitter** | RabbitMQ, Redis Pub/Sub | In-process is sufficient for monolith architecture. Zero operational overhead. RabbitMQ considered — adds unnecessary infrastructure for Phase 1. |
| Phase 3 | **RabbitMQ** | Apache Kafka, NATS, Redis Streams | AMQP provides guaranteed delivery, dead-letter queues, per-message routing. Kafka rejected — over-engineered for event volumes in tokenization (not log-aggregation scale). NATS considered — simpler but weaker ecosystem for enterprise patterns. |

**Criteria**: (1) RabbitMQ: Broadcom-backed, regular releases (2) 13k+ GitHub stars, decade of enterprise use (3) Comprehensive docs, management UI (4) Regular security patches, TLS/SASL support (5) MPL 2.0 / Apache 2.0 (6) 50k+ msg/s per node, clustered scaling (7) Message persistence, audit trail for every event (8) AMQP is open standard, runs anywhere.

---

## Infrastructure

| Component | Choice | Alternatives | Reason |
|---|---|---|---|
| Container | **Docker + docker-compose** | Podman, containerd | Industry standard, universal tooling, team familiarity. Podman considered — daemonless security benefit but less mature ecosystem. |
| Orchestration (Phase 4) | **Kubernetes** | AWS ECS, Google Cloud Run, Nomad | K8s provides autoscaling, self-healing, multi-region, and is cloud-agnostic. ECS rejected — AWS lock-in. Cloud Run rejected — GCP lock-in. |
| IaC (Phase 4) | **Terraform** | Pulumi, CloudFormation, CDK | Declarative, provider-agnostic, state management. Pulumi considered — programmatic IaC but smaller community. CloudFormation rejected — AWS lock-in. |

**Criteria**: (1) Terraform: HashiCorp-backed, monthly releases (2) Largest IaC community, 1000+ providers (3) Excellent docs, registry of modules (4) Regular security audits, Sentinel policies (5) BUSL 1.1 (open-source fork: OpenTofu available) (6) Plans infra changes before apply, no runtime perf impact (7) Enforces compliance through policy-as-code (8) Multi-cloud: AWS, GCP, Azure, on-prem.

---

## Observability

| Component | Choice | Alternatives | Reason |
|---|---|---|---|
| Logging | **pino (Fastify built-in)** | Winston, Bunyan, log4js | High-performance, JSON-structured, zero-config with Fastify. Winston rejected — slower, more boilerplate. |
| Metrics (Phase 4) | **Prometheus + Grafana** | Datadog, New Relic, CloudWatch | Open-source, self-hosted (UAE data residency), standard K8s integration. Datadog/New Relic rejected — SaaS lock-in, data leaves UAE. CloudWatch rejected — AWS lock-in. |
| Tracing (Phase 4) | **OpenTelemetry** | Jaeger-only, Zipkin | Industry standard, vendor-neutral, supports traces/metrics/logs. |

**Criteria**: (1) Prometheus: CNCF graduated, regular releases (2) Largest metrics ecosystem, 100+ exporters (3) Official docs excellent, Grafana integration (4) Security: TLS, basic auth, network policies (5) Apache 2.0 (6) Handles millions of time series, efficient storage (7) Audit metric collection, compliance dashboards (8) Cloud-agnostic, runs on any infrastructure.

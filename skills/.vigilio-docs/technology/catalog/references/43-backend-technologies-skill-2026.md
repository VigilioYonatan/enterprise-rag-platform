# Backend Technologies — Version-Aware Skill (Senior 2026)

> **MIRROR / NON-CANONICAL:** Preserved for the numbered documentation sequence. The editable canonical source is `backend-technologies-skill-2026.md`; do not evolve both copies independently. This mirror will be generated or checked by hash in a future documentation pipeline.

> **STATUS:** Target backend skill/reference for `vigilio-node-nest`.
>
> **Snapshot date:** 2026-08-08 (historical baseline). **Actualizacion verificada 2026-10-23:** NestJS 12.2.0 es una version estable; NestJS 11 permanece como baseline de consumidores existentes hasta migracion probada. Ver [nota 46](../../../stacks/backend/nestjs/http/references/46-zod-query-ddd-versiones-2026.md).
>
> **Purpose:** Prevent an AI coding agent from generating existente, deprecated, pre-release-mismatched, unsafe, or architecture-incompatible backend code.
>
> **Target architecture:** Node.js 24 LTS + NestJS 11 + Zod 4 / nestjs-zod + Drizzle ORM + PostgreSQL 17 + optional Valkey + OpenAPI 3.1 + Scalar + Pino + OpenTelemetry + AWS SDK for JavaScript v3 + EKS.
>
> **Recommended repository location:**
>
> `agent-plugins/vigilio-node-nest/skills/node-nest-technologies/references/technologies.md`
>
> **Required companion skill:**
>
> `agent-plugins/vigilio-engineering-core/skills/shared-technologies/references/technologies.md`
>
> This file is technical execution knowledge. It is **not** a source of product requirements, business rules, infrastructure truth, or OpenSpec behavior.

---

## 0. Skill contract

The backend coding agent MUST:

1. Read the real backend `package.json` and `pnpm-lock.yaml` before importing any package-specific API.
2. Load the shared technologies skill for TypeScript, Node, Zod, pnpm, Vitest, Biome, tsx, Git hooks, and shared contract rules.
3. Treat NestJS 11 as the existing target for this snapshot; NestJS 12.2.0 is stable as of 2026-10-23 but is NOT automatically compatible with consumer `nestjs-zod`/Swagger/plugins. Respect the repository lockfile and verify migration gates in doc 46.
4. Treat Drizzle APIs as **version-sensitive** because current public development includes a 1.0 release-candidate line.
5. Identify the actual PostgreSQL driver (`pg`, `postgres`, AWS Data API, etc.) before writing Drizzle bootstrap code.
6. Keep domain/application code independent from NestJS, Drizzle, AWS SDK, cache clients, and HTTP where the current architecture requires ports/adapters.
7. Validate request/query/params and serialize/validate responses at the HTTP boundary.
8. Keep OpenAPI generation aligned to the project's **OpenAPI 3.1** standard until an explicit change upgrades it.
9. Use database constraints and transactions as executable invariants, not application checks alone.
10. Use AWS SDK v3 only; AWS SDK v2 is end-of-support.
11. Use EKS Pod Identity/default credential chain rather than static AWS access keys.
12. Add cache, queue, event bus, workflow orchestration, or streaming only when a real requirement and repository/platform evidence justify it.
13. Preserve the modular-monolith boundary: local modules collaborate in-process, not through SQS/EventBridge merely for fashion.
14. Emit structured/redacted logs and propagate telemetry context when observability is present.
15. Fail closed when the architecture names a technology but the repository does not contain its actual runtime adapter.

The agent MUST NOT:

- generate NestJS 10 routing assumptions without checking NestJS 11/Express 5 semantics;
- add `class-validator`/`class-transformer` if the repository standard is Zod + `nestjs-zod`;
- use deprecated `nestjs-zod` guards/converters when the current API provides supported alternatives;
- invent `pg` or `postgres.js` as the driver;
- use Drizzle v1 RC-only APIs in a repository resolved to a stable 0.x line;
- use `drizzle-kit push` as the production migration strategy by default;
- call Drizzle rows public API DTOs automatically;
- use floating-point `number` for exact money at external boundaries;
- add Redis/Valkey clients without confirming the selected client;
- log authorization headers, cookies, passwords, tokens, secret values, or raw sensitive bodies;
- use AWS SDK v2 `aws-sdk` package;
- configure static AWS credentials in code, Kubernetes Secrets, or environment variables for an EKS workload when Pod Identity is the platform model;
- turn every local domain action into an event;
- implement distributed locks, outbox, Kafka, Step Functions, or cache because they look "senior";
- claim a deployment/IaC component exists when its owner is an external platform repository.

---

# 1. Source-of-truth precedence

For backend technology decisions:

```text
1. backend pnpm-lock.yaml / installed package resolution
2. backend package.json
3. backend source/config/tests/migrations
4. platform repo executable configuration when the question is infrastructure/runtime
5. package exports + bundled .d.ts
6. official docs for the resolved major/minor
7. official migration/release notes
8. shared technologies skill
9. this backend skill
10. community examples
11. model memory
```

Executable repository/platform evidence wins over prose.

### Fail-closed statuses

```text
BACKEND_STACK_OK
= dependency/API/runtime is verified.

BACKEND_VERSION_MISMATCH
= requested API belongs to another resolved version.

BACKEND_DRIVER_UNRESOLVED
= Drizzle/PostgreSQL driver is not confirmed.

CACHE_CLIENT_UNRESOLVED
= Valkey engine may be approved, but Node client is not established.

AWS_ADAPTER_UNRESOLVED
= AWS service is architecturally allowed but package/provider/adapter is not present.

OPENAPI_VERSION_GUARD
= requested code attempts to move contract away from project OpenAPI 3.1 without explicit change.

PRE_RELEASE_API_BLOCKED
= requested code relies on RC/beta API but repository does not resolve that pre-release.

LEGACY_API_BLOCKED
= API/pattern is deprecated or unsupported in the resolved line.
```

---

# 2. Target backend stack — architecture baseline

The master architecture currently establishes:

| Surface | Architecture baseline | Agent rule |
|---|---|---|
| Runtime | Node.js 24 LTS | exact 24.x patch from runtime/container/toolchain |
| Framework | NestJS 11 | exact patch from lockfile |
| Validation | Zod 4 | shared skill owns generic Zod semantics |
| Nest/Zod adapter | `nestjs-zod` | inspect installed version/API |
| Persistence | Drizzle ORM | exact resolved line mandatory |
| Database | PostgreSQL 17 | platform-managed service exact type must be evidenced |
| Cache engine | Valkey | only when adapter + infra + tests exist |
| Cache service | ElastiCache for Valkey | only when platform actually declares it |
| HTTP contract | OpenAPI 3.1 | do not auto-upgrade to 3.2 |
| API reference UI | Scalar | UI only; OpenAPI remains contract truth |
| Logging | Pino | exact adapter/package from repo |
| Telemetry | OpenTelemetry | only when real instrumentation exists |
| Tests | Vitest + risk-based integration/E2E | shared skill owns runner semantics |
| Cloud SDK | AWS SDK for JavaScript v3 | v2 forbidden |
| Compute | Kubernetes / Amazon EKS | platform runtime |
| IaC backend | Terraform/OpenTofu + Helm/GitOps externally owned | do not inject CDK into backend repo |
| Object storage | Amazon S3 | via backend adapter |
| Async | EventBridge + SQS/DLQ when justified | not local module RPC |
| Secrets | Secrets Manager / SSM | never hardcoded |
| Encryption | KMS when needed | via adapter/policy |
| Workflow | Step Functions only for long/external orchestration | not local transaction replacement |
| Streaming | MSK/Kafka only by ADR/real need | never default |

### Important version principle

The architecture fixes supported **technology lines**, not every exact package patch.

Example:

```text
NestJS 11      = architectural major
Nest 11.1.x    = repository-resolved implementation
```

Do not fabricate exact patches absent from lockfile.

---

# 3. Backend architecture boundaries

## 3.1 Default modular-monolith structure

Respect the existing repository layout first. The architecture's expected logical layering is:

```text
src/<feature>/
├── domain/                         # only when real domain behavior exists
├── application/
│   ├── dtos/
│   ├── repositories/              # ports + injection tokens
│   ├── schemas/
│   └── service/
├── infrastructure/
│   ├── http/controllers/
│   └── persistence/drizzle/
└── <feature>.module.ts
```

Do not create empty folders just to imitate DDD.

### Domain may depend on

```text
plain TypeScript
value objects/entities when behavior justifies them
pure domain policies
```

### Domain must not depend on by default

```text
NestJS decorators
Drizzle
AWS SDK
Pino transport details
HTTP request/response objects
Valkey client
SQS/EventBridge clients
```

### Application owns

```text
use cases/services
ports
transaction coordination
commands/queries when useful
business orchestration
```

### Infrastructure owns

```text
Drizzle adapters
AWS adapters
cache clients
queue/event clients
HTTP controllers
provider SDK details
```

### No fake layers

CRUD with no domain behavior does not require:

```text
entity
factory
mapper
domain service
aggregate abstraction
```

Use complexity only where behavior/invariants justify it.

---

# 4. Golden path for a backend use case

For a normal HTTP CRUD/business operation:

```text
base schema
   ↓
request + response Zod DTO
   ↓
repository port + injection token
   ↓
application service/use case
   ↓
Drizzle repository adapter
   ↓
controller
   ↓
Nest/Zod validation + response serialization
   ↓
module registration
   ↓
unit/integration/API/contract tests by risk
   ↓
OpenAPI export + compatibility diff
```

### Contract rules

- one canonical request DTO per operation;
- one canonical response DTO per operation;
- documentation-only DTO/adapters remain Nest/OpenAPI-only;
- persistence row is not automatically the response DTO;
- request and response types can intentionally differ;
- private fields are omitted by projection/response schema, not by hope;
- money/regulatory decimals are exact strings on the HTTP boundary unless the approved contract states otherwise.

---

# 5. NestJS 11

## 5.1 Current major

NestJS 11 was the target major for the original 2026-08-08 snapshot. As of 2026-10-23 NestJS 12.2.0 is released and stable (official Nest release history). The consumer's actual major and patch MUST come from its lockfile; migration to 12 requires compatibility verification for Zod/Swagger/Express adapters and a passing integration suite. Details: [doc 46](../../../stacks/backend/nestjs/http/references/46-zod-query-ddd-versiones-2026.md).

NestJS 11 requires Node 20+ and recommends a current LTS; this architecture uses Node 24 LTS.

## 5.2 Express 5 is the default platform behavior

NestJS 11 moved its Express integration to Express 5 by default.

Consequences:

- old route/wildcard syntax from Express 4 tutorials can be wrong;
- path-to-regexp matching changed;
- named wildcards are required in patterns where old anonymous wildcards were used;
- middleware route patterns must be checked against NestJS 11 migration guidance.

### Anti-existente

Do not generate old route patterns merely because they are widespread in NestJS 8/9/10 examples.

If a catch-all/wildcard route is required:

```text
inspect NestJS 11 + platform adapter syntax first
```

Do not guess between Express and Fastify semantics.

## 5.3 Platform adapter must be confirmed

Do not assume:

```text
@nestjs/platform-express
```

or:

```text
@nestjs/platform-fastify
```

from architecture prose alone.

Read the actual dependencies/bootstrap.

## 5.4 Controllers stay thin

Controller responsibilities:

```text
transport extraction
boundary validation
calling application use case
mapping known HTTP status/headers
response schema/documentation
```

Do not put:

```text
multi-step business rules
raw SQL
AWS SDK calls
cache implementation
cross-module data mutation
```

inside controllers.

## 5.5 Providers and dependency injection

Prefer explicit ports/tokens for infrastructure dependencies used by application services.

Example direction:

```ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findById(id: string): Promise<User | null>;
}
```

Module wiring owns adapter selection.

Do not use service locator/global container access in domain/application code.

## 5.6 Dynamic module warning in NestJS 11

NestJS 11 changed module resolution/deduplication behavior. Dynamic module object identity matters differently than older versions.

Agent rule:

```text
When tests or modules reuse a dynamic module:
  inspect current NestJS 11 behavior;
  do not rely on old deep-hash dedup assumptions.
```

This is especially relevant when stubbing dependencies in `TestingModule`.

## 5.7 Shutdown and lifecycle

For Kubernetes/EKS workloads:

- enable the project's graceful shutdown hooks;
- stop accepting new work during shutdown;
- close DB/cache/telemetry/client resources through their owning provider;
- allow in-flight HTTP/worker operations to complete within termination budget;
- do not leak open handles in tests.

Do not sprinkle `process.on('SIGTERM')` listeners across features when Nest/provider lifecycle can centralize ownership.

## 5.8 Exceptions

Expected failures should become explicit domain/application errors translated at the HTTP boundary.

Do not leak:

```text
Drizzle errors
PostgreSQL constraint text
AWS SDK raw error bodies
stack traces
internal resource names
```

as public API responses.

Unexpected failures remain 5xx and are logged/telemetried safely.

---

# 6. `nestjs-zod` + Zod 4

Generic Zod rules live in the shared technologies skill. This section owns the Nest adapter.

## 6.1 Current supported direction

The maintained `nestjs-zod` documentation supports Zod 4 and provides:

```text
createZodDto
ZodValidationPipe
ZodSerializerInterceptor
ZodResponse
cleanupOpenApiDoc
```

### Recommended setup direction

For a repository using `nestjs-zod`, the supported global pattern is conceptually:

```text
APP_PIPE        -> ZodValidationPipe/custom strict pipe
APP_INTERCEPTOR -> ZodSerializerInterceptor
OpenAPI         -> cleanupOpenApiDoc(...)
```

Do not add this blindly if the backend already exposes shared custom wrappers such as `ZodPipe`, `ZodQueryPipe`, or custom decorators. Existing executable conventions win.

## 6.2 `strictSchemaDeclaration`

Current `nestjs-zod` exposes a strict schema declaration option and recommends enabling it to catch request parameters that are not protected by a Zod DTO.

For a backend whose policy is "all external request data validated", strict mode is a good direction **if compatible with existing controllers**.

Do not flip it globally without verifying current routes/tests because doing so can expose unconverted endpoints.

## 6.3 `ZodResponse`

Current `nestjs-zod` recommends `ZodResponse` to keep:

```text
runtime response serialization
+
compile-time return shape
+
OpenAPI response schema
```

aligned.

Use the repository's shared wrapper (`@ZodResponse` in the master architecture) when it already encapsulates this pattern.

### Benefit

Response validation prevents accidental fields such as password hashes/internal flags from leaking merely because a repository query returned them.

## 6.4 `cleanupOpenApiDoc`

Current `nestjs-zod` requires/recommends post-processing the Nest Swagger document through `cleanupOpenApiDoc` for correct Zod/OpenAPI output.

Project rule:

```text
cleanup target = OpenAPI 3.1
```

unless an explicit OpenSpec/ADR/tooling migration changes it.

## 6.5 Deprecated APIs — block in new code

Current `nestjs-zod` documentation marks these directions deprecated/unsupported:

```text
zodV3ToOpenAPI        -> deprecated for Zod 4
validate helper       -> deprecated; use schema parse behavior
ZodGuard              -> deprecated
createZodGuard        -> deprecated
@nest-zod/z           -> no longer supported
```

Do NOT generate them for new Zod 4/NestJS 11 code.

### Guard responsibility

Use guards for authentication/authorization policy, not generic input validation.

Validation belongs at validated transport boundaries.

## 6.6 Do not introduce `class-validator` by reflex

Nest's official generic docs demonstrate `class-validator`, but this architecture chooses:

```text
Zod 4 + nestjs-zod/custom Zod boundary adapters
```

Therefore:

```text
official Nest default example != project architecture
```

Do not add `class-validator`/`class-transformer` unless an explicit migration/existente endpoint requires them.

---

# 7. Drizzle ORM — mandatory version gate

## 7.1 Why Drizzle requires extra care in 2026

The Drizzle project currently publishes a **1.0 pre-release/RC line** with breaking/new APIs, while many production repositories may still resolve a stable 0.x line.

Therefore:

```text
"latest Drizzle docs" alone are insufficient.
```

The agent MUST establish:

```text
drizzle-orm exact version
drizzle-kit exact version
PostgreSQL driver package
repository schema style
migration strategy
```

before writing persistence code.

### Pre-release gate

```text
if docs/example uses drizzle 1.0 RC API
and lockfile resolves stable 0.x:
    PRE_RELEASE_API_BLOCKED
```

Do not upgrade Drizzle as a side effect of implementing a feature.

## 7.2 Driver gate

Official Drizzle PostgreSQL docs support multiple drivers/initialization paths, including `node-postgres` and `postgres.js`.

Do not invent one.

Before code:

```text
check package.json for pg/postgres/etc.
check existing db bootstrap
check pool/lifecycle owner
```

### Forbidden

```ts
// ❌ Do not invent this merely because it is common.
import postgres from 'postgres';
```

if the repository actually uses `pg`.

## 7.3 Schema location

The master backend convention is:

```text
infrastructure/persistence/drizzle/schema.ts
```

or the actual existing equivalent.

Do not call a Drizzle table definition a domain entity.

```text
Drizzle schema/table = persistence model
Domain entity         = behavioral domain model when needed
HTTP DTO              = public contract
```

These are not interchangeable.

## 7.4 Constraints are executable invariants

Use database-level constraints when the database can guarantee the invariant:

```text
NOT NULL
UNIQUE
PRIMARY KEY
FOREIGN KEY
CHECK
```

Application validation improves UX/error semantics but does not replace DB concurrency guarantees.

### Example

For unique email:

```text
application checks friendly conflict
+
DB unique constraint guarantees race safety
```

## 7.5 Relations do not create foreign keys

Current Drizzle documentation explicitly separates relational-query metadata from database foreign-key constraints.

Agent rule:

```text
Drizzle relation abstraction != database FK
```

If referential integrity is required, declare/check the actual FK constraint.

## 7.6 Transactions

Use Drizzle transaction APIs for local atomic invariants.

Conceptual pattern:

```ts
await db.transaction(async (tx) => {
  // all writes that form one atomic business invariant
});
```

Nested transaction/savepoint APIs exist in supported lines, but exact semantics must match the resolved version/driver.

### Keep external side effects out of open DB transactions

Do not hold a transaction open while waiting for:

```text
email provider
S3 upload network call
EventBridge call
third-party payment gateway
long HTTP call
```

Use local transaction + outbox/state machine when external coordination is required.

## 7.7 Raw SQL

Drizzle's parameterized SQL/query APIs are preferred.

Raw SQL is allowed when:

```text
ORM cannot express query clearly
performance requires a deliberate query
PostgreSQL feature is not exposed well
migration needs exact DDL/data operation
```

Requirements:

```text
parameterized values
reviewed identifiers
integration test
query plan/performance evidence when critical
```

Never concatenate untrusted values into SQL.

## 7.8 Select only required columns

Avoid selecting full rows if the use case needs three fields.

Benefits:

```text
less I/O
less accidental sensitive-data propagation
clearer contract projection
better index opportunities
```

## 7.9 Index by query, not by table aesthetics

Create indexes from real access patterns:

```text
WHERE filters
JOIN keys
ORDER BY
unique/idempotency constraints
multi-tenant predicates
```

For compound indexes, order columns according to actual predicates/sort usage.

Do not generate an index for every column.

## 7.10 Migration strategy

For production, the preferred architecture is versioned SQL migrations reviewed in Git.

Current Drizzle tooling distinguishes:

```text
drizzle-kit generate -> generate SQL migration artifacts
drizzle-kit migrate  -> apply versioned migrations
drizzle-kit push     -> directly synchronize schema
```

Current Drizzle FAQ recommends `push` for local/local-database workflows rather than as the general production migration discipline.

### Production rule

```text
schema change
  ↓
generate/review SQL migration
  ↓
CI checks
  ↓
controlled migration execution
```

Do not run `push` automatically against production.

## 7.11 Expand-contract migrations

For backwards-compatible deployments:

```text
EXPAND
add nullable/new compatible structure
        ↓
DEPLOY COMPATIBLE CODE
old + new versions coexist
        ↓
BACKFILL
batches + checkpoints + metrics
        ↓
VERIFY
        ↓
CONTRACT
remove old shape in later release
```

Do not combine destructive DDL and code rollout when old pods/consumers may still exist.

---

# 8. PostgreSQL 17

PostgreSQL 17 is the architecture's database engine line. A managed service may host it, but service identity (RDS/Aurora/etc.) must come from platform evidence.

## 8.1 Identity columns

PostgreSQL 17 supports standard identity columns:

```sql
id bigint GENERATED ALWAYS AS IDENTITY
```

or:

```sql
id bigint GENERATED BY DEFAULT AS IDENTITY
```

For **new** generated numeric-key schemas, identity columns are a clear SQL-standard option.

Do not rewrite an existing `serial` schema merely for style during an unrelated change; Drizzle itself may still generate/use `serial` depending on schema/version.

## 8.2 UUIDs

If the product uses UUID/UUIDv7 or application-generated IDs, preserve that established policy.

Do not switch ID strategy without migration/contract implications being addressed.

## 8.3 Money and exact decimals

PostgreSQL `numeric/decimal` is appropriate for exact decimal arithmetic.

HTTP/public boundary in this architecture keeps exact monetary decimal values as strings.

```text
PostgreSQL NUMERIC
      ↓
backend exact representation/driver policy
      ↓
HTTP string decimal
```

Never silently convert exact financial values to JS `number`.

## 8.4 Time

Prefer explicit timezone semantics.

For absolute instants, `timestamptz` is generally the appropriate PostgreSQL concept.

Do not use server/local timezone assumptions as business logic.

Store business-local date/time separately when the domain truly represents a wall-clock schedule.

## 8.5 JSONB

Use JSONB for data that is genuinely document-like/flexible, not as an escape hatch from relational modeling.

If fields need:

```text
constraints
joins
frequent filtering
stable ownership
foreign keys
```

model them relationally when appropriate.

## 8.6 Generated columns

PostgreSQL 17 supports stored generated columns. Use only when the expression/invariant belongs in the database and operational tradeoffs are understood.

Do not duplicate application-calculated fields without a reason.

## 8.7 Constraints

Database constraints protect against races no pre-check can fully prevent.

Critical examples:

```text
unique business key
idempotency key
foreign ownership relationship
positive quantity
valid state combinations expressible as CHECK
```

Translate known constraint violations to explicit application/domain errors.

Do not expose raw constraint names publicly unless they are intentionally stable internal telemetry metadata.

## 8.8 Pagination

Choose pagination semantics by product/query shape.

Offset pagination:

```text
simple admin lists
bounded datasets
random page access needed
```

Keyset/cursor pagination:

```text
large/changing datasets
stable sequential navigation
high offset cost/problematic consistency
```

Always use deterministic ordering with a tie-breaker.

## 8.9 Query limits

Every externally influenced list query needs bounded limits.

```text
requested limit
    ↓ clamp
server maximum
```

Do not allow `limit=1000000` merely because Drizzle accepts it.

---

# 9. Valkey — optional cache, not source of truth

The architecture names Valkey as cache engine **only when runtime evidence exists**.

## 9.1 Cache adoption gate

Before adding cache code, confirm:

```text
port
adapter/client package
infra/service
key policy
TTL
invalidation strategy
fallback behavior
metrics
integration tests
```

If missing:

```text
CACHE_CLIENT_UNRESOLVED
```

Do not add cache just because a read is frequent.

## 9.2 Current Node client ecosystem

Valkey's official recommended client list includes:

```text
@valkey/valkey-glide
and iovalkey
```

Valkey GLIDE is an official Valkey project and supports Node.js with high-availability/cluster-focused features.

However:

```text
recommended ecosystem client != automatically selected project dependency
```

If repository does not declare GLIDE/iovalkey/current adapter, do not install one silently.

## 9.3 Cache-aside default direction

When cache is justified:

```text
read cache
  ├─ hit -> return trusted/deserialized cached value
  └─ miss
       ↓
     read PostgreSQL
       ↓
     cache with bounded TTL
       ↓
     return
```

PostgreSQL remains source of truth.

## 9.4 Key format

Use namespaced/versioned keys:

```text
<stage>:<bounded-context>:v<schema-version>:<entity>:<id>
```

Avoid accidental PII/secrets in keys.

## 9.5 Invalidation

After successful mutations:

```text
store/update/destroy
    ↓
commit source-of-truth transaction
    ↓
invalidate/update relevant cache
```

If invalidation fails, define fallback/metrics rather than corrupting source-of-truth transaction semantics.

## 9.6 No distributed-lock cargo cult

Do not use a cache lock to compensate for a missing database uniqueness/transaction invariant when PostgreSQL can enforce it.

Distributed locks require explicit ownership, timeout, fencing/lease semantics, failure handling, and tests.

---

# 10. OpenAPI 3.1 + Nest Swagger + Scalar

## 10.1 Project standard remains OpenAPI 3.1

OpenAPI 3.2 is now published globally, but this architecture deliberately standardizes on **3.1**.

Therefore:

```text
new global spec != automatic project migration
```

Any migration to OpenAPI 3.2 requires:

```text
OpenSpec/ADR
producer tooling verification
nestjs-zod compatibility
Nest Swagger compatibility
Scalar compatibility
frontend contract tooling compatibility
CI diff/tool compatibility
```

## 10.2 `@nestjs/swagger`

Nest's official OpenAPI integration uses `SwaggerModule` and `DocumentBuilder`.

The backend may wrap these centrally. Use existing bootstrap/helpers rather than creating a second Swagger/OpenAPI pipeline.

### Stable `operationId`

Set/retain operation IDs predictably because clients/tests/tooling can depend on them.

Do not let class/method renames silently redefine public operation identity if contracts depend on it.

## 10.3 `nestjs-zod` cleanup

For Zod 4 + `nestjs-zod`, post-process the generated Nest document using the project's current cleanup integration and target OpenAPI 3.1.

## 10.4 Scalar

Scalar renders/explores the OpenAPI document.

Conceptual current integration can use the Nest middleware package if that is what the repository resolves.

But:

```text
Scalar UI != source of truth
OpenAPI artifact = source of truth
```

Do not put business rules exclusively in Scalar descriptions.

## 10.5 Production exposure

Whether API reference endpoints are enabled publicly is a security/delivery decision.

Do not expose internal/admin schemas publicly by default.

---

# 11. HTTP API rules

## 11.1 Validate every trust boundary

```text
body   -> Zod request DTO
query  -> Zod query DTO
params -> Zod params DTO
```

Do not rely on TypeScript annotations at runtime.

## 11.2 Response schema is explicit

Every successful endpoint should have an exact response contract.

Avoid:

```ts
Promise<any>
Record<string, unknown> as generic success payload
{ data: any }
```

## 11.3 Errors

Standardize expected errors:

```text
validation
not authenticated
not authorized
not found
conflict
rate limited
provider unavailable
contract/internal unexpected
```

Do not return HTTP 200 with `{ success: false }` for normal REST errors unless that is an established contract.

## 11.4 Idempotency

Use idempotency keys for operations where duplicate submission can cause duplicated side effects, such as:

```text
payment capture
order creation under retrying clients
provider webhook handling
external command submission
```

Persist uniqueness durably; do not rely only on an in-memory map/cache.

## 11.5 Correlation

Accept/create a safe request/correlation identifier according to platform policy and propagate it through:

```text
logs
traces
outgoing provider requests where supported
events
worker processing
```

Do not trust arbitrary user-provided values as log structure without validation/length limits.

## 11.6 Payload limits

Set explicit max payload/upload limits according to use case.

Do not allow framework defaults to become an accidental unlimited business contract.

---

# 12. Pino — structured backend logging

The architecture standard is Pino.

The exact Nest integration package is not specified globally; inspect the repository before assuming `nestjs-pino`, custom providers, or direct `pino`.

## 12.1 Structured objects first

Prefer:

```ts
logger.info({ userId, operation: 'users.store' }, 'user created');
```

rather than building machine-readable context into a string:

```ts
logger.info(`Created user ${userId} in users.store`); // weaker structure
```

## 12.2 Child logger/context

Pino supports child loggers/bindings. Use request/use-case context through the repository's logging abstraction rather than repeatedly passing ad-hoc prefixes.

## 12.3 Redaction

Pino supports redaction. The logging configuration should redact fields such as:

```text
authorization
cookie/set-cookie
password/password_hash
token/access_token/refresh_token
secret/api_key
sensitive PII according to policy
```

Do not rely only on developers remembering not to log them.

## 12.4 Errors

Log errors as error objects through the logger's supported serializer behavior rather than manually stringifying stack traces.

Do not expose the same raw error to the HTTP client.

## 12.5 No full-body logging

Do not log full request/response bodies globally.

If a specific operational case needs payload data, use allowlisted/redacted fields and explicit retention policy.

## 12.6 Log levels

Use levels semantically:

```text
trace/debug -> diagnostic high-volume context
info        -> meaningful lifecycle/business operation metadata
warn        -> degraded/expected abnormal condition
error       -> failed operation requiring investigation
fatal       -> process cannot safely continue
```

Do not emit expected validation errors as `fatal`/`error` flood without an operational reason.

---

# 13. OpenTelemetry JavaScript

## 13.1 Current project status

OpenTelemetry JavaScript currently marks:

```text
traces  -> Stable
metrics -> Stable
logs    -> Development
```

Do not design production log architecture around experimental OTel JS logs unless platform explicitly adopts it.

## 13.2 Initialize before application code

Official Node guidance initializes instrumentation before loading the application so libraries can be instrumented correctly.

Conceptual bootstrap:

```text
instrumentation bootstrap
       ↓
Nest application imports/bootstrap
```

Do not initialize OTel after all HTTP/database modules are already loaded and expect complete automatic instrumentation.

## 13.3 Package gate

Current official examples use packages such as:

```text
@opentelemetry/sdk-node
@opentelemetry/auto-instrumentations-node
```

But the agent MUST verify the backend manifest before importing them.

Architecture saying "OpenTelemetry" does not prove those packages are installed.

## 13.4 Resource attributes

Include stable low-cardinality metadata:

```text
service.name
service.version
deployment.environment
cloud/cluster metadata when platform provides it
```

Do not put user IDs, order IDs, email, URL raw IDs, or arbitrary query values into metric labels.

## 13.5 Context propagation

Propagate trace context across supported HTTP/event boundaries.

For async messages, preserve trace/correlation metadata without making business consumers depend on vendor-specific trace internals.

## 13.6 Manual spans

Add manual spans around meaningful operations not already visible through auto-instrumentation:

```text
payment provider call
critical reconciliation
batch import stage
outbox publish cycle
```

Do not add spans around every helper function.

---

# 14. AWS SDK for JavaScript v3 — mandatory

## 14.1 AWS SDK v2 is blocked

AWS SDK for JavaScript v2 reached end-of-support on **2025-09-08**.

New backend code MUST use v3 packages.

Forbidden:

```ts
import AWS from 'aws-sdk';
const s3 = new AWS.S3();
```

Current v3 direction:

```ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({});
await client.send(new PutObjectCommand(input));
```

Only generate the service package if the repository actually declares/needs it.

## 14.2 Prefer modular clients/commands

AWS SDK v3 uses service-specific packages and command objects.

Prefer the minimal service client over importing a universal SDK bundle.

## 14.3 Provider lifecycle

Create long-lived service clients in infrastructure providers where appropriate rather than constructing a new client on every request.

The owner closes/destroys resources if that specific client/handler requires cleanup.

Do not place AWS client construction in domain objects.

## 14.4 Credentials — EKS Pod Identity

For this EKS architecture, AWS credentials should normally be resolved through the default SDK credential chain and EKS Pod Identity association.

AWS documents that Pod Identity credentials are available through the container credential provider when the application does **not** override credentials with another provider earlier in the chain.

Therefore:

```ts
// Direction for EKS workload: allow SDK/default chain.
const client = new S3Client({ region });
```

Do NOT generate:

```ts
new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
```

as production EKS architecture.

### Important

Environment/shared credentials can still be useful for local development depending on the repo, but production workload identity is platform-owned.

## 14.5 Region/config

Resolve region and endpoints through configuration/provider ownership.

Do not hardcode production region in a feature service.

## 14.6 Timeouts/cancellation

AWS SDK v3 supports abort signals on sends.

Use bounded timeouts/cancellation for external calls according to reliability policy.

Do not let a provider request wait indefinitely inside an HTTP transaction.

## 14.7 Retries

Use SDK/provider retry behavior deliberately and account for idempotency.

Never add an application retry loop around a non-idempotent operation without understanding SDK retries and provider semantics.

---

# 15. Amazon S3 backend pattern

Use S3 for private object storage.

## 15.1 Private by default

```text
bucket/object private
application authorization
short-lived presigned URL when direct transfer is justified
```

Do not make a bucket public merely to simplify upload/download.

## 15.2 Presigned upload/download

When using presigned URLs:

- short expiration;
- server-generated object key;
- allowed operation/content constraints where supported;
- object ownership tied to authenticated tenant/user/domain entity;
- validate metadata/content after upload when risk requires it;
- never give browser AWS long-lived credentials.

## 15.3 Upload security

Validate:

```text
size
MIME/content policy
magic bytes when threat model requires
filename metadata sanitation
server-generated storage key
malware scanning when risk requires
```

Do not trust browser `Content-Type` alone.

---

# 16. Amazon SQS + DLQ

Use SQS when the work is genuinely asynchronous/retryable and decoupling is valuable.

Do not use SQS between modules merely to avoid a local method call.

## 16.1 Consumer is at-least-once aware

Design consumers as idempotent.

Durable dedup/inbox state belongs in a transactional store when duplicate effects are unacceptable.

Do not assume a message is delivered only once.

## 16.2 Visibility timeout

Visibility timeout must exceed/track expected processing behavior and retry strategy.

Long processing may require heartbeat/extension or work decomposition.

## 16.3 DLQ

DLQ requires:

```text
alarm
owner
runbook
failure classification
replay procedure
poison-message handling
```

A DLQ with nobody watching/replaying it is not resilience.

## 16.4 Message body

Use versioned event/command schemas.

Do not place secrets or huge arbitrary blobs in messages when an object reference is the appropriate design.

---

# 17. Amazon EventBridge

Use EventBridge for integration events across real boundaries.

## 17.1 PutEvents result must be checked

AWS `PutEvents` can report per-entry failures/`FailedEntryCount`.

Do not treat the HTTP SDK call resolving as proof every entry was accepted.

## 17.2 Event contract

Every event needs:

```text
event type/name
schema version
source
entity/reference IDs
occurred_at
correlation/trace context where applicable
idempotency/event ID
```

Do not dump an entire database row as the event contract.

## 17.3 Local modules

Within the same modular monolith/process:

```text
prefer typed application collaboration
```

Use events internally only when they model a meaningful decoupled domain reaction and the architecture intentionally supports it, not to imitate microservices.

---

# 18. Outbox / inbox pattern

When a local DB commit must eventually publish an external event:

```text
BEGIN DB TRANSACTION
  mutate aggregate
  insert outbox record
COMMIT
       ↓
outbox publisher
       ↓
EventBridge/SQS
```

This avoids the dual-write hole:

```text
DB commit succeeds
external publish fails
```

### Consumer inbox/idempotency

For at-least-once delivery:

```text
message/event ID
   ↓
unique inbox/idempotency constraint
   ↓
process once-effectively
```

Do not implement outbox/inbox for every CRUD endpoint. Use it when external durable async publication exists.

---

# 19. Secrets Manager / SSM

Secrets/config ownership belongs to platform/runtime.

Application requirements:

- secret identifier configured, not secret value committed;
- least-privilege IAM;
- avoid fetching secrets repeatedly per request when provider/runtime caching is appropriate;
- support rotation semantics according to secret/provider;
- redact values from logs/errors/telemetry;
- fail closed for missing required secrets outside local/test policy.

Do not expose Secrets Manager/SSM SDK calls across feature application services. Keep them in config/provider adapters.

---

# 20. AWS KMS

Use KMS when encryption/signing/key-control requirements justify it.

Do not call KMS for every piece of ordinary data simply to look secure.

Consider envelope encryption/service-native encryption patterns where appropriate.

Never log plaintext sensitive material or returned data keys.

Keep key identifiers/configuration platform-owned.

---

# 21. Step Functions

Step Functions is **not** a replacement for local application orchestration or a PostgreSQL transaction.

Use it for workflows such as:

```text
long-running external process
multiple external systems
wait states/human/async callbacks
explicit retry/compensation state machine
cross-service orchestration requiring durable state
```

Do not use it for:

```text
create user -> insert row -> write audit in same DB
simple local service sequence
ordinary controller logic
```

Adoption requires platform/IaC ownership and an ADR/OpenSpec change when material.

---

# 22. Kafka / MSK gate

Kafka/MSK is not the default queue.

Require a concrete need such as:

```text
high-throughput durable stream
partition ordering
long replay window
multiple independent stream consumers
stream processing
```

If SQS/EventBridge satisfies the requirement, do not introduce Kafka for status.

Kafka adoption requires:

```text
ADR
partition key policy
schema/version policy
consumer group ownership
retention/replay policy
DLQ/error strategy
observability
capacity/cost evidence
```

---

# 23. EKS / Kubernetes runtime rules

The backend runtime is EKS/Kubernetes; backend IaC is externally owned by platform through Terraform/OpenTofu + Helm/GitOps.

## 23.1 Do not inject AWS CDK into backend repo

Frontend may use CDK; backend does not therefore inherit CDK.

```text
backend app repo -> application/runtime manifests as owned
platform repo    -> Terraform/OpenTofu + Helm/GitOps
```

Respect ownership.

## 23.2 API + worker + migration artifact

The architecture allows the same backend repository/artifact to expose different entrypoints:

```text
API process
worker process
migration job
```

Do not create a new repository/Lambda merely because the workload is asynchronous.

## 23.3 Health probes

Distinguish:

```text
liveness  -> process can continue
readiness -> instance can serve workload safely
startup   -> slow initialization allowance when needed
```

Do not make liveness depend on every external service and cause restart storms.

Readiness may reflect dependencies required to safely serve traffic according to architecture.

## 23.4 Graceful termination

On pod termination:

```text
mark/unready as platform handles
stop receiving new work
finish/cancel bounded in-flight operations
close DB/cache/exporter/client resources
exit within termination grace period
```

## 23.5 Workload identity

Use EKS Pod Identity/IAM role associations.

No long-lived AWS access keys inside images/manifests.

## 23.6 Horizontal scaling

Application must not rely on process memory for shared durable state.

Examples forbidden as source of truth:

```text
in-memory sessions
in-memory idempotency map
process-local job ownership without lease
process-local cache assumed globally consistent
```

---

# 24. Configuration validation

Backend config is untrusted input at startup.

Use Zod/shared config loader to validate:

```text
required variables
enums
URLs
ports
positive durations
feature flags
resource identifiers
```

Fail closed outside intentionally permissive local/test modes.

### Do not expose `process.env` throughout the codebase

Prefer centralized validated config/provider ownership.

Feature/application code receives typed configuration or a specific port, not arbitrary environment lookup.

---

# 25. Authentication and authorization boundary

Authentication answers:

```text
Who/what is calling?
```

Authorization answers:

```text
May this caller perform this action on this resource/tenant?
```

Do not treat a valid JWT/session as permission to access every entity.

Every sensitive resource action may require:

```text
role/permission
tenant boundary
resource ownership
state-based policy
```

Routes are private by default. A public decorator/metadata path requires deliberate design and tests.

Do not perform input validation in deprecated `nestjs-zod` guards; authorization guards should focus on policy/auth.

---

# 26. Password/token/security rules

Do not implement cryptographic primitives manually.

Use the repository's approved password hashing/token/session libraries and parameters.

This technology skill does not invent those packages because they were not globally specified in the architecture.

If the package is absent/unknown:

```text
BACKEND_STACK_REVIEW_REQUIRED
```

Never:

```text
store plaintext password
log password/token
store raw refresh/access token when hash/reference is the design
use Math.random for token generation
hardcode JWT secrets
accept "alg": none
```

Authentication implementation requires dedicated security skill/rules in addition to this technologies skill.

---

# 27. API versioning and compatibility

Do not version an API path reflexively.

Use the project's established compatibility/versioning policy.

Breaking changes include more than URL changes:

```text
removing field
changing field type
changing nullability
changing enum meaning
new required request field
changing status semantics
renaming path/query parameters
```

Run OpenAPI diff/contract tests before promoting producer/consumer releases.

---

# 28. Error classification for external providers

Provider errors should be translated into categories useful to application/retry policy:

```text
validation/permanent
unauthorized/misconfigured
not found
conflict
rate limited
transient network
provider 5xx/transient
unknown
```

Do not blindly retry every error.

For retryable calls:

```text
bounded attempts
backoff/jitter according to SDK/provider policy
idempotency
cancellation/deadline
telemetry
```

---

# 29. Backend testing strategy

Shared Vitest/Playwright semantics live in the shared skill.

Backend-specific test layers:

```text
unit
├── domain policy
├── application service with mocked ports
└── pure transformations

integration
├── Drizzle repository against real PostgreSQL behavior
├── constraints
├── transactions
└── migration compatibility where applicable

API/contract
├── Nest application/controller boundary
├── Zod validation
├── response serialization
├── authorization
└── OpenAPI compatibility

E2E
└── critical cross-boundary journeys
```

## 29.1 Do not call mocks integration tests

```text
mock repository + service = unit/application test
real PostgreSQL adapter    = integration test
```

If the repository does not include Testcontainers, do not add it merely because it is popular. Use the existing PostgreSQL integration harness/container/CI service.

## 29.2 Database cleanup

Use deterministic isolation strategy:

```text
transaction rollback where compatible
schema/database per test worker where needed
known truncation/fixtures
unique deterministic IDs
```

Do not make tests order-dependent.

## 29.3 Migration test

For risky migrations, test:

```text
old compatible schema/data
       ↓
migration
       ↓
new code/query expectations
```

For expand-contract, verify both old/new application versions when rollout requires coexistence.

## 29.4 Bug regression

A production bug fix must leave a regression test at the lowest layer that proves the failure mode.

---

# 30. Performance rules

## 30.1 Measure before optimizing

Use telemetry/query evidence.

Do not add cache/index/memoization without a bottleneck or known invariant.

## 30.2 Database first checks

For slow endpoints inspect:

```text
query count
N+1
selected columns
indexes
query plan
pagination bounds
connection saturation
lock contention
transaction duration
```

before adding Valkey.

## 30.3 Avoid N+1

Use appropriate joins/batched queries/relational APIs according to the resolved Drizzle version and real query shape.

Do not load an unbounded child collection for convenience.

## 30.4 Backpressure

Bound concurrency for batch jobs/external calls.

Avoid:

```ts
await Promise.all(items.map(processItem)); // ❌ if items can be huge
```

without a concurrency policy.

## 30.5 Streaming

Use streams for genuinely large data/object flows where buffering entire payloads is unsafe.

Do not make every small JSON endpoint a stream.

---

# 31. Security rules by technology

| Technology | Required posture |
|---|---|
| NestJS | private-by-default routes, thin controllers, explicit guards/policies |
| Zod | validate untrusted input, exact response serialization |
| Drizzle | parameterized query APIs, constraints, deliberate raw SQL |
| PostgreSQL | least privilege, constraints, bounded queries, no secret leakage |
| Valkey | private network/auth/TLS per platform, no source-of-truth data only in cache |
| Pino | structured redaction, no raw sensitive bodies |
| OTel | no PII/high-cardinality attributes by default |
| AWS SDK v3 | Pod Identity/default chain, least privilege, no static credentials |
| S3 | private, presigned short-lived access, validated uploads |
| SQS/EventBridge | versioned payloads, idempotency, DLQ/failed-entry handling |
| EKS | non-root/read-only filesystem/etc. as platform policy proves, workload identity |

Do not claim a specific Kubernetes securityContext/network policy exists without platform evidence.

---

# 32. Anti-existente / anti-hallucination matrix

| Area | Current direction | Block/avoid |
|---|---|---|
| Nest runtime | NestJS 11 + confirmed adapter | NestJS 10 assumptions by memory |
| Nest Express | Express 5 route semantics | old anonymous wildcard route patterns |
| Request validation | Zod 4 + project Nest adapter | new `class-validator` addition by reflex |
| nestjs-zod | `createZodDto`, validation pipe, serializer, `ZodResponse`, cleanup | `ZodGuard`, `createZodGuard`, `validate`, `zodV3ToOpenAPI`, `@nest-zod/z` |
| Drizzle | API matching lockfile | RC API in stable 0.x repo |
| Drizzle driver | inspect repo | assume `pg`/`postgres` |
| migrations prod | generate/review/migrate | `drizzle-kit push` to prod by default |
| Drizzle relations | app relational metadata + explicit DB FK | assume relations create FKs |
| DB invariants | PostgreSQL constraints | pre-check only |
| IDs | established project policy/identity/UUID | drive-by ID strategy change |
| money | exact decimal/string boundary | JS float for exact finance |
| cache | evidence + port + adapter + invalidation | add Redis/Valkey casually |
| Valkey client | selected repository client | auto-install GLIDE/iovalkey |
| OpenAPI | project 3.1 | automatic 3.2 migration |
| API UI | Scalar from OpenAPI | treating UI config as contract truth |
| logging | Pino structured + redact | `console.log` production flow / full bodies |
| telemetry | OTel early bootstrap | initialize after app modules |
| OTel logs | architecture-specific; JS logs currently development | assume stable logs pipeline |
| AWS | SDK v3 modular clients | `aws-sdk` v2 |
| AWS auth on EKS | Pod Identity/default chain | static access keys |
| SQS | idempotent at-least-once consumer | assume exactly once |
| EventBridge | check per-entry failures | assume resolved call means all entries accepted |
| async | outbox when dual-write risk exists | publish external event inside DB tx |
| platform IaC | Terraform/OpenTofu + Helm/GitOps owner | backend CDK injection |
| workers | same backend artifact/repo when architecture says so | random Lambda/new repo |
| Kafka | ADR + measured need | fashion-driven adoption |
| Step Functions | long/external durable workflows | local transaction replacement |

---

# 33. Senior decision table — choose the simplest valid mechanism

| Need | Default mechanism | Escalate when |
|---|---|---|
| local module call | typed in-process service/port | actual async/integration boundary exists |
| local atomic writes | PostgreSQL transaction | external system must participate -> state machine/outbox |
| uniqueness | DB unique constraint | never replace with cache lock |
| HTTP validation | Zod/Nest boundary | special transport requires another adapter |
| response protection | exact response Zod serialization | never raw persistence row |
| repeated slow read | optimize query/index first | then cache if measured/justified |
| async retryable job | worker + SQS when justified | streaming only when stream need exists |
| integration event | EventBridge + versioned event | Kafka when replay/order/throughput need exists |
| long workflow | application state machine first | Step Functions for durable external/wait orchestration |
| file transfer | S3 private + presigned flow | proxy through API only when security/processing requires |
| AWS credentials | EKS Pod Identity | local dev uses approved local credential path |

---

# 34. Example backend vertical slice

Conceptual files:

```text
src/identity/register-user/
├── application/
│   ├── dtos/
│   │   ├── register-user.request.dto.ts
│   │   └── register-user.response.dto.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   └── user.repository.token.ts
│   └── service/
│       └── register-user.service.ts
├── infrastructure/
│   ├── http/controllers/
│   │   └── register-user.controller.ts
│   └── persistence/drizzle/
│       ├── schema.ts                 # or module-owned shared schema according to repo
│       └── user.drizzle-repository.ts
└── identity.module.ts
```

Flow:

```text
HTTP unknown input
   ↓
Zod request DTO
   ↓
application service
   ↓
repository port
   ↓
Drizzle adapter
   ↓
PostgreSQL constraint/transaction
   ↓
explicit response projection
   ↓
Zod response serialization
   ↓
OpenAPI 3.1
```

No layer may skip directly from controller to raw SQL/AWS unless the existing architecture deliberately defines such a tiny adapter and the use case has no application behavior.

---

# 35. Example transaction + outbox reasoning

Business requirement:

```text
creating order must persist order
and eventually notify external integration
```

Correct architecture when durable event is required:

```text
DB transaction
├── INSERT order
└── INSERT outbox event
COMMIT
    ↓
outbox worker
    ↓
EventBridge/SQS
```

Wrong:

```text
BEGIN
INSERT order
await eventBridge.send(...)
COMMIT
```

because external network latency/failure is coupled to the DB transaction and still cannot create a true distributed atomic commit.

---

# 36. Example idempotent consumer reasoning

Message:

```json
{
  "event_id": "evt_...",
  "type": "payment.captured.v1",
  "payment_id": "pay_..."
}
```

Consumer transaction concept:

```text
BEGIN
  insert inbox(event_id) unique
  if duplicate -> no-op/ack
  apply domain mutation
COMMIT
```

Do not use only an in-memory `Set` of processed IDs in horizontally scaled EKS pods.

---

# 37. Example Pino logging

Good direction:

```ts
logger.info(
  {
    operation: 'payments.capture',
    paymentId,
    correlationId,
  },
  'payment capture completed',
);
```

Bad:

```ts
logger.info({
  authorization: req.headers.authorization,
  body: req.body,
  password: input.password,
});
```

Use centralized redaction and allowlisted fields.

---

# 38. Example AWS adapter

Infrastructure ownership:

```ts
import { S3Client } from '@aws-sdk/client-s3';

export class S3ObjectStorageAdapter {
  constructor(private readonly client: S3Client) {}
}
```

Provider wiring owns:

```text
region
endpoint override for approved local integration
credential chain
retry/timeout handler config
```

Application owns a port such as:

```ts
export interface ObjectStorage {
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
}
```

Application should not depend on `PutObjectCommand`/`S3Client` types.

---

# 39. Example configuration boundary

Good:

```text
process.env
   ↓
ConfigSchema.parse(...)
   ↓
typed AppConfig
   ↓
provider/module wiring
```

Bad:

```ts
// scattered through feature code
const region = process.env.AWS_REGION!;
const bucket = process.env.BUCKET_NAME!;
```

Config validation should happen once at bootstrap/owned config layer.

---

# 40. Agent execution algorithm

For each backend implementation step:

```text
START
  ↓
Read prompt-pack + OpenSpec delta + scope
  ↓
Load shared-technologies
  ↓
Read backend package.json + lockfile
  ↓
Resolve Nest/Zod/Drizzle/driver/AWS packages actually needed
  ↓
Check existing feature/module conventions
  ↓
Check DB schema + migrations + contract package
  ↓
Select smallest vertical implementation
  ↓
Request/response schema
  ↓
application port/use case
  ↓
infrastructure adapter
  ↓
controller/module wiring
  ↓
unit/integration/contract tests by risk
  ↓
Biome + TypeScript
  ↓
OpenAPI export/diff
  ↓
security/quality gates
  ↓
evidence
  ↓
DONE
```

### If any version-sensitive API is uncertain

```text
STOP THAT INTEGRATION
↓
inspect installed exports/types/docs
↓
resume only when verified
```

Never fill the uncertainty with model memory.

---

# 41. Prompt-builder / capability integration

Recommended logical capability:

```yaml
skills:
  primary:
    - node-nest-build-feature
  supporting:
    - shared-technologies
    - node-nest-technologies
    - node-nest-persistence
    - node-nest-testing
  conditional:
    security_or_aws:
      - node-nest-security-aws
```

Do not load every backend skill for every trivial change.

Examples:

```text
pure calculation use case
-> build-feature + shared-technologies + testing

DB CRUD
-> + persistence

S3/SQS/security work
-> + security-aws
```

The Context Builder should inject only the relevant sections/skills within token budget.

---

# 42. Minimal backend checklist

Before marking a backend step complete:

```text
[ ] package.json + pnpm-lock.yaml inspected
[ ] shared technologies skill loaded
[ ] NestJS exact line/API verified
[ ] platform adapter confirmed
[ ] no class-validator introduced against Zod policy
[ ] nestjs-zod deprecated APIs absent
[ ] Drizzle exact version verified
[ ] PostgreSQL driver confirmed
[ ] no RC API used accidentally
[ ] migration strategy correct; no prod push
[ ] DB constraints protect invariants
[ ] transaction boundary explicit
[ ] no external network call held inside DB transaction without design reason
[ ] persistence row not leaked as public DTO
[ ] exact money remains exact
[ ] cache used only if adapter/infra/tests exist
[ ] OpenAPI remains project 3.1
[ ] Scalar treated as UI only
[ ] Pino redaction/log structure correct
[ ] OTel initialization/attributes safe when applicable
[ ] AWS SDK v3 only
[ ] no static AWS creds
[ ] EKS Pod Identity compatible
[ ] async consumer idempotent where applicable
[ ] EventBridge per-entry failure handled where applicable
[ ] SQS DLQ has owner/runbook when applicable
[ ] Biome passes
[ ] TypeScript passes
[ ] Vitest/integration/contract tests pass
[ ] OpenAPI diff passes
[ ] evidence recorded
```

---

# 43. Official sources verified for this snapshot

These were checked while producing this skill. Exact installed versions still come from repository evidence.

## Node.js

- Node releases / LTS status: https://nodejs.org/en/about/previous-releases
- Node downloads: https://nodejs.org/en/download/current/
- Node 24 LTS announcement: https://nodejs.org/en/blog/release/v24.11.0

## NestJS 11

- Migration guide: https://docs.nestjs.com/migration-guide
- Validation guide: https://docs.nestjs.com/techniques/validation
- OpenAPI integration: https://docs.nestjs.com/openapi/introduction
- Nest releases: https://github.com/nestjs/nest/releases

## nestjs-zod

- Maintainer README/current API: https://github.com/BenLorantfy/nestjs-zod
- Raw README used for current/deprecated API verification: https://raw.githubusercontent.com/BenLorantfy/nestjs-zod/main/README.md

## Drizzle ORM

- PostgreSQL setup/driver options: https://orm.drizzle.team/docs/get-started-postgresql
- Transactions: https://orm.drizzle.team/docs/transactions
- Indexes and constraints: https://orm.drizzle.team/docs/indexes-constraints
- Relations and FK distinction: https://orm.drizzle.team/docs/relations
- Migration fundamentals: https://orm.drizzle.team/docs/migrations
- `generate`: https://orm.drizzle.team/docs/drizzle-kit-generate
- `migrate`: https://orm.drizzle.team/docs/drizzle-kit-migrate
- `push`: https://orm.drizzle.team/docs/drizzle-kit-push
- FAQ (`push` local recommendation): https://orm.drizzle.team/docs/faq
- Current releases / 1.0 prerelease line: https://github.com/drizzle-team/drizzle-orm/releases

## PostgreSQL 17

- PostgreSQL 17 docs: https://www.postgresql.org/docs/17/
- Identity columns: https://www.postgresql.org/docs/17/ddl-identity-columns.html
- Generated columns: https://www.postgresql.org/docs/17/ddl-generated-columns.html

## Valkey

- Valkey docs: https://valkey.io/docs/
- Recommended client libraries: https://valkey.io/clients/
- Valkey GLIDE Node API: https://glide.valkey.io/languages/nodejs/api/
- ElastiCache overview: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html

## OpenAPI / Scalar

- OpenAPI 3.1.2 reference for the project's 3.1 feature line: https://spec.openapis.org/oas/v3.1.2.html
- Latest OpenAPI spec (currently 3.2.0): https://spec.openapis.org/oas/latest.html
- Scalar NestJS API reference integration: https://scalar.com/products/api-references/integrations/nestjs

## Pino

- Pino API docs: https://github.com/pinojs/pino/blob/main/docs/api.md

## OpenTelemetry

- OpenTelemetry JavaScript status: https://opentelemetry.io/docs/languages/js/
- Node getting started / early instrumentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/

## AWS SDK / EKS

- AWS SDK for JavaScript v3 guide: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/
- AWS SDK v3 client/command request model: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/the-request-object.html
- AWS SDK v2 end of support: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- v3 credentials: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html
- EKS Pod Identity SDK support: https://docs.aws.amazon.com/eks/latest/userguide/pod-id-minimum-sdk.html
- EKS Pod Identity: https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
- EventBridge PutEvents v3 example: https://docs.aws.amazon.com/eventbridge/latest/userguide/example_eventbridge_PutEvents_section.html

---

# 44. Final invariant

Backend AI code is accepted only when it matches:

```text
actual repository versions
+
shared technology rules
+
NestJS 11 project conventions
+
resolved Drizzle/driver API
+
PostgreSQL executable constraints/migrations
+
project OpenAPI 3.1 contract
+
AWS/EKS platform ownership
+
quality/security evidence
```

The agent must prefer **verified compatible code** over "the newest-looking code" and over "the code pattern it remembers best".

When a package, driver, runtime adapter, or platform capability is not proven, the correct senior behavior is **to block that integration and report the missing evidence**, not to fabricate an implementation.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Backend Technologies — Version-Aware Skill (Senior 2026)

✅ **Correcto:** Para **Backend Technologies — Version-Aware Skill (Senior 2026)**, contrastar versiones con technology/versions.md y lockfiles del consumidor.

❌ **Incorrecto:** En **Backend Technologies — Version-Aware Skill (Senior 2026)**, afirmar compatibilidad entre librerías sin verificar sus dependencias.

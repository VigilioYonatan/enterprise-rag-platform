# Shared Frontend + Backend Technologies — Version-Aware Skill (Senior 2026)

> **STATUS:** Detailed shared reference. The CURRENT routable skill lives at `platform-actions/skills/shared-technologies`; Agent Plugin packaging remains TARGET.
>
> **Snapshot date:** 2026-08-08.
>
> **Purpose:** Prevent AI coding agents from generating stale JavaScript/TypeScript, validation, testing, tooling, package-management, contract, or Git-workflow code that is shared by frontend and backend.
>
> **Recommended repository location:**
>
> `agent-plugins/vigilio-engineering-core/skills/shared-technologies/references/technologies.md`
>
> **Consumers:** `vigilio-web-mfe` and `vigilio-node-nest`.
>
> This file is execution knowledge. It is **not** a source of product requirements, business rules, OpenSpec behavior, database truth, or HTTP implementation details.

### Contract profiles

| Profile | Backend owner | Contract package | Frontend consumer |
|---|---|---|---|
| `current-web` | `bus-impl` | `@vigilioyonatan/bus-contracts` | `web-mfe` |
| `k8s-v2` | `bus-impl-v2` | `@vigilioyonatan/bus-v2-contracts` | `web-mfe-v2` |

The profiles coexist as materialized active pairs. Crossing an owner, package or consumer between rows is `CONTRACT_PACKAGE_NAME_MISMATCH`; it does not authorize changing the other consumer.

---

## 0. Skill contract

The coding agent MUST treat this document as a **version-awareness and compatibility guardrail**.

The agent MUST:

1. Read the target repository `package.json` before writing package-specific code.
2. Read the resolved lockfile (`pnpm-lock.yaml`) before assuming an exact version.
3. Prefer the installed package exports and bundled `.d.ts` over memory.
4. Verify official documentation for the resolved major/minor when an API changed recently.
5. Keep shared language/tooling rules here instead of duplicating them in frontend/backend skills.
6. Use `unknown` at untrusted boundaries and validate before treating data as trusted.
7. Keep TypeScript typechecking independent from transpilers, Vite, `tsx`, Biome, and test runners.
8. Treat OpenAPI, Zod schemas, generated contract artifacts, and lockfiles as executable evidence.
9. Fail closed when repository evidence and documentation disagree.
10. Never invent APIs for private `@<organization>/*` packages.

The agent MUST NOT:

- generate syntax from an older major because it is more common in training data;
- silently downgrade a current API to an older tutorial pattern;
- copy a frontend-specific package into backend or vice versa without a real dependency;
- use `any` to bypass a contract incompatibility;
- duplicate a Zod schema as a handwritten interface;
- use `tsx` as a substitute for typechecking;
- treat Biome as a TypeScript compiler;
- use Jest-specific configuration when the repository standard is Vitest;
- add `git add` manually to `lint-staged` tasks;
- generate deprecated Husky bootstrap files;
- upgrade a dependency merely because a newer version exists;
- migrate OpenAPI 3.1 to 3.2 without an explicit architecture/contract change.

---

# 1. Ownership and inheritance

This skill owns only technologies shared by both sides of the product:

```text
shared-technologies
├── JavaScript / TypeScript
├── Node.js toolchain baseline
├── pnpm
├── Zod
├── contract package rules
├── OpenAPI compatibility policy
├── Vitest
├── Playwright common rules
├── Biome
├── tsx
├── @types/node
├── Husky
├── lint-staged
├── commitlint
└── private organization package verification
```

It does **not** own:

```text
frontend-only
├── Preact
├── Signals
├── TanStack Query
├── TanStack Table
├── React Hook Form
├── Wouter
├── Zustand
├── Sonner
├── Tailwind CSS
├── Vite browser build semantics
├── Testing Library UI semantics
└── frontend delivery profile (current runtime or OCI/EKS v2)

backend-only
├── NestJS
├── nestjs-zod adapter details
├── Drizzle ORM
├── PostgreSQL runtime behavior
├── Valkey adapter/cache strategy
├── Pino backend logging
├── OpenTelemetry Node bootstrap
├── AWS SDK v3 service adapters
└── EKS runtime concerns
```

### Loading rule

A frontend task that needs shared rules conceptually resolves:

```text
web-mfe-technologies
        +
shared-technologies
```

A backend task resolves:

```text
node-nest-technologies
        +
shared-technologies
```

The Prompt Builder SHOULD deduplicate identical source files/hashes so the same shared material is never injected twice.

---

# 2. Source-of-truth precedence

When information conflicts, use this order:

```text
1. pnpm-lock.yaml / actual installed resolution
2. target repository package.json
3. package exports + bundled .d.ts
4. executable repository config/tests
5. official documentation for the resolved major/minor
6. official migration/release notes
7. this skill
8. community examples/blogs
9. model memory
```

Model memory is the lowest-priority source.

### Fail-closed statuses

```text
STACK_OK
= package/version/API is verified for the repository.

STACK_VERSION_MISMATCH
= declared version and resolved/official version do not agree.

STACK_API_MISMATCH
= code request uses an API from another major/version.

STACK_REVIEW_REQUIRED
= multiple supported patterns exist and repository evidence must decide.

PRIVATE_PACKAGE_API_UNKNOWN
= organization-owned package API cannot be inferred safely.

CONTRACT_PACKAGE_NAME_MISMATCH
= product documentation and target package.json identify different contract package names.

LEGACY_API_BLOCKED
= requested pattern is deprecated/removed for the selected major.
```

When status is not `STACK_OK`, the agent MUST inspect the repository before generating that integration.

---

# 3. Version resolution protocol

Before writing code that imports a dependency:

```text
read package.json
        ↓
read pnpm-lock.yaml
        ↓
resolve actual package version
        ↓
inspect exports/types when needed
        ↓
open official docs for that major
        ↓
select current API
        ↓
write code
        ↓
typecheck + tests
```

### Never assume an exact version from architecture prose

Architecture may say:

```text
TypeScript 7
Zod 4
Vitest 4
Node.js 24 LTS
```

That establishes the **supported line**, not the exact patch installed in every repository.

Correct:

```text
architecture major + repository lockfile exact patch
```

Incorrect:

```text
architecture prose -> fabricated exact package version
```

### Never auto-upgrade during feature implementation

If a newer package exists:

```text
feature change != dependency upgrade
```

Dependency upgrades require their own deliberate change when they can alter runtime, types, generated contracts, bundles, migrations, or test behavior.

---

# 4. JavaScript / ECMAScript baseline

## 4.1 Modern JavaScript first

Prefer platform language features available in the confirmed runtime/browser targets:

```ts
const byId = new Map(items.map((item) => [item.id, item]));

const visible = items.filter((item) => item.enabled);

const value = maybeValue ?? fallback;

const nested = response?.data?.item;
```

Prefer:

- `const` by default;
- `let` only when rebinding is required;
- `async`/`await` for readable async control flow;
- `Promise.all()` only for genuinely independent operations;
- `Promise.allSettled()` when partial outcomes are intentionally acceptable;
- `AbortSignal` for cancellable operations when the consumed API supports it;
- `URL` / `URLSearchParams` rather than handwritten query-string concatenation;
- `crypto.randomUUID()` / project ID policy rather than custom pseudo-random IDs;
- `structuredClone()` only when deep cloning is semantically needed and supported;
- built-in `fetch` only where repository architecture permits it.

### Do not generate existente JavaScript by reflex

```text
❌ var
❌ callback pyramids when Promise APIs exist
❌ new Promise(async (...) => ...)
❌ manual query-string concatenation
❌ JSON.parse(JSON.stringify(x)) as generic cloning
❌ Math.random() for security/token/identifier generation
❌ prototype mutation
❌ implicit global state
```

### Async rule

Do not parallelize writes merely for speed.

```ts
// GOOD only when operations are independent.
const [user, plan] = await Promise.all([
  getUser(),
  getPlan(),
]);
```

If operation B depends on operation A, write the dependency explicitly.

---

# 5. TypeScript 7.x

## 5.1 2026 baseline

TypeScript 7 is the native compiler/language-service generation announced by the TypeScript team in 2026. TS7 adopts TypeScript 6's newer defaults and turns TS6 deprecations into hard errors.

Important direction:

```text
strict = true by default in TS7
module = esnext by default
older deprecated compiler constructs/options can become errors
stable type ordering is part of the TS7 compatibility story
```

Repository config still wins over defaults.

## 5.2 Required project posture

For application code:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

Do not copy this mechanically if the repository already has a curated config; compare and preserve the project config.

### Prefer `satisfies` for shape checking without widening

```ts
const routes = {
  users: '/users',
  products: '/products',
} satisfies Record<string, `/${string}`>;
```

### Prefer `unknown` over `any`

```ts
function parsePayload(input: unknown): Payload {
  return PayloadSchema.parse(input);
}
```

`any` is an escape hatch, not a boundary type.

### Type-only imports

With modern module syntax, use explicit type imports:

```ts
import type { User } from './user.js';
```

Do not depend on transform heuristics to remove runtime imports.

### Discriminated unions over boolean soup

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: DomainError };
```

Avoid:

```ts
// Ambiguous state combinations.
type Result<T> = {
  ok: boolean;
  value?: T;
  error?: Error;
};
```

### Use inference deliberately

Prefer inference inside local implementations.

Use explicit annotations at:

- public boundaries;
- exported APIs;
- ports/interfaces;
- callbacks where inference is unclear;
- contract boundaries;
- places where widening would be harmful.

### `as` is not validation

```ts
const response = raw as UserResponse; // ❌ no runtime proof
```

Use runtime validation:

```ts
const response = UserResponseValidator.parse(raw); // ✅
```

### Non-null assertion is not a data rule

```ts
user.email! // ❌ hides invariant uncertainty
```

Prove the invariant through control flow/schema/database guarantees.

## 5.3 Do not write TS5-era workaround code without evidence

Block reflexive usage of:

```text
❌ namespaces for ordinary modules
❌ triple-slash references in application code
❌ `moduleResolution: node`/`node10` copied from old configs
❌ `importsNotUsedAsValues`
❌ deprecated compiler options kept with ignoreDeprecations
❌ broad ambient globals when explicit imports work
```

If a library truly requires an older module mode, isolate and document it.

## 5.4 TS7 programmatic compiler API

The TS7 native implementation changes assumptions for tooling that imports TypeScript's compiler internals/programmatic APIs.

Agent rule:

```text
If repository tooling imports `typescript` programmatic APIs:
    inspect that tooling and TS7 migration guidance first.
Do not assume old compiler API behavior is unchanged.
```

This matters more for custom code generators/build tools than normal application code.

---

# 6. Node.js 24 LTS — shared toolchain baseline

Node 24 (`Krypton`) is the architecture's LTS baseline. As of the 2026-08 snapshot, Node 24 remains LTS while Node 26 is Current.

### Critical distinction

```text
backend runtime        -> Node 24 LTS
frontend build/tests   -> Node 24 LTS toolchain
frontend production UI -> browser, NOT Node
```

Never import Node built-ins into browser code merely because frontend tooling runs on Node.

### Modern Node rules

Prefer built-ins where they remove unnecessary dependencies and the target Node 24 runtime supports them:

```text
node:crypto
node:fs/promises
node:path
node:url
node:stream/promises
node:timers/promises
```

Use the `node:` prefix for built-ins in new code:

```ts
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
```

### Do not pin to `latest`

Runtime policy should be explicit:

```text
24.x LTS + lock/toolchain/container digest
```

not:

```text
node:latest
```

### Security patches matter

The Node 24 line received security releases in 2026. Production images/toolchains should track an approved current patch in the 24.x LTS line rather than freezing indefinitely on the first 24.x release.

### Native TypeScript support is not the project typechecker

Node can execute a subset of TypeScript syntax through native type stripping depending on runtime behavior/configuration, but the project standard remains:

```text
TypeScript compiler for semantic typechecking
+
project build/transpile path
```

Do not use runtime type stripping as justification to remove `typecheck` gates.

---

# 7. pnpm — package manager and workspace policy

`pnpm` is the canonical package manager for this factory.

## 7.1 Lockfile is evidence

The agent MUST NOT delete/regenerate `pnpm-lock.yaml` casually.

For reproducible CI:

```text
package.json
+
pnpm-lock.yaml
+
packageManager/Corepack policy when present
```

### Workspace protocol

When the repository already uses pnpm workspaces, prefer explicit workspace dependencies where appropriate:

```json
{
  "dependencies": {
    "@org/contracts": "workspace:*"
  }
}
```

Only use this when packages are intentionally resolved inside that workspace. Brownfield federated repositories may instead consume an exact published contract version.

### Production CI

Use frozen lockfile behavior in CI according to the repository's existing scripts/configuration.

Do not run a free-form install that mutates the lockfile during a release step.

### Package scripts over global tools

Prefer:

```bash
pnpm biome check .
pnpm vitest run
pnpm exec <tool>
```

rather than requiring globally installed mutable tooling.

### Supply-chain posture

Before adding a dependency ask:

```text
Can platform/runtime solve this already?
Is package actively maintained?
Does it run install scripts?
Is it needed in production or dev only?
Can current stack already solve the problem?
```

No dependency is "free".

---

# 8. Zod 4.x — shared runtime schema standard

Zod is used for runtime validation, not merely TypeScript inference.

## 8.1 Trust-boundary rule

Validate data when trust changes.

Examples:

```text
HTTP request entering backend
HTTP response entering browser
process/environment configuration
queue/event payload
external provider response
persisted JSON read from untrusted/old shape
CLI/config input
```

Do not repeatedly parse already-trusted typed values deep inside the same layer without a reason.

## 8.2 Canonical import

```ts
import { z } from 'zod';
```

Do not use obsolete custom Zod forks/adapters unless repository evidence requires them.

## 8.3 Zod 4 string formats

Prefer the current top-level format APIs where appropriate:

```ts
const EmailSchema = z.email();
const UuidSchema = z.uuid();
const DateTimeSchema = z.iso.datetime();
```

Do not default to old examples such as:

```ts
z.string().email(); // legacy direction in Zod 4 docs; avoid for new canonical schemas
z.string().uuid();  // prefer current format APIs for new code
```

If existing public schemas already use older supported syntax, do not rewrite them as drive-by cleanup during an unrelated feature.

## 8.4 Input and output types can differ

Transforms, codecs, defaults, coercion, and pipes can produce different input/output types.

Use:

```ts
type Input = z.input<typeof Schema>;
type Output = z.output<typeof Schema>;
```

or `z.infer` when input/output distinction is irrelevant.

### Never assume a coerced schema has identical wire/runtime type

```ts
const PageSchema = z.coerce.number().int().positive();
```

Wire input may be a string; trusted output is number.

## 8.5 `.parse` vs `.safeParse`

Use `.parse` when invalid input is exceptional and centralized error translation exists.

Use `.safeParse` when branching on invalid input is part of normal control flow.

Never do:

```ts
const result = schema.safeParse(value);
return result.data; // ❌ data may not exist
```

## 8.6 Schema reuse, not mega-schema inheritance

Prefer explicit composition:

```ts
const UserBaseSchema = z.object({
  id: z.uuid(),
  email: z.email(),
});

const UserPublicSchema = UserBaseSchema.pick({
  id: true,
  email: true,
});
```

Do not expose persistence rows by calling `.passthrough()` or exporting internal columns automatically.

## 8.7 Error data

Validation errors can contain user input/context. Do not log full Zod errors with raw sensitive payloads without redaction.

---

# 9. Shared contract package policy

The backend is contract owner; frontend is consumer.

The architecture documentation currently names a browser-safe contract package, while the supplied frontend manifest previously referenced another package name. That difference must be treated as repository evidence to resolve, never guessed.

```text
if master/docs contract package name != target package.json name:
    CONTRACT_PACKAGE_NAME_MISMATCH
    inspect producer + consumer manifests + registry
```

### Browser-safe contract package MUST NOT import

```text
NestJS runtime
@nestjs/swagger runtime adapters
nestjs-zod Nest-only adapters
Node built-ins
AWS SDK
Drizzle
Pino
process/env side effects
filesystem/network side effects
```

It may contain:

```text
Zod schemas
inferred TypeScript types
stable constants/enums
browser-safe helpers with no side effects
```

### Exact version compatibility

For separate repositories:

```text
backend publishes contract X.Y.Z
frontend declares exact approved X.Y.Z
CI verifies compatibility
```

Do not pretend two repos have an atomic Git transaction.

---

# 10. OpenAPI compatibility policy

The Software Factory architecture currently standardizes on **OpenAPI 3.1**.

As of this snapshot the OpenAPI Initiative has published OpenAPI 3.2.0, but that does **not** authorize an automatic upgrade.

Correct rule:

```text
project standard = OpenAPI 3.1
latest ecosystem spec = may be newer
upgrade = explicit contract/tooling change
```

### Why

OpenAPI is consumed by:

```text
documentation
contract tests
code generation
frontend compatibility checks
security tooling
schema conversion
```

Changing the specification version can affect all of them.

### Stable contract rules

- stable `operationId`;
- explicit status codes;
- exact request/response schemas;
- no undocumented secret fields;
- explicit content types;
- explicit nullable semantics;
- reusable components where useful;
- backward-compatibility diff in CI;
- generated artifact checked against intended contract source.

Do not equate API docs UI with contract truth.

---

# 11. Vitest 4.x — shared test runner

Vitest is the standard TypeScript unit/integration runner.

## 11.1 Vitest, not Jest

Do not generate Jest config/APIs by habit.

Use imports/config recognized by Vitest:

```ts
import { describe, expect, it, vi } from 'vitest';
```

If globals are intentionally enabled in repository config, follow that configuration; do not assume them.

### Mock only boundaries that should be mocked

```text
unit test        -> mock external port when useful
integration test -> use real adapter/runtime under test
contract test    -> use actual schemas/artifacts
E2E              -> avoid mocking the system under test
```

Do not mock Drizzle and call it a PostgreSQL integration test.

## 11.2 Coverage v4

Vitest supports V8 and Istanbul coverage; V8 is the default/recommended provider in current Vitest documentation.

Example direction:

```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
    },
  },
});
```

The coverage support package must match the Vitest line used by the repository.

### Coverage is not a quality metric by itself

Do not create useless assertions to hit a percentage.

Test:

```text
business invariants
security boundaries
contract serialization
concurrency/idempotency paths
error translation
critical UI behavior
regressions
```

---

# 12. Playwright — shared E2E/API test rules

Playwright may be used for browser journeys and API-level E2E where the project explicitly chooses it.

### Web-first assertions

Use retrying assertions:

```ts
await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
```

Do not solve races with sleeps:

```ts
await page.waitForTimeout(3000); // ❌ as synchronization strategy
```

### API testing

When using Playwright's API request context, assert HTTP semantics and contract output rather than only status `200`.

### Isolation

Each test should control its test data and avoid dependence on execution order.

### Secrets

Never print auth tokens/cookies in traces/logs intended for broad retention.

---

# 13. Biome 2.5.x — lint and format

Biome owns formatting and supported lint rules for JS/TS/JSON/etc. in this architecture.

## 13.1 Current 2.5 configuration direction

Biome 2.5 introduced/expanded the `linter.rules.preset` configuration and deprecated the older `recommended` boolean form in favor of the preset setting.

Prefer current config when creating/upgrading a Biome 2.5 config:

```jsonc
{
  "linter": {
    "rules": {
      "preset": "recommended"
    }
  }
}
```

Do not rewrite a working repository config during an unrelated task; use `biome migrate --write` or the repository's upgrade workflow when doing a Biome migration.

## 13.2 Biome does not replace TypeScript

```text
Biome check ✅
TypeScript semantic typecheck ✅
```

Both gates are required when the architecture says so.

### No ESLint + Prettier duplication by default

If Biome is canonical, do not introduce ESLint/Prettier merely because an example tutorial uses them.

Only keep/add another tool for a demonstrated rule/integration Biome does not cover and after an explicit decision.

### Safe/unsafe fixes

Automated agents SHOULD prefer safe fixes. Unsafe fixes require review of semantic impact.

---

# 14. `tsx` — development/tooling execution

`tsx` is a Node enhancement for executing TypeScript quickly.

## Correct role

```text
scripts
local tooling
code generators
dev commands
watch workflows
```

`tsx` does **not** typecheck by itself.

Required split:

```text
tsx -> execute/transpile
TypeScript -> typecheck
```

### Current execution examples

```bash
pnpm tsx ./tools/generate.ts
pnpm tsx watch ./tools/dev.ts
```

### ESM/CJS convenience is not architecture

`tsx` can bridge module formats conveniently, but production package/module strategy should still be explicit.

Do not use `tsx` magic to hide an incorrectly configured published package.

### Production caution

Application production runtime should normally execute the project's approved build artifact/runtime strategy. Do not switch a compiled/deployed service to runtime TypeScript through `tsx` during an unrelated change.

---

# 15. `@types/node`

`@types/node` must align sufficiently with the Node runtime line used by the repository/tooling.

### Browser boundary

Frontend tooling may need Node types for Vite/config/scripts, but browser source code MUST NOT accidentally gain permission to use Node APIs.

Use separate tsconfigs/type scopes when needed.

Example conceptual split:

```text
tsconfig.node.json    -> Vite/tooling scripts, Node types
app tsconfig          -> browser libs, no accidental Node globals
backend tsconfig      -> Node types
```

Do not add `@types/node` globals to browser compilation merely to silence an invalid `process`, `Buffer`, or `fs` usage.

---

# 16. Husky 9

Husky manages Git hooks.

Current direction is file-based hooks under `.husky/`.

Example:

```sh
# .husky/pre-commit
pnpm lint-staged
```

### Do not generate old Husky bootstrap boilerplate

Avoid old patterns such as:

```text
.husky/_/husky.sh sourcing copied from older tutorials
husky install commands copied from old major docs without checking current setup
~/.huskyrc as active configuration
```

Current Husky docs mark `~/.huskyrc` deprecated.

### Hooks are fast local feedback, not the whole CI

Do not run the entire production deployment suite in a pre-commit hook.

Use hooks for fast checks; CI remains authoritative.

---

# 17. lint-staged 17.x

Use lint-staged to run fast file-oriented tasks against staged files.

Example:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json}": "biome check --write"
  }
}
```

### Do not append `git add`

Modern lint-staged updates the Git index itself.

```text
❌ "biome check --write && git add"
```

### Do not put whole-project semantic gates here by default

Typecheck may need the full project graph and can be expensive. Put it in the appropriate hook/CI strategy rather than trying to pass only staged file names to `tsc` incorrectly.

---

# 18. commitlint 21.x + Conventional Commits

Use `@commitlint/cli` with the repository's chosen configuration.

Typical configuration:

```ts
export default {
  extends: ['@commitlint/config-conventional'],
};
```

Hook:

```sh
# .husky/commit-msg
pnpm exec commitlint --edit "$1"
```

### Purpose

Commitlint validates commit message structure. It does not replace:

```text
PR review
change documentation
OpenSpec change
release notes
semantic release policy
```

Do not encode product/business approval rules into commit message linting.

---

# 19. Private `@<organization>/*` packages

Examples previously supplied by the project include packages for contracts, DevSecOps evidence/governance, skills, and MFE tooling.

Public documentation is not sufficient to infer their APIs.

Mandatory rule:

```text
private package
    ↓
inspect installed package exports/types/README/source
    ↓
only then write integration code
```

### Forbidden

```text
❌ invent function names
❌ infer behavior from package name
❌ copy API from another internal package
❌ assume semantic-version compatibility without release evidence
```

If API cannot be inspected:

```text
PRIVATE_PACKAGE_API_UNKNOWN
```

and stop that integration step.

---

# 20. Module system policy — ESM vs CommonJS

Do not mix module systems accidentally.

Resolve from:

```text
package.json "type"
tsconfig module/moduleResolution
build tool
runtime
package exports
```

### Modern application direction

Prefer ESM where the repository is already ESM.

Use explicit file extensions where the runtime/output mode requires them.

Do not introduce `require()` into an ESM project merely because an old documentation snippet uses CommonJS.

### No `__dirname` cargo cult in ESM

Use current URL-based ESM patterns when truly needed:

```ts
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
```

But do not compute dirname/filename if the code does not need filesystem-relative access.

---

# 21. Boundary type policy

The shared type discipline is:

```text
external/untrusted
      ↓ unknown
runtime validation
      ↓
trusted domain/application type
```

Never:

```text
external JSON
      ↓ `as SomeType`
trusted automatically
```

### Error narrowing

Catch values are not guaranteed to be `Error`:

```ts
try {
  await operation();
} catch (error: unknown) {
  if (error instanceof Error) {
    // safe Error properties
  }
}
```

Create shared error normalization helpers only when multiple boundaries genuinely need them.

---

# 22. Money, IDs, dates and serialization

These rules are shared because both frontend and backend consume the contract.

## Money

Do not represent exact financial/regulatory decimal values as binary floating-point `number` across the HTTP contract.

Preferred wire representation:

```json
{
  "amount": "1299.90",
  "currency": "PEN"
}
```

Formatting is a UI responsibility; arithmetic is performed with an approved exact-decimal strategy in the correct layer.

## IDs

Do not coerce opaque string IDs to numbers unless the contract says they are numeric.

## Dates

Wire contracts should explicitly define the date/time format and timezone semantics.

Prefer ISO/RFC-compatible strings at boundaries and parse deliberately.

Do not rely on:

```text
browser locale parser magic
server locale
implicit timezone
```

## Enums

Prefer contract-owned finite schemas/types over duplicated string unions in each consumer.

---

# 23. Configuration and secrets

Shared rule:

```text
configuration can be validated
secrets must never become browser-visible accidentally
```

Frontend public runtime config and backend secrets are different trust surfaces.

### Backend

Validate environment/config at startup and fail closed outside intentionally permissive local modes.

### Frontend

Anything bundled or delivered to the browser is public.

Naming something `SECRET` does not make it secret if Vite/CDN publishes it.

### Logging/test artifacts

Never include:

```text
passwords
raw auth tokens
session cookies
AWS secret keys
private keys
full sensitive request bodies
PII without explicit need/redaction
```

---

# 24. Test data and determinism

Tests should be deterministic.

Prefer factories/fixtures with explicit overrides:

```ts
const user = makeUser({ status: 'active' });
```

Avoid random data when the random value is irrelevant to the assertion.

If property/randomized tests are used, capture/replay the seed on failure.

Time-dependent tests SHOULD use controllable clocks/fake timers where appropriate rather than sleeping.

---

# 25. Dependency hygiene

Before adding a package:

```text
1. Search existing repository capability.
2. Check Node/browser standard capability.
3. Check existing dependency that already solves it.
4. Verify package maintenance/security/license policy.
5. Determine prod vs dev dependency.
6. Add only through normal package-manager workflow.
7. Review lockfile delta.
8. Run supply-chain/security gates configured by repository.
```

### No duplicate libraries for the same responsibility without reason

Examples:

```text
❌ two schema validators
❌ two test runners
❌ two formatters
❌ multiple HTTP clients with no boundary reason
❌ multiple date libraries for trivial formatting
```

A migration period is an exception and must be explicit.

---

# 26. Anti-existente matrix

| Area | Do in 2026 | Do NOT generate by default |
|---|---|---|
| JS vars | `const`/`let` | `var` |
| async | `async`/`await`, AbortSignal where supported | callback pyramids |
| TS trust boundary | `unknown` + Zod | `as Type`, `any` |
| TS modules | project ESM/current resolution | copied `moduleResolution: node10` |
| TS type imports | `import type` | runtime imports used only as types |
| TS7 | fix removed/deprecated config | `ignoreDeprecations` cargo cult |
| Node imports | `node:fs`, `node:crypto` | ambiguous existente built-in imports in new code |
| Node runtime | approved Node 24 LTS patch | `node:latest` |
| Zod | Zod 4 APIs | v3-only helper/fork patterns |
| Zod formats | top-level format APIs for new schemas | old format-chain examples by reflex |
| API contract | project OpenAPI 3.1 until changed | automatic OpenAPI 3.2 migration |
| Tests | Vitest | Jest config copied from tutorials |
| Coverage | Vitest V8/Istanbul config | old c8/nyc assumptions without repo evidence |
| Formatter/linter | Biome | new ESLint + Prettier duplication |
| Biome 2.5 | `rules.preset` for new/migrated config | deprecated `recommended` boolean in newly authored 2.5 config |
| TS execution | `tsx` for scripts/dev | treating `tsx` as typechecker |
| Git hooks | Husky 9 file hooks | deprecated `.huskyrc` |
| staged files | lint-staged | manual `git add` inside task |
| commit format | commitlint 21 | homemade regex when commitlint already owns it |
| private packages | inspect exports/types | invent APIs |

---

# 27. Agent decision algorithm

For every shared-technology code request:

```text
START
  ↓
Identify target repository/surface
  ↓
Read package.json
  ↓
Read lockfile
  ↓
Resolve exact dependency
  ↓
Is dependency private?
  ├─ yes -> inspect installed package; if unavailable -> BLOCK
  └─ no
      ↓
Check official docs for resolved major if API is version-sensitive
      ↓
Check shared skill rule
      ↓
Check frontend/backend specialized skill
      ↓
Generate smallest scoped implementation
      ↓
Biome
      ↓
TypeScript typecheck
      ↓
Relevant tests
      ↓
Contract/evidence gates
      ↓
DONE
```

### Conflict rule

When shared and specialized skills appear to conflict:

```text
repository executable evidence
>
specialized surface rule
>
shared general rule
```

Do not average conflicting instructions.

---

# 28. Prompt-builder integration

Prompt packs should refer to logical capabilities, not file paths.

Example:

```yaml
skills:
  primary:
    - web-mfe-build-feature
  supporting:
    - shared-technologies
    - web-mfe-technologies
```

or backend:

```yaml
skills:
  primary:
    - node-nest-build-feature
  supporting:
    - shared-technologies
    - node-nest-technologies
```

The Capability Resolver maps those names to Agent Plugins.

The lock SHOULD record:

```json
{
  "id": "shared-technologies",
  "origin": "agent-plugin",
  "plugin": "vigilio-engineering-core",
  "version": "<resolved>",
  "sha256": "<content-hash>"
}
```

This makes AI execution reproducible.

---

# 29. Minimal senior checklist

Before completing a frontend/backend change:

```text
[ ] package.json read
[ ] pnpm-lock.yaml read
[ ] no invented private APIs
[ ] current dependency major verified
[ ] no old-major syntax copied
[ ] untrusted data starts as unknown
[ ] Zod boundary validated where applicable
[ ] no duplicated contract DTOs
[ ] OpenAPI project version preserved
[ ] Biome passes
[ ] TypeScript semantic typecheck passes
[ ] Vitest/relevant tests pass
[ ] Playwright only where risk/scope requires
[ ] no secrets in logs/artifacts/browser
[ ] lockfile delta intentional
[ ] evidence recorded
```

---

# 30. Official sources verified for this snapshot

The following official/project-maintainer sources were checked while producing this skill. The repository lockfile still wins for exact installed versions.

## TypeScript

- TypeScript 7.0 announcement: https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- TypeScript docs / TSConfig: https://www.typescriptlang.org/docs/handbook/tsconfig-json
- TSConfig `types`: https://www.typescriptlang.org/tsconfig/types

## Node.js

- Node releases: https://nodejs.org/en/about/previous-releases
- Node downloads / active lines: https://nodejs.org/en/download/current/
- Node 24 LTS release history: https://nodejs.org/en/blog/release/v24.11.0

## pnpm

- pnpm official documentation: https://pnpm.io/

## Zod

- Zod documentation: https://zod.dev/
- Zod migration documentation: https://zod.dev/v4/changelog

## OpenAPI

- Latest OpenAPI specification: https://spec.openapis.org/oas/latest.html
- OpenAPI 3.1.2: https://spec.openapis.org/oas/v3.1.2.html

## Vitest

- Coverage configuration: https://vitest.dev/config/coverage
- Vitest v4 coverage guide: https://v4.vitest.dev/guide/coverage

## Playwright

- Assertions: https://playwright.dev/docs/test-assertions
- API testing: https://playwright.dev/docs/api-testing

## Biome

- Biome 2.5 release: https://biomejs.dev/blog/biome-v2-5/
- Linter: https://biomejs.dev/linter/
- Formatter: https://biomejs.dev/formatter/

## tsx

- Getting started: https://tsx.is/getting-started
- TypeScript/typecheck behavior: https://tsx.is/typescript
- Compilation: https://tsx.is/compilation

## Git workflow

- Husky: https://typicode.github.io/husky/how-to.html
- lint-staged: https://github.com/lint-staged/lint-staged
- commitlint CLI: https://commitlint.js.org/reference/cli.html

---

# 31. Final invariant

The AI does not code against what it remembers.

It codes against:

```text
resolved repository dependency
+
current public API
+
shared platform rules
+
specialized frontend/backend rules
+
contracts/OpenSpec
+
executable evidence
```

If those sources cannot establish an API safely, **the agent must block that integration instead of fabricating code**.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).


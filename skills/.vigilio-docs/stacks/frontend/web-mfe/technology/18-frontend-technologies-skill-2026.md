# Frontend Technologies — Version-Aware Skill (Senior 2026)

> **STATUS:** Detailed reference for the `k8s-v2` profile. The CURRENT routable skill lives at `platform-actions/skills/web-mfe-technologies`; Agent Plugin packaging remains TARGET.
>
> **Snapshot date:** 2026-08-09.
>
> **Purpose:** Prevent an AI coding agent from generating existente, deprecated, cross-version, or framework-mismatched frontend code.
>
> **Target stack:** Preact + TypeScript + Vite + Tailwind CSS + TanStack Query + React Hook Form + Zod + Wouter + Signals/Zustand + Vitest/Testing Library/Playwright + optional `lightweight-charts`/OGL visualization + profile-aware delivery. `k8s-v2` uses OCI/ECR/EKS/Terraform/Helm/GitOps.
>
> **Recommended repository location:**
>
> `agent-plugins/vigilio-web-mfe/skills/web-mfe-technologies/references/technologies.md`
>
> This file is technical execution knowledge. It is **not** a source of product requirements, business rules, API contracts, or OpenSpec behavior.

### Product identity and migration state

This reference targets a new physical consumer, `web-mfe-v2`. It does not rename, replace, or mutate the existing `web-mfe` repository.

| Profile | Backend owner | Contract package | Frontend consumer | State on 2026-08-08 |
|---|---|---|---|---|
| `current-web` | `bus-impl` | `@vigilioyonatan/bus-contracts` | `web-mfe` | Existing active line; preserve |
| `k8s-v2` | `bus-impl-v2` | `@vigilioyonatan/bus-v2-contracts` | `web-mfe-v2` | Materialized Kubernetes line |

`web-mfe-v2` now has its own `package.json`, lockfile, source tree, tests, OpenSpec, runtime container and CI/GitOps surfaces. The version table below remains a review snapshot; manifest, lockfile and executable evidence still win.

---

## 0. Skill contract

This document is an execution guardrail for coding agents.

The agent MUST:

1. Read the real `package.json` and lockfile before generating package-specific code.
2. Treat the installed/resolved version as the runtime fact.
3. Check the public API documented for that major/minor version.
4. Prefer current public APIs over internal package paths.
5. Use the project contract package to validate untrusted HTTP payloads.
6. Keep server state, client state, form state, and URL state separate.
7. Preserve Preact as the UI runtime even when React ecosystem packages are consumed through `preact/compat`.
8. Run typecheck independently from Vite/Biome.
9. Generate tests using the current Vitest/Testing Library/Playwright APIs.
10. Fail closed when the manifest and official package registry/documentation disagree.

The agent MUST NOT:

- copy examples from old StackOverflow/blog posts without checking the installed version;
- silently downgrade syntax to an older major;
- mix two majors of the same library in one implementation;
- import an internal package merely because it exists in `node_modules`;
- invent APIs for private `@<organization>/*` packages;
- use React Router APIs in Wouter code;
- use React Query v3/v4 call signatures in TanStack Query v5;
- use Tailwind v3 bootstrap/configuration as the default for Tailwind v4;
- use Zod v3-deprecated APIs when a Zod v4 canonical equivalent exists;
- use MSW v1 `rest`/`ctx` APIs in MSW v2;
- use Jest APIs in Vitest tests;
- use cdk-nag v2 suppression APIs with cdk-nag v3;
- expose Vite client environment variables as secrets.

---

# 1. Source-of-truth precedence

When sources conflict, use this order:

```text
1. pnpm-lock.yaml / installed package resolution
2. package.json of the target repository
3. package exports + bundled .d.ts of the resolved dependency
4. official documentation for that resolved version/major
5. official migration/release notes
6. this skill
7. examples/blogs/community posts
```

This skill never overrides executable evidence.

### Fail-closed statuses

```text
STACK_OK
= declared version exists and public API is understood.

STACK_VERSION_MISMATCH
= requested/declared version is not found in the verified official registry snapshot.

STACK_REVIEW_REQUIRED
= package exists, but the declared package choice conflicts with the vendor's recommended public adapter/API.

PRIVATE_PACKAGE_API_UNKNOWN
= organization-owned package has no public documentation available to this skill.

LEGACY_API_BLOCKED
= requested code uses an API explicitly deprecated/removed for the target major.
```

When a status is not `STACK_OK`, the agent MUST inspect the actual repository/lockfile before coding that integration.

---

# 2. Manifest audit — supplied stack vs verified public ecosystem

The versions below are the versions supplied to this skill. Verification is based on official project documentation and/or npm metadata available on **2026-08-08**.

| Package | Declared | Verification result | Rule |
|---|---:|---|---|
| `@aws-amplify/api-rest` | `4.6.4` | Exists, but npm marks package **INTERNAL USE ONLY** | `STACK_REVIEW_REQUIRED` |
| `@aws-amplify/core` | `6.18.0` | Public npm snapshot shows `6.17.x`; package is **INTERNAL USE ONLY** | `STACK_VERSION_MISMATCH` + review |
| `@preact/signals` | `2.11.0` | Verified public snapshot showed `2.10.0` latest | `STACK_VERSION_MISMATCH` |
| `@tanstack/react-query` | `5.101.4` | Verified | `STACK_OK` |
| `@tanstack/react-table` | `9.1.1` | Official v9 is still beta; npm stable tag remains v8 | `STACK_VERSION_MISMATCH` |
| `@vigilioyonatan/bus-v2-contracts` | `2026.6.0` | Private/org package owned by `bus-impl-v2`; exports must be inspected | `PRIVATE_PACKAGE_API_UNKNOWN` until consumer materialization |
| `@hookform/resolvers` | `5.7.1` | Verified registry snapshot showed `5.5.x` latest | `STACK_VERSION_MISMATCH` |
| `preact` | `10.29.8` | Verified snapshot showed `10.29.7` latest | `STACK_VERSION_MISMATCH` |
| `react` → `@preact/compat` | `18.3.2` | Compatibility alias pattern is valid; exact resolution must come from lockfile | verify lock |
| `react-dom` → `@preact/compat` | `18.3.2` | Compatibility alias pattern is valid; exact resolution must come from lockfile | verify lock |
| `react-hook-form` | `7.85.0` | Exact version not confirmed by public snapshot used for this skill | verify lock/registry |
| `sonner` | `2.0.7` | Verified | `STACK_OK` |
| `tailwindcss` | `4.3.3` | Verified | `STACK_OK` |
| `wouter-preact` | `3.10.0` | Verified | `STACK_OK` |
| `zustand` | `5.0.14` | Verified | `STACK_OK` |
| `zod` | `4.4.3` | Verified | `STACK_OK` |
| `@axe-core/playwright` | `4.12.1` | Verified | `STACK_OK` |
| `@biomejs/biome` | `2.5.7` | Verified snapshot showed `2.5.6` latest | `STACK_VERSION_MISMATCH` |
| `@commitlint/cli` | `21.2.1` | Verified | `STACK_OK` |
| `@commitlint/config-conventional` | `21.2.0` | Verified | `STACK_OK` |
| `@playwright/test` | `1.62.1` | Official docs already document v1.62; exact patch must be verified in lock/registry | verify lock |
| `@tailwindcss/vite` | `4.3.3` | Verified | `STACK_OK` |
| `@testing-library/jest-dom` | `7.0.0` | Verified | `STACK_OK` |
| `@testing-library/preact` | `3.2.4` | Verified | `STACK_OK` |
| `@testing-library/user-event` | `14.6.3` | Verified public snapshot showed `14.6.1` latest | `STACK_VERSION_MISMATCH` |
| `@types/node` | `26.2.0` | Verified snapshot showed `26.1.x`; runtime alignment also required | `STACK_VERSION_MISMATCH` |
| `@vitest/coverage-v8` | `4.1.10` | Verified | `STACK_OK` |
| `@vigilioyonatan/devsecops-evidence` | `0.2.0` | Private/org package | `PRIVATE_PACKAGE_API_UNKNOWN` |
| `@vigilioyonatan/devsecops-governance` | `0.3.0` | Private/org package | `PRIVATE_PACKAGE_API_UNKNOWN` |
| `@vigilioyonatan/vigilio-skills` | `0.3.1` | Private/org package | `PRIVATE_PACKAGE_API_UNKNOWN` |
| `@vigilioyonatan/web-mfe-tooling` | `0.1.0` | Private/org package | `PRIVATE_PACKAGE_API_UNKNOWN` |
| `aws-cdk` | `2.1135.1` | Verified snapshot showed `2.1133.x` | `STACK_VERSION_MISMATCH` |
| `aws-cdk-lib` | `2.263.0` | Verified snapshot showed `2.262.x` | `STACK_VERSION_MISMATCH` |
| `cdk-nag` | `3.0.2` | Verified public snapshot showed `3.0.1` | `STACK_VERSION_MISMATCH` |
| `constructs` | `10.8.1` | Exact version must be confirmed by lock/registry | verify lock |
| `happy-dom` | `20.11.2` | Verified public snapshot showed `20.11.1` | `STACK_VERSION_MISMATCH` |
| `husky` | `9.1.7` | v9 workflow is valid; exact resolution must come from lockfile | verify lock |
| `lint-staged` | `17.3.0` | Verified snapshot showed `17.0.8` | `STACK_VERSION_MISMATCH` |
| `lightweight-charts` | `5.2.0` | Verified official release and v5.2 API documentation | `STACK_OK` |
| `msw` | `2.15.0` | Verified | `STACK_OK` |
| `ogl` | `1.0.11` | Verified npm release; official package includes TypeScript declarations | `STACK_OK` |
| `typescript` | `7.0.2` | Verified | `STACK_OK` |
| `tsx` | `4.23.11` | Verified snapshot showed `4.23.1` | `STACK_VERSION_MISMATCH` |
| `vite` | `8.2.1` | Stable snapshot showed `8.1.5`; `8.2.0-beta.0` existed | `STACK_VERSION_MISMATCH` |
| `vitest` | `4.1.10` | Verified | `STACK_OK` |
| `web-vitals` | `6.1.0` | Verified snapshot showed `6.0.0` | `STACK_VERSION_MISMATCH` |

### Critical interpretation

A version mismatch in this table does **not** authorize the agent to edit `package.json` automatically.

Correct behavior:

```text
1. inspect real lockfile;
2. inspect configured registry (public/private);
3. confirm resolved version;
4. if version truly does not exist -> report;
5. propose dependency correction through the normal OpenSpec/change workflow;
6. never fabricate API usage.
```

---

# 3. Responsibility map — avoid state duplication

The stack intentionally contains multiple state tools. They are **not interchangeable**.

| State type | Owner |
|---|---|
| Remote/server data | `@tanstack/react-query` |
| Form values/errors/touched/dirty | `react-hook-form` |
| Runtime validation / contract decoding | `zod` |
| Tiny reactive UI state / derived local state | `@preact/signals` |
| Shared client-only application state | `zustand` |
| Route/path/search state | `wouter-preact` + URL |
| Toast/ephemeral feedback | `sonner` |
| Financial/time-series canvas | `lightweight-charts` 5.2.0; lifecycle in a reusable hook, data in Query/service |
| Optional WebGL effect | OGL 1.0.11 inside an isolated lazy component; never owns business state |
| Persistent domain truth | backend/API, never frontend store |

### Forbidden duplication

```text
❌ API response cached in TanStack Query AND copied into Zustand.
❌ Form fields stored in React Hook Form AND Signals.
❌ Current route duplicated in Zustand.
❌ Zod schema duplicated as a handwritten TypeScript interface.
❌ Backend DTO copied manually instead of consumed from the contract package.
```

---

# 4. JavaScript / TypeScript 7.0.2

## 4.1 Current baseline

TypeScript 7.0 is the native Go implementation of the TypeScript compiler/language service.

Important TS7 defaults include:

```text
strict = true
module = esnext
noUncheckedSideEffectImports = true
stableTypeOrdering = true
types = []
rootDir behavior changed
```

TypeScript 7 also turns TypeScript 6 deprecations into hard errors.

### Recommended frontend `tsconfig` direction

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "noEmit": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "useDefineForClassFields": true,
    "types": []
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

Do not blindly copy this config if the project already has an intentional equivalent. Preserve project-specific compiler boundaries.

## 4.2 Modern TypeScript rules

Prefer:

```ts
const status = input.status ?? 'PENDING';

const dto = {
  id: 1,
  name: 'Ada',
} satisfies UserDto;

function parsePayload(value: unknown) {
  return UserSchema.parse(value);
}

import type { User } from './types.js';
```

Use:

- `unknown` for untrusted data;
- type narrowing;
- discriminated unions;
- `satisfies` when validating object shape while preserving inference;
- `import type` for type-only dependencies;
- `readonly` where mutation is not part of the contract;
- explicit domain result/error types for expected failures.

Avoid:

```ts
let x: any;
const user = response as User;
var state = {};
// @ts-ignore
```

### Anti-existente TS7

Do NOT generate these old compiler choices for this stack:

```text
target: es5
downlevelIteration
moduleResolution: node
moduleResolution: node10
moduleResolution: classic
module: amd
module: umd
module: systemjs
module: none
baseUrl as old path-resolution crutch
esModuleInterop: false
allowSyntheticDefaultImports: false
```

For a browser app bundled by Vite, use `moduleResolution: "bundler"` unless the repo proves another strategy.

### TS7 programmatic API warning

TypeScript 7.0 ships without the old stable programmatic compiler API. Tooling that imports the TypeScript compiler API may need TypeScript 6 compatibility until TS7.1+.

Therefore:

```text
tsc CLI/typecheck                -> TypeScript 7 is appropriate
tool imports `typescript` API    -> verify compatibility first
```

Never assume a TypeScript 6 compiler plugin can import TS7 internals unchanged.

---

# 5. Preact 10.x + `preact/compat`

## 5.1 Native Preact first

For application-owned code:

```tsx
import { render } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
```

Use `preact/compat` only to satisfy React ecosystem packages that require React APIs.

Recommended TS JSX setup:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  }
}
```

If ecosystem type resolution requires explicit aliases, use the Preact-documented `paths` setup rather than inventing React typings.

## 5.2 React aliases

The supplied project aliases:

```json
{
  "react": "npm:@preact/compat@18.3.2",
  "react-dom": "npm:@preact/compat@18.3.2"
}
```

are a compatibility strategy.

Rules:

```text
✅ application code remains Preact-oriented
✅ React-only library may resolve through compat
✅ lockfile proves aliases

❌ install a second real React runtime accidentally
❌ import obsolete `preact-compat`
❌ mix multiple React/Preact renderer copies
```

## 5.3 Preact compatibility caveat

Do not assume every React concurrency semantic is fully reproduced by `preact/compat`.

If a third-party library depends deeply on React-specific renderer internals or concurrent semantics, create a compatibility spike/test before adoption.

---

# 6. `@preact/signals`

## Use for

- tiny global/reactive flags;
- local reactive state;
- cheap computed/derived values;
- values that benefit from fine-grained updates.

### Current pattern

```tsx
import { batch, computed, signal } from '@preact/signals';

const first_name = signal('Ada');
const last_name = signal('Lovelace');

const full_name = computed(
  () => `${first_name.value} ${last_name.value}`,
);

function updateName() {
  batch(() => {
    first_name.value = 'Grace';
    last_name.value = 'Hopper';
  });
}
```

Within component-local logic:

```tsx
import {
  useComputed,
  useSignal,
  useSignalEffect,
} from '@preact/signals';

function Counter() {
  const count = useSignal(0);
  const doubled = useComputed(() => count.value * 2);

  useSignalEffect(() => {
    document.title = `Count ${count.value}`;
  });

  return (
    <button onClick={() => count.value++}>
      {doubled}
    </button>
  );
}
```

Preact can optimize a Signal rendered directly in text JSX:

```tsx
<p>{count}</p>
```

instead of subscribing the whole component through `count.value` when direct binding is appropriate.

### Senior rules

```text
computed -> derived data
effect/useSignalEffect -> side effects only
batch -> atomic group of synchronous signal writes
```

Do NOT:

```text
❌ fetch API data in Signals as a replacement for TanStack Query
❌ duplicate query cache into Signals
❌ use effect to derive data that should be computed
❌ create uncontrolled module-global mutable signals for request/user-specific state
```

### Version gate

The declared `2.11.0` was not verified in the public registry snapshot used for this skill. Resolve the actual lockfile before importing APIs added after `2.10.x`.

---

# 7. TanStack Query v5 (`@tanstack/react-query`)

## Purpose

TanStack Query owns **server state**, not general UI state.

It manages:

- fetching;
- request dedupe;
- cache;
- freshness;
- retries;
- invalidation;
- mutations;
- background refetch;
- cancellation;
- garbage collection.

## 7.1 Current v5 query syntax

```tsx
import {
  queryOptions,
  useQuery,
} from '@tanstack/react-query';

const user_query = (user_id: string) =>
  queryOptions({
    queryKey: ['users', 'detail', user_id] as const,
    queryFn: ({ signal }) => getUser(user_id, signal),
    staleTime: 30_000,
  });

function UserPage({ user_id }: { user_id: string }) {
  const query = useQuery(user_query(user_id));

  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} />;

  return <UserView user={query.data} />;
}
```

### Correct v5 mutation

```tsx
const mutation = useMutation({
  mutationFn: registerUser,
  onSuccess: async () => {
    await query_client.invalidateQueries({
      queryKey: ['users', 'list'],
    });
  },
});
```

## 7.2 Important v5 defaults

By default:

```text
cached query data -> stale
inactive query GC -> 5 minutes
failed query retry -> 3 attempts
structural sharing -> enabled
```

Therefore `staleTime` MUST be intentional.

Do not set:

```ts
staleTime: Infinity
```

everywhere just to hide refetching.

## 7.3 Cancellation

Pass the `AbortSignal` through the HTTP client:

```ts
async function getUser(id: string, signal?: AbortSignal) {
  const response = await fetch(`/api/users/${id}`, { signal });

  const raw: unknown = await response.json();
  return UserResponseValidator.parse(raw);
}
```

## 7.4 Query key policy

Prefer deterministic factories:

```ts
export const user_keys = {
  all: ['users'] as const,
  list: (filters: UsersFilters) =>
    ['users', 'list', filters] as const,
  detail: (id: string) =>
    ['users', 'detail', id] as const,
};
```

Avoid:

```text
❌ random string keys spread through components
❌ using object identity that changes unpredictably
❌ invalidating the entire cache after every mutation
```

## 7.5 Anti-existente

Do NOT generate React Query v3/v4 style positional usage:

```tsx
// ❌
useQuery(['users'], fetchUsers);
```

Use v5 object syntax:

```tsx
// ✅
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
});
```

Do not use old `cacheTime`; v5 terminology is `gcTime`.

---

# 8. TanStack Table — mandatory compatibility gate

## Current finding

The supplied manifest declares:

```json
"@tanstack/react-table": "9.1.1"
```

This is not consistent with the official public distribution observed for TanStack Table:

```text
stable/latest -> v8
v9 -> beta
```

TanStack's official v9 Preact documentation uses:

```bash
npm install @tanstack/preact-table@beta
```

and the native v9 Preact hook is:

```tsx
import {
  tableFeatures,
  useTable,
} from '@tanstack/preact-table';
```

### Mandatory rule

Do NOT generate table implementation until the lockfile is inspected.

Possible valid states:

### State A — actual v8 + Preact compat

```text
@tanstack/react-table@8.x
Preact uses React adapter through preact/compat
```

Then v8 API such as `useReactTable` may be correct.

### State B — v9 beta native Preact

```text
@tanstack/preact-table@beta
```

Then use v9 API:

```tsx
import {
  tableFeatures,
  useTable,
} from '@tanstack/preact-table';
```

v9 introduces explicit features and changed row-model wiring.

### Never generate hybrid code

```text
❌ @tanstack/react-table v8 imports + v9 useTable
❌ @tanstack/preact-table v9 + v8 get*RowModel configuration
❌ useLegacyTable as permanent architecture
```

`useLegacyTable` is migration-only/deprecated support, not target architecture.

### v9 migration rules to remember

- native Preact adapter: `@tanstack/preact-table`;
- `useReactTable` → `useTable`;
- features are explicit;
- core row model is automatic;
- row models move to `tableFeatures(...)`;
- pinning terminology `left/right` moved to logical `start/end`;
- avoid broad subscriptions for high-volume tables;
- `stockFeatures` is useful for migration, but explicit features are preferable for optimized production bundles.

---

# 9. React Hook Form v7 + `@hookform/resolvers`

## Responsibility

RHF owns:

```text
field value
dirty
touched
validation state
submit state
field registration
```

It does not own server cache.

## Current Zod integration

```tsx
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const StoreUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

type StoreUserInput = z.input<typeof StoreUserSchema>;
type StoreUserOutput = z.output<typeof StoreUserSchema>;

const form = useForm<StoreUserInput, unknown, StoreUserOutput>({
  resolver: zodResolver(StoreUserSchema),
  defaultValues: {
    name: '',
    email: '',
  },
});
```

If input/output types are identical and inference is sufficient:

```tsx
useForm({
  resolver: zodResolver(StoreUserSchema),
});
```

is valid.

## Native/uncontrolled first

Prefer:

```tsx
<input {...register('name')} />
```

Use controlled wrappers only when the UI component genuinely requires them.

Do NOT:

```text
❌ mirror every field with useState
❌ mirror RHF values into Signals/Zustand
❌ construct a second validation schema inside component code
```

## Error UX

```text
field validation error -> inline near field
submit/server failure -> form-level error and/or toast
success -> optional toast
```

Sonner is not a field validation system.

## Version gate

`@hookform/resolvers@5.7.1` was not found in the verified public snapshot. Do not assume APIs newer than the actually resolved package.

---

# 10. Zod 4.4.3

## 10.1 Canonical import

```ts
import * as z from 'zod';
```

## 10.2 Use Zod at trust boundaries

Correct:

```ts
const raw: unknown = await response.json();

const result = UserResponseValidator.safeParse(raw);

if (!result.success) {
  throw new ContractViolationError(result.error);
}

return result.data;
```

Incorrect:

```ts
const user = (await response.json()) as UserResponse;
```

A TypeScript cast does not validate runtime data.

## 10.3 Prefer top-level string formats in Zod 4

Preferred:

```ts
z.email();
z.url();
z.uuid();
z.ipv4();
z.ipv6();
z.cidrv4();
z.cidrv6();
z.iso.date();
z.iso.datetime();
```

Do not generate old/deprecated method forms by default:

```ts
// ❌ deprecated direction in Zod 4
z.string().email();
z.string().uuid();
```

## 10.4 Enum

Prefer:

```ts
const RoleSchema = z.enum(['ADMIN', 'MEMBER']);
```

For enum-like input, Zod 4 supports `z.enum(...)`.

Avoid new code using:

```ts
// ❌ deprecated in Zod 4
z.nativeEnum(...)
```

Also avoid the TypeScript `enum` keyword unless interoperability requires it; string literal unions/const objects are usually easier to serialize.

## 10.5 Refinements

Use normal `.refine(...)` for simple rules.

For low-level multi-issue checks in Zod 4, prefer the current `.check(...)` direction when appropriate instead of creating new dependency on deprecated refinement APIs.

Do not depend on removed/changed `ctx.path` semantics from Zod 3 examples.

## 10.6 Records

Zod 4 requires explicit key/value schemas for generic records:

```ts
z.record(z.string(), z.string());
```

Do not generate old one-argument `z.record(...)` examples.

## 10.7 Input vs output

When transforms/codecs exist:

```ts
type Input = z.input<typeof schema>;
type Output = z.output<typeof schema>;
```

Do not assume they are identical.

## 10.8 No duplicated DTO typing

Prefer:

```ts
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type UserSchema = z.output<typeof userSchema>;
// Si un paquete externo publica `UserSchema` como validador runtime,
// NO renombrar ese símbolo sin versión/migración del consumidor.
```

over:

```ts
interface User { ... } // duplicated manually
const UserSchema = ... // second truth
```

---

# 11. `@vigilioyonatan/bus-v2-contracts`

This is an organization-owned package. This skill does not invent its exports.

Before using it, inspect:

```text
node_modules/@vigilioyonatan/bus-v2-contracts/package.json
exports
types/.d.ts
README/docs
actual imports already used in web-mfe
```

Expected architectural responsibility, if confirmed by the repository:

```text
browser-safe Zod schemas
request/response contracts
shared exact types derived from schemas
possibly operation identifiers
```

It MUST NOT leak:

```text
NestJS
Swagger decorators
nestjs-zod server adapters
Node built-ins
Drizzle adapters
server secrets
backend side effects
```

### Boundary rule

```text
HTTP response: unknown
        ↓
bus-contracts Zod schema
        ↓
validated DTO
        ↓
TanStack Query cache
        ↓
UI
```

Never:

```text
HTTP response
  ↓
`as User`
  ↓
UI
```

---

# 12. AWS Amplify REST — public API gate

## Critical package finding

The manifest contains:

```text
@aws-amplify/api-rest
@aws-amplify/core
```

Both package pages identify these scoped packages as **INTERNAL USE ONLY** and instruct app developers to use `aws-amplify`.

The public Amplify v6 REST API is documented through:

```ts
import { get, post, put, del, patch } from 'aws-amplify/api';
```

Therefore this project requires `STACK_REVIEW_REQUIRED`.

### Do not blindly rewrite imports

First determine whether:

1. `aws-amplify` is installed indirectly/directly;
2. `@vigilioyonatan/web-mfe-tooling` intentionally wraps Amplify;
3. existing code has an approved adapter;
4. the scoped packages are intentionally pinned for a platform-specific reason.

### Public Amplify v6 pattern

If the public facade is installed/approved:

```ts
import { get } from 'aws-amplify/api';

const operation = get({
  apiName: 'BusApi',
  path: '/users',
  options: {
    headers: {
      'x-correlation-id': correlationId,
    },
  },
});

const { body } = await operation.response;
const raw: unknown = await body.json();
```

Then validate:

```ts
return UsersResponseValidator.parse(raw);
```

### Do not generate Amplify v5 API

```ts
// ❌ v5 legacy style
API.get(apiName, path, options);
API.post(apiName, path, options);
```

Amplify v6 uses functional APIs and named input objects.

### Security

Never:

```text
❌ put secret keys in Vite env
❌ hardcode authorization tokens
❌ log full tokens
❌ trust HTTP JSON without contract validation
```

---

# 13. Wouter Preact 3.10.0

Use the Preact adapter:

```tsx
import {
  Link,
  Redirect,
  Route,
  Switch,
  useLocation,
  useRoute,
} from 'wouter-preact';
```

Wouter does not require a top-level Router for the basic case.

Example:

```tsx
<Switch>
  <Route path="/users" component={ListUsersPage} />
  <Route path="/users/:id">
    {(params) => <UsersShowPage id={params.id} />}
  </Route>
  <Route>
    <NotFoundPage />
  </Route>
</Switch>
```

### Do NOT generate React Router code

```text
❌ BrowserRouter
❌ Routes
❌ useNavigate
❌ Outlet
❌ createBrowserRouter
```

unless React Router is actually added as a dependency through an approved change.

### URL state

Filters that should be shareable/bookmarkable belong in URL/search params, not hidden global state.

---

# 14. Zustand 5.0.14

## Use for

Shared client-only state such as:

- UI preferences;
- session-adjacent non-secret client state;
- cross-page draft state when intentionally persistent;
- complex client workflows that are not server truth.

Basic pattern:

```ts
import { create } from 'zustand';

interface UiState {
  isSidebarOpen: boolean;
  setSidebarOpen(value: boolean): void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: false,
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
}));
```

## Select narrowly

Prefer:

```ts
const isSidebarOpen = useUiStore(
  (state) => state.isSidebarOpen,
);
```

Avoid subscribing to the whole store:

```ts
// ❌ unnecessary rerender scope
const state = useUiStore();
```

### Stable composite selectors

Zustand v5 tightened selector/reference behavior. When returning arrays/objects from selectors, use stable patterns such as `useShallow` where appropriate.

## Store split

For large stores, use slices by responsibility.

Do NOT create:

```text
appStore
├── users fetched from API
├── products fetched from API
├── orders fetched from API
├── every form field
├── router
└── UI state
```

That duplicates TanStack Query, RHF and Wouter.

---

# 15. Sonner 2.0.7

Mount exactly one application-level toaster:

```tsx
import { Toaster } from 'sonner';

export function AppShell() {
  return (
    <>
      <AppRoutes />
      <Toaster richColors />
    </>
  );
}
```

Then:

```ts
import { toast } from 'sonner';

toast.success('Usuario creado');
toast.error('No se pudo guardar');
```

### Use for

```text
✅ transient success
✅ transient failure
✅ action completion feedback
```

Do not use for:

```text
❌ field validation
❌ persistent critical system status
❌ detailed error diagnostics
❌ replacing accessible inline errors
```

Because Sonner is a React ecosystem package, verify it runs through the project's Preact compatibility aliases.

---

# 16. Tailwind CSS 4.3.3 + `@tailwindcss/vite` 4.3.3

## 16.1 Current Vite integration

`vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
});
```

CSS:

```css
@import "tailwindcss";
```

This is the preferred Tailwind v4 + Vite direction.

## 16.2 CSS-first configuration

Use `@theme` for project tokens where applicable:

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 250);
  --spacing-page: 1.5rem;
}
```

If source detection needs an explicit additional location:

```css
@source "../node_modules/@company/ui";
```

## 16.3 Do NOT default to Tailwind v3 setup

Do not generate as the standard setup:

```text
❌ npx tailwindcss init -p
❌ content: ["./src/**/*.{js,ts,jsx,tsx}"] as mandatory default
❌ @tailwind base;
❌ @tailwind components;
❌ @tailwind utilities;
❌ PostCSS + autoprefixer solely because an old tutorial says so
```

Those are common v3-era recipes.

## 16.4 Never build dynamic partial class names

Bad:

```tsx
<div class={`bg-${color}-500`} />
```

Tailwind's scanner cannot reliably discover dynamically assembled fragments.

Prefer full literal alternatives:

```ts
const colorClasses = {
  success: 'bg-emerald-500 text-white',
  warning: 'bg-amber-500 text-black',
  danger: 'bg-red-500 text-white',
} as const;
```

## 16.5 Senior UI rules

- centralize design tokens;
- use semantic HTML before ARIA patches;
- keep focus states visible;
- use logical/RTL-safe utilities where possible;
- avoid arbitrary values when a reusable token is appropriate;
- do not create giant `@apply` abstractions that recreate component CSS architecture unnecessarily.

---

# 17. Vite 8.x

## Version gate

The supplied `8.2.1` was not stable in the verified public snapshot. Vite `8.1.x` was the stable line and `8.2.0-beta.0` existed.

Resolve lockfile first.

## 17.1 Vite 8 architecture

Vite 8 moved to a single unified **Rolldown** bundler and Oxc-based toolchain.

Do not design new Vite 8 configuration around old esbuild/Rollup internals unless a compatibility requirement proves it is necessary.

### Migration rule

Old/deprecated direction:

```ts
optimizeDeps: {
  esbuildOptions: {
    // ...
  },
}
```

Vite 8 direction:

```ts
optimizeDeps: {
  rolldownOptions: {
    // ...
  },
}
```

Vite can still convert some old options for compatibility, but new code should not depend on deprecated compatibility shims.

## 17.2 Environment variables

Browser-exposed Vite environment variables are accessed through:

```ts
import.meta.env.VITE_API_BASE_URL
```

Never:

```ts
process.env.API_URL
```

inside application browser code.

### Security

Anything prefixed `VITE_` is client-exposed.

Therefore:

```text
VITE_API_BASE_URL        ✅ public config
VITE_APP_ENV             ✅ public config

VITE_DB_PASSWORD         ❌ secret leak
VITE_AWS_SECRET_KEY      ❌ secret leak
VITE_PRIVATE_TOKEN       ❌ secret leak
```

Validate runtime/public config once at application bootstrap.

## 17.3 Vite does not replace typecheck

Vite transforms TypeScript, but the project still needs a semantic typecheck gate:

```bash
tsc --noEmit
```

or the repository's TypeScript 7 equivalent.

---

# 18. MSW 2.15.0

## Current v2 REST API

```ts
import {
  http,
  HttpResponse,
} from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json({
      data: [],
    });
  }),
];
```

Browser:

```ts
import { setupWorker } from 'msw/browser';
```

Node/tests:

```ts
import { setupServer } from 'msw/node';
```

## Do NOT generate MSW v1 API

```ts
// ❌ MSW v1
rest.get('/api/users', (req, res, ctx) => {
  return res(
    ctx.status(200),
    ctx.json({ data: [] }),
  );
});
```

Current v2 direction is:

```ts
http.get(...)
HttpResponse.json(...)
```

### Architecture

Mock the **network boundary**, not the internals of the API client.

Prefer handlers that represent real API semantics and contract shapes.

Where practical, validate mock fixtures with the same browser-safe contract schemas.

---

# 19. Vitest 4.1.10 + V8 coverage

## Current config

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'html', 'json'],
    },
  },
});
```

## Vitest, not Jest

Use:

```ts
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';

const fn = vi.fn();
vi.mock('./module');
```

Do NOT generate:

```text
jest.fn()
jest.mock()
jest.spyOn()
```

unless Jest is actually installed.

## Coverage v4 migration

Vitest 4 removed old options such as:

```text
coverage.all
coverage.extensions
coverage.ignoreEmptyLines
coverage.experimentalAstAwareRemapping
```

If you want uncovered source files represented, configure `coverage.include` explicitly.

### Test pyramid

```text
Vitest + happy-dom
        -> fast unit/component/integration

Playwright
        -> browser/e2e/real browser behavior
```

Do not try to make happy-dom prove browser behavior it does not implement.

---

# 20. `happy-dom`

Use as a fast simulated DOM for Vitest component tests.

Good for:

- DOM rendering;
- form interaction;
- most component behavior;
- Testing Library integration.

Not sufficient proof for:

- browser layout engine correctness;
- real navigation/browser policy;
- cross-browser rendering;
- service worker behavior;
- some native browser APIs;
- performance timing;
- end-to-end behavior.

For those use Playwright.

### Version gate

The supplied `20.11.2` was ahead of the verified public snapshot (`20.11.1`). Resolve lockfile.

---

# 21. Preact Testing Library 3.2.4

Import the framework-specific renderer:

```tsx
import {
  render,
  screen,
} from '@testing-library/preact';
```

Do NOT import:

```ts
// ❌ wrong adapter for application-owned Preact components
import { render } from '@testing-library/react';
```

Testing philosophy:

```text
test behavior
test accessibility
test user-observable output
avoid testing implementation details
```

Prefer semantic queries:

```ts
screen.getByRole('button', {
  name: /guardar/i,
});
```

Order of preference starts with user-accessible queries such as `getByRole` and `getByLabelText`.

Do not make `data-testid` the default selector.

### Preact event caveat

Preact follows native DOM event behavior more closely in some areas. Do not blindly copy React-specific event assumptions. Prefer realistic `user-event` interaction instead of manually dispatching low-level events.

---

# 22. `@testing-library/user-event`

Recommended v14 pattern:

```ts
import userEvent from '@testing-library/user-event';

it('submits form', async () => {
  const user = userEvent.setup();

  render(<UserForm />);

  await user.type(
    screen.getByLabelText(/email/i),
    'admin@example.com',
  );

  await user.click(
    screen.getByRole('button', {
      name: /guardar/i,
    }),
  );
});
```

Use a session from:

```ts
userEvent.setup()
```

and `await` interactions.

Avoid:

```text
❌ old `user-event` package without @testing-library scope
❌ treating v13 synchronous examples as current v14 style
❌ `fireEvent` for normal user interactions when user-event supports them
```

When using fake timers, configure `advanceTimers` rather than hacks like `delay: null`.

### Version gate

The supplied `14.6.3` was not present in the verified registry snapshot; `14.6.1` was the latest observed public release.

---

# 23. `@testing-library/jest-dom` 7.0.0 with Vitest

Use the Vitest entry:

```ts
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
```

Use current matchers:

```ts
expect(element).toBeInTheDocument();
expect(input).toHaveAccessibleName('Email');
expect(error).toHaveTextContent('Required');
```

Do NOT generate deprecated matcher names:

```text
toBeEmpty
toBeInTheDOM
toHaveDescription
```

Prefer:

```text
toBeEmptyDOMElement
toBeInTheDocument
toHaveAccessibleDescription
```

The package name says `jest-dom`, but the project is still using **Vitest**, not Jest.

---

# 24. Playwright 1.62 + `@axe-core/playwright` 4.12.1

## 24.1 Locator-first

Prefer:

```ts
const submit = page.getByRole('button', {
  name: /guardar/i,
});

await submit.click();

await expect(
  page.getByRole('status'),
).toContainText('Guardado');
```

Playwright locators provide auto-waiting/retry behavior.

Avoid brittle selectors:

```text
❌ div:nth-child(3) > button:nth-child(2)
❌ long XPath selectors
```

unless no stable user-facing contract exists.

## 24.2 Web-first assertions

Good:

```ts
await expect(
  page.getByText('Bienvenido'),
).toBeVisible();
```

Bad:

```ts
expect(
  await page.getByText('Bienvenido').isVisible(),
).toBe(true);
```

The bad pattern loses Playwright's assertion retry semantics.

## 24.3 Never solve race conditions with sleeps

Avoid:

```ts
await page.waitForTimeout(3000);
```

Use:

- locators;
- web-first assertions;
- request/response waits only when they represent the real contract;
- state-based conditions.

## 24.4 Accessibility with axe

Typical pattern:

```ts
import AxeBuilder from '@axe-core/playwright';

const results = await new AxeBuilder({
  page,
}).analyze();

expect(results.violations).toEqual([]);
```

Automated axe checks are useful but do not prove complete accessibility. Keep semantic/manual/keyboard testing for critical workflows.

---

# 25. Biome 2.x

## Role

Biome is the default formatter/linter/code-quality tool in this stack.

Local fix:

```bash
pnpm biome check --write .
```

CI:

```bash
pnpm biome ci .
```

### Do not recreate ESLint + Prettier by default

If Biome is canonical:

```text
❌ add ESLint because an AI template always does
❌ add Prettier because an AI template always does
❌ create conflicting formatting sources
```

Add another tool only when a required rule/capability is not covered and the decision is explicit.

## Type-aware/project rules

Biome 2 can run project-domain analysis such as import-cycle detection.

Example intentional gate:

```json
{
  "linter": {
    "rules": {
      "suspicious": {
        "noImportCycles": "error"
      }
    }
  }
}
```

Do not enable expensive project-wide rules blindly; enable those that protect real architecture constraints.

## Biome is not TypeScript semantic compilation

The quality pipeline still needs:

```text
Biome
+
TypeScript typecheck
```

not one or the other.

### Version gate

The supplied `2.5.7` was not in the verified public registry snapshot; `2.5.6` was observed.

---

# 26. Husky 9

Modern initialization:

```bash
pnpm exec husky init
```

This creates `.husky/pre-commit` and sets a `prepare` script.

Do not generate old Husky v8-or-older initialization as the default:

```bash
# ❌ legacy direction for Husky 9
husky install
```

`~/.huskyrc` is deprecated.

### Hook policy

Hooks should be fast.

Recommended:

```text
pre-commit
  -> lint-staged

commit-msg
  -> commitlint
```

Do not run a 20-minute full E2E suite on every local commit.

Full gates belong in CI.

---

# 27. lint-staged 17.x

Purpose:

```text
run fast check/fix only against staged files
```

Example direction with Biome:

```js
export default {
  '*.{js,jsx,ts,tsx,json,css}': [
    'biome check --write',
  ],
};
```

Exact command options must match your repository's Biome setup.

lint-staged automatically passes matched filenames to commands.

### Do NOT add `git add`

Old pattern:

```json
{
  "*.ts": [
    "eslint --fix",
    "git add"
  ]
}
```

is obsolete. lint-staged has handled re-adding modifications since v10.

### Monorepo

The closest lint-staged config to a file wins. Configs are not implicitly merged.

### Version gate

The declared `17.3.0` was not found in the public snapshot; `17.0.8` was observed.

---

# 28. commitlint 21 + Conventional Commits

`commitlint.config.js` ESM:

```js
export default {
  extends: [
    '@commitlint/config-conventional',
  ],
};
```

Husky hook:

```sh
# .husky/commit-msg
pnpm exec commitlint --edit "$1"
```

The `commit-msg` hook is the correct hook for validating commit messages.

Do not use Husky v8 installation commands in a Husky 9 project.

### Commit examples

```text
feat(users): add user creation form
fix(auth): prevent expired session reuse
test(products): cover empty catalog
chore(deps): update zod
```

Do not invent a custom commit convention if the repository already extends Conventional Commits.

---

# 29. `tsx`

Purpose:

```text
execute TypeScript tooling/scripts directly under Node
```

Example:

```bash
pnpm tsx tools/generate-contracts.ts
```

Use `tsx` for scripts/tooling, not browser runtime.

Do not assume `tsx` performs a full TypeScript semantic typecheck.

### Version gate

The supplied `4.23.11` was not found in the public snapshot; `4.23.1` was observed.

---

# 30. `@types/node`

This package gives TypeScript Node API declarations.

It affects frontend tooling files such as:

```text
vite.config.ts
vitest.config.ts
CDK scripts
tooling scripts
```

It should not cause browser application code to start using Node-only APIs.

### Runtime alignment rule

If the tool runtime is Node 24 LTS, using Node 26 typings can allow code to compile against APIs unavailable in the actual runtime.

Therefore:

```text
Node runtime major
    ↕
@types/node major
```

should be deliberate.

For a Vite browser source tsconfig, avoid injecting global Node types unless needed.

### Version gate

The supplied `26.2.0` was ahead of the verified snapshot (`26.1.x`).

---

# 31. Web Vitals 6.x

## Core metrics

Use:

```ts
import {
  onCLS,
  onINP,
  onLCP,
} from 'web-vitals';

onCLS(reportMetric);
onINP(reportMetric);
onLCP(reportMetric);
```

Current Core Web Vitals:

```text
CLS
INP
LCP
```

Do not generate old FID-centric guidance as the modern core set.

### Attribution build

For diagnostics:

```ts
import {
  onCLS,
  onINP,
  onLCP,
} from 'web-vitals/attribution';
```

Use attribution only when its extra diagnostic payload is useful.

### Register once

Do not call metric registration repeatedly on every component render.

### RUM

Send telemetry to a real RUM/observability endpoint, e.g. through `sendBeacon` or approved telemetry transport.

Do not only:

```ts
console.log(metric);
```

and call that production observability.

### Version gate

The supplied `6.1.0` was not present in the public snapshot; `6.0.0` was observed.

---

# 31.1 `lightweight-charts` 5.2.0

Use it only for financial/time-series visualizations where price scales, crosshair behavior and
incremental market updates justify a specialized canvas renderer. Do not use it for ordinary KPI,
bar or pie charts.

## Installation and ownership

Install the exact version in the owning frontend repository, not in an unrelated workspace root:

```bash
pnpm add -E lightweight-charts@5.2.0
```

Keep chart lifecycle in a reusable UI hook and market-data fetching in a service/TanStack Query
hook. The chart must not fetch HTTP data, own auth or reproduce backend calculations.

## Mandatory v5 API

Version 5 uses the unified `addSeries` API and named series definitions:

```ts
import {
  CandlestickSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';

const chart = createChart(container, { autoSize: true });
const candles = chart.addSeries(CandlestickSeries, {
  upColor: '#16a34a',
  downColor: '#dc2626',
  borderVisible: false,
});

candles.setData(data);
```

Do not generate the v4 API:

```ts
// blocked in v5
chart.addCandlestickSeries();
chart.addLineSeries();
series.setMarkers(markers);
```

Use `createSeriesMarkers(series, markers)` for markers in v5. Use `series.update(point)` for one
new/replaced realtime point; do not call `setData()` for the entire history on every tick.

## Reusable Preact hook

```ts
import { useEffect, useRef } from 'preact/hooks';
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts';

type Candle = CandlestickData<Time>;

export function useCandlestickChart(data: readonly Candle[]) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#475569',
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#16a34a',
      downColor: '#dc2626',
      borderVisible: false,
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    seriesRef.current?.setData([...data]);
  }, [data]);

  return { chartRef, containerRef, seriesRef };
}
```

Give the host an explicit/minimum height; `autoSize` uses `ResizeObserver` but cannot invent layout.
Apply theme changes with `chart.applyOptions()` instead of destroying the chart. A factory or
callback passed to a lifecycle hook must be stable (`useCallback`) so renders do not recreate the
canvas.

## Subscriptions, realtime and v5.2 tips

- Pair every `subscribeCrosshairMove(handler)` with `unsubscribeCrosshairMove(handler)` using the
  same function identity.
- Keep the latest streaming point separate from the historical query; validate ordering and time
  units before `series.update(point)`.
- Treat `Time` deliberately: business-day strings/objects and UTC timestamps are not interchangeable.
- Use `hoveredSeriesOnTop`, `hoveredItem`/`hoveredTarget`, `defaultVisiblePriceScaleId` and
  `tickMarkDensity` only when the 5.2 interaction/design requires them.
- Preserve the official license/attribution requirements. Prefer the supported attribution option;
  do not crop or cover required attribution.
- Lazy-load chart routes/components when they are not above the fold and verify the real bundle
  delta after tree-shaking.

## Testing

- Unit-test data normalization and lifecycle with the chart module mocked.
- Component-test empty/error/loading/fallback and an accessible summary/table alternative.
- Use Playwright for resize, crosshair-related behavior and integration with real canvas.
- Do not assert raw canvas pixels in happy-dom. Visual baselines must tolerate renderer/platform
  differences and must be manually reviewed.

---

# 31.2 OGL 1.0.11

OGL is a minimal WebGL library, not a design system or charting replacement. Adopt it only for an
approved effect that cannot be delivered adequately with CSS/SVG, after bundle, GPU, accessibility
and fallback review.

## Installation and page contract

```bash
pnpm add -E ogl@1.0.11
```

Rules:

- maximum one OGL canvas per page;
- lazy-load the effect component and wrap it in `<Suspense>`;
- render an equivalent static/CSS fallback for `prefers-reduced-motion`, WebGL failure and tests;
- cap DPR, normally `Math.min(window.devicePixelRatio, 2)`;
- size from the host with `ResizeObserver`, not repeated layout reads inside the RAF loop;
- cancel RAF, disconnect observers/listeners, remove the canvas and release the dedicated context
  on unmount;
- pause or skip work when the page/effect is not visible;
- keep shaders static and reviewed; never interpolate untrusted text into shader source.

OGL 1.0.11 exposes ES modules and bundled TypeScript declarations. Import only required core, math
or extras exports so Vite can tree-shake them.

## Reusable lifecycle hook

```ts
import { useEffect, useRef } from 'preact/hooks';

type OglScene = {
  render: (time: number) => void;
  resize: (width: number, height: number) => void;
  destroy?: () => void;
};

type OglSceneFactory = (canvas: HTMLCanvasElement) => Promise<OglScene> | OglScene;
type OglErrorHandler = (error: unknown) => void;

export function useOglCanvas(createScene: OglSceneFactory, onError: OglErrorHandler) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!host || reducedMotion) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    host.append(canvas);

    let animationFrame = 0;
    let cancelled = false;
    let scene: OglScene | undefined;

    const releaseContext = () => {
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    };

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry || !scene) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) scene.resize(width, height);
    });
    resizeObserver.observe(host);

    const frame = (time: number) => {
      if (cancelled) return;
      if (document.visibilityState === 'visible') scene?.render(time);
      animationFrame = requestAnimationFrame(frame);
    };

    void Promise.resolve()
      .then(() => createScene(canvas))
      .then((createdScene) => {
        if (cancelled) {
          createdScene.destroy?.();
          releaseContext();
          return;
        }
        scene = createdScene;
        const { width, height } = host.getBoundingClientRect();
        if (width > 0 && height > 0) scene.resize(width, height);
        animationFrame = requestAnimationFrame(frame);
      })
      .catch((error: unknown) => {
        if (!cancelled) onError(error);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      scene?.destroy?.();
      if (scene) releaseContext();
      canvas.remove();
    };
  }, [createScene, onError]);

  return hostRef;
}
```

The factory and error handler must be stable (`useCallback`). The error handler switches the page to
its static fallback and reports a redacted diagnostic. The factory owns OGL-specific construction and
must release partial allocations itself if construction throws:

```ts
import { useCallback } from 'preact/hooks';
import { fragment, vertex } from './hero-ogl-shaders';

const createScene = useCallback(async (canvas: HTMLCanvasElement) => {
  const { Geometry, Mesh, Program, Renderer } = await import('ogl');
  const renderer = new Renderer({
    alpha: true,
    canvas,
    dpr: Math.min(window.devicePixelRatio, 2),
  });
  const gl = renderer.gl;
  const geometry = new Geometry(gl, {
    position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
  });
  const program = new Program(gl, { fragment, vertex, uniforms: { uTime: { value: 0 } } });
  const mesh = new Mesh(gl, { geometry, program });

  return {
    resize: (width: number, height: number) => renderer.setSize(width, height),
    render: (time: number) => {
      program.uniforms.uTime.value = time * 0.001;
      renderer.render({ scene: mesh });
    },
  };
}, []);
```

Do not invent `renderer.dispose()`; OGL does not provide the Three.js disposal contract. Clean up
owned native resources in `destroy()` when the scene allocates textures, buffers or external media,
then release the dedicated context as the final fallback.

## Lazy boundary and testing

```tsx
import { lazy, Suspense } from 'preact/compat';

const HeroOglEffect = lazy(() => import('./hero-ogl-effect'));

<Suspense fallback={<HeroStaticBackground />}>
  <HeroOglEffect />
</Suspense>;
```

- Unit-test reduced-motion, async-unmount, RAF cancellation and observer cleanup with controlled
  browser mocks.
- Playwright-test the fallback, maximum canvas count, resize and absence of WebGL/console errors.
- Do not require GPU rendering in every unit runner. Keep a non-WebGL functional UI path.
- Measure frame time, memory/GPU pressure and bundle delta on representative mobile hardware.
- Stop adoption if the effect harms LCP/INP, battery, readability or critical-task completion.

---

# 32. Delivery por perfil — current-web y Kubernetes v2

CDK guidance in this section is retained only for a repository whose executable profile confirms CDK. It does not apply to `k8s-v2`.

For `k8s-v2`, the frontend and backend share the platform delivery path: OCI/ECR, Terraform/OpenTofu foundations, Helm, Argo Rollouts, Argo CD and EKS. The AI MUST NOT create parallel Lambda/CDK or S3/CloudFront hosting.

Target frontend delivery can include, when actually required:

```text
S3 private origin
CloudFront
WAF
Route 53
certificates
security headers
logging/monitoring
deployment roles
```

## 32.1 Construct levels

Prefer L2 constructs where they provide the required control.

Use:

```text
L1 -> when CloudFormation-level capability is required
L2 -> normal resource abstraction
L3 -> opinionated architecture pattern when it matches requirements
```

## 32.2 Model with constructs; deploy with stacks

AWS recommends:

```text
Construct -> reusable logical unit
Stack     -> deployment unit
```

Do not create one Stack class for every tiny resource just to look modular.

## 32.3 Configuration

Pass configuration through typed props/config at app composition.

Do not hide synthesis behavior behind arbitrary environment lookups throughout constructs.

Secrets never belong in source-control config.

## 32.4 Determinism

`cdk synth` should be deterministic.

Avoid network/account lookups during normal synthesis unless explicitly managed.

Commit `cdk.context.json` when CDK context is intentionally used and the repository policy requires deterministic lookup results.

## 32.5 IAM

Use L2 `grant*` methods where appropriate for least-privilege resource relationships instead of manually generating broad policies.

Avoid:

```text
Action: "*"
Resource: "*"
```

unless an unavoidable AWS semantic is documented and security tooling acknowledges it explicitly.

## 32.6 Stateful resources

Explicitly decide:

- removal policy;
- log retention;
- encryption;
- public access;
- deletion protection where applicable.

Never depend blindly on defaults for production resources.

## 32.7 Version compatibility gate

The supplied versions:

```text
aws-cdk       2.1135.1
aws-cdk-lib   2.263.0
```

were ahead of the verified registry snapshot used for this document.

Run:

```bash
pnpm exec cdk --version
pnpm exec cdk synth
```

and validate CLI/library compatibility before coding against APIs not present in the resolved versions.

---

# 33. `constructs`

Use `Construct` as the base composition primitive:

```ts
import { Construct } from 'constructs';

export class WebDelivery extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: WebDeliveryProps,
  ) {
    super(scope, id);

    // compose resources
  }
}
```

Do not recreate CDK v1 package organization.

AWS CDK v2 uses:

```text
aws-cdk-lib
+
constructs
```

rather than a forest of `@aws-cdk/aws-*` v1 dependencies.

---

# 34. cdk-nag v3

## Current v3 direction

cdk-nag v3 integrates with CDK's native validation mechanism.

```ts
import {
  App,
  Validations,
} from 'aws-cdk-lib';

import {
  AwsSolutionsChecks,
} from 'cdk-nag';

const app = new App();

Validations
  .of(app)
  .addPlugins(
    new AwsSolutionsChecks(app),
  );
```

## Acknowledgements

v3 direction:

```ts
Validations
  .of(resource)
  .acknowledge({
    id: 'AwsSolutions-...',
    reason: 'Documented justification',
  });
```

## Do NOT generate cdk-nag v2 suppression API

```ts
// ❌ removed in v3
NagSuppressions.addResourceSuppressions(...)
NagSuppressions.addStackSuppressions(...)
```

`NagSuppressions` was removed in v3.

### Security policy

An acknowledgement must contain a real justification.

Never:

```text
reason: "false positive"
```

without evidence.

Do not bulk suppress security findings just to make CI green.

### Version gate

The supplied `3.0.2` was ahead of the verified public snapshot (`3.0.1`).

---

# 35. Private Vigilio tooling packages

Packages:

```text
@vigilioyonatan/devsecops-evidence
@vigilioyonatan/devsecops-governance
@vigilioyonatan/vigilio-skills
@vigilioyonatan/web-mfe-tooling
```

No public API is assumed by this skill.

Before generating an import:

```text
1. inspect package exports
2. inspect .d.ts
3. inspect README/repo docs
4. search existing valid usage in the repository
5. confirm package version in lockfile
```

If not confirmed:

```text
PRIVATE_PACKAGE_API_UNKNOWN
```

and do not invent usage based on package name.

### Architectural intent

If repository evidence confirms these responsibilities:

```text
devsecops-governance -> policy/gates
devsecops-evidence   -> evidence output
vigilio-skills       -> compatibility/distribution layer
web-mfe-tooling      -> frontend-owned reusable tooling
```

then preserve them.

With the Agent Plugins target architecture, `@vigilioyonatan/vigilio-skills` should not silently become a second editable source of truth for skills. It can remain a compatibility/distribution adapter until migration is complete.

---

# 36. HTTP boundary — canonical frontend pattern

Preferred architecture:

```text
Page/Component
      ↓
feature hook
      ↓
TanStack Query
      ↓
service/API adapter
      ↓
Amplify/fetch transport
      ↓
HTTP
      ↓
unknown JSON
      ↓
bus-contracts / Zod
      ↓
validated DTO
      ↓
TanStack Query cache
      ↓
UI
```

Example:

```ts
async function listUsers(
  filters: UsersFilters,
  signal?: AbortSignal,
) {
  const raw: unknown = await transport.get(
    '/users',
    {
      query: filters,
      signal,
    },
  );

  return ListUsersResponseValidator.parse(raw);
}
```

TanStack Query:

```ts
export const listUsersOptions = (
  filters: UsersFilters,
) =>
  queryOptions({
    queryKey: [
      'users',
      'index',
      filters,
    ] as const,
    queryFn: ({ signal }) =>
      listUsers(filters, signal),
    staleTime: 30_000,
  });
```

Component:

```tsx
const query = useQuery(
  listUsersOptions(filters),
);
```

### Never

```text
Component -> Amplify directly everywhere
Component -> fetch -> `as UserSchema[]`
Component -> copies response to Zustand
Component -> revalidates same schema manually
```

---

# 37. Form + mutation canonical pattern

```text
Zod schema
    ↓
React Hook Form
    ↓
submit
    ↓
TanStack mutation
    ↓
service
    ↓
HTTP
    ↓
response contract parse
    ↓
targeted cache invalidation
    ↓
toast
```

Example:

```tsx
// En proyecto real importar el schema publicado y verificar su export exacto.
const schema = registerUserRequestDto;

const form = useForm<
  z.input<typeof schema>,
  unknown,
  z.output<typeof schema>
>({
  resolver: zodResolver(schema),
});

const mutation = useMutation({
  mutationFn: registerUser,
  onSuccess: async () => {
    await query_client.invalidateQueries({
      queryKey: user_keys.all,
    });

    toast.success('Usuario creado');
  },
});
```

Do not manually duplicate:

```text
form validation
request typing
response typing
server cache
```

---

# 38. Data table canonical pattern

For a server-driven table:

```text
URL search params
       ↓
filters/pagination/sort
       ↓
TanStack Query query key
       ↓
API
       ↓
validated result
       ↓
TanStack Table
       ↓
headless markup
```

Table is presentation/state logic; Query owns remote data.

Do not make TanStack Table itself fetch the API unless an approved adapter explicitly owns that responsibility.

Do not store table's remote rows in Zustand.

---

# 39. Accessibility baseline

Every generated page/component MUST consider:

```text
semantic HTML
keyboard access
focus visibility
accessible name
labels
error association
loading state
empty state
error state
success state
reduced motion when motion exists
```

Testing layers:

```text
Testing Library -> semantic component behavior
axe             -> automated rule detection
Playwright      -> keyboard/browser/end-to-end
```

Automated axe passing does NOT mean accessibility is complete.

---

# 40. Performance baseline

Use measurements, not cargo cult.

Prefer:

```text
TanStack Query cache/freshness
Preact fine-grained rendering
Signals when fine-grained reactivity helps
code splitting at meaningful route/feature boundaries
stable table data/columns
Web Vitals RUM
Vite/Rolldown build analysis when needed
```

Do not:

```text
❌ useMemo/useCallback everywhere
❌ move every state into global stores
❌ lazy-load tiny critical components solely by habit
❌ claim bundle/performance improvement without measurement
```

---

# 41. Security baseline

Client rules:

```text
never embed secrets
never trust response JSON
never trust authorization from UI state
never rely on hidden buttons for authorization
never log tokens or sensitive payloads
use CSP/security headers from delivery layer
validate upload metadata and backend policy
```

Frontend authorization is UX.

Backend authorization remains authoritative.

---

# 42. Error handling

Use typed/domain-aware boundaries.

Transport errors, validation errors and business errors are not the same thing.

Recommended categories:

```text
NetworkError
HttpError
ContractViolationError
AuthenticationError
AuthorizationError
BusinessConflictError
UnexpectedError
```

Do not:

```ts
catch (error) {
  toast.error('Error');
}
```

everywhere without classification, logging policy and recovery behavior.

---

# 43. Testing matrix

| Layer | Tool | What it proves |
|---|---|---|
| Pure functions | Vitest | deterministic logic |
| Components | Vitest + happy-dom + Preact Testing Library | component behavior |
| User interaction | Testing Library + user-event | realistic DOM interactions |
| HTTP integration | MSW v2 | network contract integration |
| Accessibility smoke | axe | automated accessibility violations |
| Browser/E2E | Playwright | actual browser workflow |
| Infrastructure | CDK assertions + cdk-nag | synthesized infrastructure/security checks |
| Performance | web-vitals/RUM | real-user performance signals |

No one layer replaces the others.

---

# 44. Quality gate order

Recommended fast-to-slow flow:

```text
1. dependency/version validation
2. Biome
3. TypeScript 7 typecheck
4. affected unit tests
5. affected component/integration tests
6. contract tests
7. build
8. CDK synth/nag if infra changed
9. Playwright if user flow changed
10. accessibility/performance checks if applicable
11. evidence
```

Do not execute every expensive gate for an unrelated one-line documentation edit; use change-aware routing.

---

# 45. AI anti-existente checklist

Before submitting generated code, the agent MUST verify:

```text
[ ] real package version resolved from lockfile
[ ] no invented package API
[ ] no legacy package import
[ ] no Zod v3-only pattern
[ ] no React Query positional v3/v4 API
[ ] no Tailwind v3 bootstrap by default
[ ] no MSW v1 rest/ctx API
[ ] no Jest APIs in Vitest
[ ] no React Testing Library adapter for app-owned Preact tests
[ ] no React Router APIs when Wouter is canonical
[ ] no old Husky install flow
[ ] no cdk-nag NagSuppressions v2 API
[ ] no Vite secret exposed through VITE_*
[ ] no TypeScript `any`/cast used to bypass runtime validation
[ ] no API server state duplicated into Zustand/Signals
[ ] no form state duplicated outside RHF
[ ] no frontend-only auth check treated as security enforcement
[ ] no unverified performance/production claim
```

---

# 46. Version-aware code generation algorithm

```text
INPUT: task + resolved prompt pack

1. Read package.json.
2. Read pnpm-lock.yaml.
3. Resolve exact dependency versions.
4. Compare major/minor against this skill.
5. If known:
      select current API rules.
6. If mismatch:
      inspect package exports/.d.ts + official docs.
7. If unresolved:
      STACK_VERSION_MISMATCH / STACK_REVIEW_REQUIRED.
      do not invent implementation.
8. Load only technologies touched by the task.
9. Generate minimal vertical slice.
10. Run type/lint/tests/build gates.
11. Record evidence.
```

This skill should be selectively loaded. Do not inject the entire document into every prompt if only one small technology section is relevant.

---

# 47. Recommended prompt-builder section routing

Examples:

```text
*.tsx / Preact component
→ Preact + TS + Tailwind + accessibility

query/service
→ TanStack Query + contracts + Zod + transport

form
→ React Hook Form + resolver + Zod + mutation

table
→ TanStack Table + Query + URL state

client shared state
→ Signals or Zustand after responsibility decision

tests
→ Vitest + Preact Testing Library + user-event + MSW

e2e
→ Playwright + axe

financial/time-series chart
→ lightweight-charts 5.2.0 + Query/service + accessible summary + real-browser canvas test

OGL visual effect
→ OGL 1.0.11 + lazy/Suspense + reduced-motion fallback + lifecycle cleanup + GPU/bundle budget

current-web infrastructure
→ preserve the delivery implementation verified in the current-web repository

k8s-v2 docker/** + deploy/** + infra/**
→ OCI/ECR + Helm/Argo/GitOps + Terraform/OpenTofu/EKS; never parallel Lambda/CDK hosting

vite config/build
→ Vite + Tailwind plugin + TS tooling

git hooks
→ Husky + lint-staged + commitlint
```

This prevents token waste and accidental activation of unrelated libraries.

---

# 48. Packages intentionally NOT treated as interchangeable

```text
Signals ≠ Zustand
Zustand ≠ TanStack Query
TanStack Query ≠ HTTP client
Zod ≠ TypeScript
Biome ≠ TypeScript compiler
Vitest ≠ Playwright
happy-dom ≠ browser
MSW ≠ backend
cdk-nag ≠ organizational security policy
lightweight-charts ≠ generic dashboard chart library
OGL ≠ lightweight-charts
OGL ≠ mandatory visual polish
frontend permissions ≠ backend authorization
```

---

# 49. Current dependency correction candidates

These are **review candidates**, not automatic edits:

```text
@aws-amplify/core 6.18.0
    -> package itself is internal; verify whether `aws-amplify` public facade should be installed.

@aws-amplify/api-rest
    -> internal package; prefer public `aws-amplify/api` API if architecture confirms.

@tanstack/react-table 9.1.1
    -> invalid against public v9 beta model; decide v8 compat vs native v9 Preact beta.

vite 8.2.1
    -> verify; public snapshot showed 8.1.x stable.

@preact/signals 2.11.0
preact 10.29.8
@hookform/resolvers 5.7.1
@biomejs/biome 2.5.7
@testing-library/user-event 14.6.3
@types/node 26.2.0
happy-dom 20.11.2
lint-staged 17.3.0
tsx 4.23.11
web-vitals 6.1.0
aws-cdk 2.1135.1
aws-cdk-lib 2.263.0
cdk-nag 3.0.2
    -> all require lockfile/registry confirmation before API assumptions.
```

Do not "fix" these versions from this document alone. The real repository and configured registry win.

---

# 50. Official documentation / primary references

Use these sources before community snippets.

## TypeScript

- https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- https://www.typescriptlang.org/docs/

## Preact

- https://preactjs.com/guide/v10/typescript/
- https://preactjs.com/guide/v10/hooks/
- https://preactjs.com/guide/v10/signals/
- https://preactjs.com/guide/v10/api-reference/

## TanStack Query

- https://tanstack.com/query/v5
- https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults
- https://tanstack.com/query/v5/docs/framework/react/reference/queryOptions

## TanStack Table

- https://tanstack.com/table/beta/docs/installation
- https://tanstack.com/table/beta/docs/framework/preact/quick-start
- https://tanstack.com/table/beta/docs/framework/preact/guide/migrating

## React Hook Form

- https://react-hook-form.com/
- https://github.com/react-hook-form/resolvers

## Zod

- https://zod.dev/
- https://zod.dev/v4/changelog

## Wouter

- https://github.com/molefrog/wouter

## Zustand

- https://zustand.docs.pmnd.rs/
- https://github.com/pmndrs/zustand

## Sonner

- https://sonner.emilkowal.ski/
- https://github.com/emilkowalski/sonner

## Tailwind CSS

- https://tailwindcss.com/docs/installation/using-vite
- https://tailwindcss.com/blog/tailwindcss-v4
- https://tailwindcss.com/docs/theme
- https://tailwindcss.com/docs/detecting-classes-in-source-files

## Vite

- https://vite.dev/blog/announcing-vite8
- https://vite.dev/guide/migration.html
- https://vite.dev/guide/env-and-mode

## AWS Amplify

- https://docs.amplify.aws/
- https://docs.amplify.aws/gen1/javascript/build-a-backend/troubleshooting/migrate-from-javascript-v5-to-v6/

## Vitest

- https://vitest.dev/
- https://vitest.dev/guide/migration
- https://vitest.dev/guide/coverage

## Testing Library

- https://testing-library.com/docs/queries/about/
- https://testing-library.com/docs/user-event/intro/
- https://testing-library.com/docs/user-event/setup/

## Playwright

- https://playwright.dev/docs/best-practices
- https://playwright.dev/docs/locators
- https://playwright.dev/docs/release-notes

## axe

- https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright
- https://www.deque.com/axe/

## MSW

- https://mswjs.io/docs/
- https://github.com/mswjs/msw

## Biome

- https://biomejs.dev/guides/getting-started/
- https://biomejs.dev/linter/

## Husky

- https://typicode.github.io/husky/get-started.html

## lint-staged

- https://github.com/lint-staged/lint-staged

## commitlint

- https://commitlint.js.org/
- https://commitlint.js.org/guides/local-setup

## Web Vitals

- https://github.com/GoogleChrome/web-vitals
- https://web.dev/articles/vitals

## Lightweight Charts 5.2.0

- https://tradingview.github.io/lightweight-charts/docs/api
- https://tradingview.github.io/lightweight-charts/docs/migrations/from-v4-to-v5
- https://github.com/tradingview/lightweight-charts/releases/tag/v5.2.0

## OGL 1.0.11

- https://github.com/oframe/ogl
- https://www.npmjs.com/package/ogl/v/1.0.11

## AWS CDK

- https://docs.aws.amazon.com/cdk/v2/guide/best-practices.html
- https://docs.aws.amazon.com/cdk/v2/guide/constructs.html
- https://docs.aws.amazon.com/cdk/v2/guide/stacks.html

## cdk-nag

- https://github.com/cdklabs/cdk-nag

---

# 51. Final rule

```text
The AI does NOT code against "what it remembers".

The AI codes against:

resolved dependency version
+ public API for that version
+ executable repository evidence
+ project architecture
+ contract schemas
+ OpenSpec change
+ applicable skill section.
```

If those disagree:

```text
STOP
→ report mismatch
→ do not fabricate compatibility
→ resolve through the project's normal change workflow.
```

This is more important than completing code quickly.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).


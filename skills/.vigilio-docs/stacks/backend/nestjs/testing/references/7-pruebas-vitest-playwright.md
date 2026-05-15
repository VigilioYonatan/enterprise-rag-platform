# Estrategia de Pruebas - `bus-impl` 2026

El baseline de testing cambia de `Jest + Cucumber` a `Vitest + Playwright`, siguiendo las practicas de `aws-arquitecture/docs/19.Testing-Strategy-2026.md` y `18.DevSecOps-2026.md`.

Objetivo:

- feedback rapido en PR.
- cobertura minima real de 85%.
- integration tests con PostgreSQL real.
- e2e sobre HTTP real con Playwright.
- AWS local con Floci cuando el flujo toca S3, SQS, SNS, EventBridge o Lambda.
- compatibilidad final contra Aurora/RDS en preview o staging.

---

## 1. Reglas obligatorias

| Regla | Decision |
|---|---|
| Framework base | Vitest |
| E2E y smoke HTTP | Playwright |
| Coverage minimo global | 85% lines/functions/statements |
| Coverage de dominio | 90% |
| Base de datos integration | PostgreSQL real, no mocks |
| Base de datos compatibilidad | Aurora/RDS en preview o staging |
| AWS local | Floci para servicios AWS, no para esconder bugs de dominio |
| DTOs en tests | importar DTOs reales de `application/dtos/`, incluidos responses |
| Fixtures | factories deterministicas |
| Limpieza DB | truncate por suite con `RESTART IDENTITY` |

Reglas de estilo:

- No usar `any`.
- No importar `describe`, `it`, `expect` desde `vitest`; Vitest queda configurado con `globals: true`.
- Usar nombres claros: `body`, `query`, `response`.
- Constantes compartidas: `TENANT_ID`, `USER_ID`, `POLIZA_ID`, no numeros magicos.
- E2E no reemplaza unit/integration coverage; solo valida flujos criticos.
- Organizar tests como `tests/<tipo>/<modulo>/*`: tipo primero para CI/CD, modulo despues para cohesion.

---

## 2. Piramide recomendada

```text
E2E / smoke        10%  -> happy paths criticos y contratos publicados
Integration        30%  -> DB real, Drizzle, eventos, AWS local
Unit               60%  -> domain, application, policies, helpers
```

Estructura recomendada:

```text
tests/
|-- unit/
|   |-- ai-chat/
|   |-- auth/
|   |-- config/
|   |-- health/
|   |-- product/
|   |-- upload/
|   `-- user/
|-- integration/
|   |-- repositories/
|   `-- aws/
|-- e2e/
|   |-- auth/
|   |-- openapi/
|   `-- security/
|-- bdd/
|   `-- health/
```

No dejar archivos sueltos en `tests/unit` si pertenecen a un modulo. La unica excepcion razonable son helpers/factories transversales.

### Unit

- services de application y reglas de dominio solo si existen.
- reglas de dominio.
- application services con dobles.
- Zod DTOs con casos validos e invalidos.

### Integration

- repositorios Drizzle.
- queries reales.
- transacciones.
- migraciones.
- consumidores async.
- AWS SDK contra Floci para S3/SQS/SNS/EventBridge/Lambda.

### E2E / smoke

- `/health`.
- `/ready`.
- `/docs-json`.
- endpoint critico por bounded context.
- flujo completo: request valida, DB persiste, response parsea con DTO Zod.

---

## 3. Configuracion Vitest

Los tests deben usar los mismos absolute paths que el codigo productivo.

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@tests/*": ["tests/*"],
      "@shared/*": ["src/shared/*"]
    }
  }
}
```

Reglas:

- `@/` apunta a `src`.
- `@tests/` apunta a `tests`.
- evitar rutas tipo `../../../../` porque son fragiles cuando se mueve una carpeta.
- imports locales simples como `./schema` o `./product.repository` siguen estando bien.

```typescript
// vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts', 'tests/e2e/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
    testTimeout: 30000,
    setupFiles: ['./tests/helpers/setup-unit.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
```

```typescript
// vitest.integration.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts', 'tests/integration/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 45000,
    hookTimeout: 30000,
    setupFiles: ['./tests/helpers/setup-integration.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov'],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
```

---

## 4. Coverage gates por capa

| Capa | Lines | Functions | Branches | Statements |
|---|---:|---:|---:|---:|
| `domain/` | 90 | 90 | 85 | 90 |
| `application/` | 85 | 85 | 80 | 85 |
| `infrastructure/` | 85 | 85 | 80 | 85 |
| `shared/` | 90 | 90 | 85 | 90 |

Regla:

- Si una capa no alcanza threshold, no se hace merge aunque el promedio global pase.

---

## 5. Unit test de application service

```typescript
// Ejemplo referencial: tests/unit/product/product.application-service.test.ts
import { describe, expect, it, vi } from 'vitest';
import { ProductApplicationService } from '@/product/application/service/product.application-service';
import { createRegisterProductRequest } from '@tests/factories/product.factory';

describe('ProductApplicationService', () => {
  it('crea un product usando el repository', async () => {
    const repository = {
      index: vi.fn(),
      store: vi.fn().mockResolvedValue({
        id: 1,
        nro_poliza: '123456',
        product_type: 'inclusion',
      }),
    };
    const service = new ProductApplicationService(repository);

    const body = createRegisterProductRequest();
    const response = await service.store(body);

    expect(repository.store).toHaveBeenCalledWith(body);
    expect(response.success).toBe(true);
    expect(response.product.id).toBe(1);
  });
});
```

---

## 6. Unit test de DTO Zod

```typescript
// Ejemplo referencial: tests/unit/product/register-product.request.dto.test.ts
import { describe, expect, it } from 'vitest';
import { registerProductRequestDto } from '@/product/application/dtos/register-product.request.dto';
import { createRegisterProductRequest } from '@tests/factories/product.factory';

describe('registerProductRequestDto', () => {
  it('acepta un request valido', () => {
    const body = createRegisterProductRequest();

    const result = registerProductRequestDto.safeParse(body);

    expect(result.success).toBe(true);
  });

  it('rechaza una poliza vacia', () => {
    const body = createRegisterProductRequest({ nro_poliza: '' });

    const result = registerProductRequestDto.safeParse(body);

    expect(result.success).toBe(false);
  });
});
```

---

## 7. Factories deterministicas

```typescript
// Ejemplo referencial: tests/factories/product.factory.ts
import type { RegisterProductRequestDto } from '@/product/application/dtos/register-product.request.dto';

export function createRegisterProductRequest(
  overrides: Partial<RegisterProductRequestDto> = {},
): RegisterProductRequestDto {
  return {
    nro_poliza: '123456',
    product_type: 'inclusion',
    fecha_inicio: '2026-06-08',
    broker_id: 10,
    ...overrides,
  };
}
```

---

## 8. Integration test con PostgreSQL real

Para integration tests locales y CI:

- usar `postgres:17-alpine` con GitHub Actions service, Podman/Docker local o Testcontainers.
- ejecutar migraciones Drizzle antes de la suite.
- truncar tablas antes de cada suite.
- no mockear constraints, indices ni transacciones.

```typescript
// tests/helpers/setup-integration.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@/product/infrastructure/persistence/drizzle/schema';

let pool: Pool | undefined;

export async function setupTestDb() {
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
  });

  return drizzle(pool, { schema });
}

export async function truncateTables(tables: string[]) {
  if (!pool) {
    return;
  }

  for (const table of tables) {
    await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
  }
}

export async function teardownTestDb() {
  await pool?.end();
  pool = undefined;
}
```

```typescript
// Ejemplo referencial: tests/integration/repositories/product.repository.integration.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { setupTestDb, truncateTables } from '@tests/helpers/setup-integration';
import { createRegisterProductRequest } from '@tests/factories/product.factory';
import { ProductRepository } from '@/product/infrastructure/persistence/drizzle/product.repository';

describe('ProductRepository', () => {
  beforeEach(async () => {
    await truncateTables(['product']);
  });

  it('persiste un product en PostgreSQL real', async () => {
    const db = await setupTestDb();
    const repository = new ProductRepository(db);

    const row = await repository.store(createRegisterProductRequest());

    expect(row.id).toBeDefined();
    expect(row.nro_poliza).toBe('123456');
  });
});
```

---

## 9. Aurora/RDS: mejor practica para testear

No conviene usar Aurora/RDS para todos los tests de PR: es mas lento, cuesta dinero y mete flakiness por red. La practica sana es por niveles:

| Nivel | DB | Uso |
|---|---|---|
| Unit | Sin DB | Logica pura |
| Integration local/CI | `postgres:17-alpine`, autostart Podman/Docker o Testcontainers | Repositorios, constraints, transacciones |
| E2E preview | Aurora/RDS temporal o schema aislado | Compatibilidad real AWS |
| Staging | Aurora/RDS igual a production | Smoke, migrations, performance basico |
| Production | Aurora/RDS production | Nunca para tests destructivos |

Reglas para Aurora/RDS:

- usar una base temporal por preview o schema aislado por PR.
- correr migrations forward antes del e2e.
- nunca hacer `TRUNCATE` en una DB compartida sin namespace/schema de test.
- usar RDS Proxy o pooling controlado para Lambda.
- probar rollback de aplicacion sin depender de revertir datos manualmente.
- validar timezone, decimal/numeric, collation, indices y constraints en staging.

---

## 10. Floci para tests AWS locales

Floci es buena opcion para `bus-impl` cuando el flujo toca AWS alrededor del backend:

- S3.
- SQS/SNS.
- EventBridge.
- Lambda local.
- Secrets Manager/SSM si el caso lo necesita.
- Step Functions si el flujo esta soportado por el stack local.

No lo usaria como sustituto principal de PostgreSQL real para repositorios Drizzle. Para DB, mejor `postgres:17-alpine`, autostart local con Podman/Docker o Testcontainers en integration, y Aurora/RDS en preview/staging.

```yaml
# compose.floci.yml
services:
  floci:
    image: floci/floci:1.5.12
    ports:
      - '4566:4566'
    environment:
      FLOCI_STORAGE_MODE: memory
```

En el proyecto real se usa:

```bash
pnpm test:integration:aws # levanta Floci con Podman/Docker si no existe endpoint local
pnpm test:integration:aws:ci # corre la misma suite y genera JUnit para GitHub Actions
```

Variables:

```bash
AWS_ENDPOINT_URL=http://127.0.0.1:4566 # endpoint local compatible con AWS SDK
AWS_ACCESS_KEY_ID=test # credencial dummy aceptada por Floci
AWS_SECRET_ACCESS_KEY=test # credencial dummy aceptada por Floci
AWS_REGION=us-east-1 # region local de pruebas
FLOCI_IMAGE=floci/floci:1.5.12 # imagen fija; no usar latest en CI
FLOCI_AUTOSTART=false # CI usa service container y solo espera el endpoint
```

Reglas:

- no meter Floci en unit tests.
- no usar Floci para repositorios Drizzle; para DB usar PostgreSQL real.
- ejecutar Floci solo cuando cambian AWS, storage, uploads, eventos, CDK o dependencias.
- usar `FLOCI_STORAGE_MODE=memory` en CI para no persistir estado ni gastar I/O.
- mantener `AWS_ENDPOINT_URL` centralizado; el codigo productivo no debe tener `if (floci)` dispersos.

```typescript
// src/shared/infrastructure/aws/s3.client.ts
import { S3Client } from '@aws-sdk/client-s3';
import { createAwsClientConfig } from './aws-local.config';

export function createS3Client(): S3Client {
  return new S3Client(createAwsClientConfig());
}
```

```typescript
// tests/integration/aws/s3.local.integration.test.ts
import { CreateBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  endpoint: 'http://127.0.0.1:4566',
  forcePathStyle: true,
  region: 'us-east-1',
});

describe('S3 local', () => {
  it('sube un objeto contra AWS local', async () => {
    await s3Client.send(new CreateBucketCommand({ Bucket: 'bus-impl-local' }));
    await s3Client.send(
      new PutObjectCommand({
        Body: 'archivo de prueba',
        Bucket: 'bus-impl-local',
        Key: 'uploads/example.txt',
      }),
    );

    expect(true).toBe(true);
  });
});
```

Decision:

- Floci si ayuda para AWS local y CI sin cuenta cloud.
- PostgreSQL real/Testcontainers para DB.
- Aurora/RDS para compatibilidad de entorno real.

---

## 11. Playwright E2E backend

Playwright en backend debe usarse como cliente HTTP real. No necesita navegador salvo que se valide Scalar/Swagger UI.

Convencion de archivos:

- `*.api.spec.ts`: pruebas HTTP/API con `request`; no requieren Chromium.
- `*.browser.spec.ts`: pruebas que usan `page`, navegador real o UI; requieren Chromium.
- En `bus-impl`, el PR debe preferir API E2E rapido. Browser E2E se reserva para Scalar/UI o flujos visuales reales.

Tags recomendados:

- `@smoke`: flujo rapido para confirmar que API, auth y contrato basico responden.
- `@critical`: flujo core que no debe romperse en PR.
- `@contract`: validacion de OpenAPI/contratos.
- `@regression`: suite amplia para nightly o pre-release.

Comandos:

```bash
pnpm test:e2e # ejecuta toda la suite E2E
pnpm test:e2e:api # ejecuta solo E2E API sin instalar navegador
pnpm test:e2e:browser # ejecuta solo E2E browser con Chromium
pnpm test:e2e:smoke # ejecuta solo pruebas con @smoke
pnpm test:e2e:critical # ejecuta solo pruebas con @critical
```

Reportes CI:

- Playwright genera `reports/playwright-e2e.xml`.
- El HTML report queda en `playwright-report/`.
- Ambos se suben como artifacts para diagnosticar fallos.
- CI no instala Chromium para `test:e2e:api`; instala browser solo en el job `e2e-browser`.
- CI usa bases separadas por job (`bus_impl_api_e2e`, `bus_impl_browser_e2e`) para que los jobs paralelos no compitan recreando la misma DB.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    extraHTTPHeaders: {
      'x-correlation-id': 'e2e-correlation-id',
    },
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
```

```typescript
// Ejemplo referencial: tests/e2e/product/product.api.spec.ts
import { expect, test } from '@playwright/test';
import { registerProductRequestDto } from '@/product/application/dtos/register-product.request.dto';
import { productResponseDto } from '@/product/application/dtos/register-product.response.dto';

test('registra un product completo', async ({ request }) => {
  const body = registerProductRequestDto.parse({
    nro_poliza: '123456',
    product_type: 'inclusion',
    fecha_inicio: '2026-06-08',
    broker_id: 10,
  });

  const response = await request.post('/products', { data: body });
  expect(response.status()).toBe(201);

  const json = await response.json();
  const parsed = productResponseDto.parse(json);

  expect(parsed.success).toBe(true);
  expect(parsed.product.nro_poliza).toBe(body.nro_poliza);
});
```

```typescript
// tests/e2e/openapi/openapi.api.spec.ts
import { expect, test } from '@playwright/test';

test('publica OpenAPI y Scalar', async ({ page, request }) => {
  const openApi = await request.get('/docs-json');
  expect(openApi.status()).toBe(200);

  await page.goto('/reference');
  await expect(page.getByText('Bus Impl API Reference')).toBeVisible();
});
```

---

## 12. Contract testing sin duplicar DTOs

Regla:

- el backend exporta OpenAPI.
- el frontend o consumidor usa los DTOs importados del backend.
- el e2e parsea responses con Zod DTOs reales.
- si cambia OpenAPI, el PR debe mostrar si es backward compatible.

Scripts:

```json
{
  "scripts": {
    "openapi:export": "tsx scripts/export-openapi.ts",
    "openapi:diff": "vigilio-node openapi-diff"
  }
}
```

---

## 13. CI para pruebas

Las acciones del ejemplo se muestran con tags para lectura. El workflow real debe fijarlas a SHA
completo y dejar el tag como comentario para Dependabot.

```yaml
name: bus-impl-tests

on:
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '24.16.0'
  PNPM_VERSION: '11.7.0'

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: ${{ vars.TEST_DATABASE_NAME }}
          POSTGRES_USER: ${{ vars.TEST_DATABASE_USER }}
          POSTGRES_PASSWORD: ${{ secrets.TEST_DATABASE_PASSWORD }}
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres -d bus_impl_test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v6
      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile --prefer-offline
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:coverage:ci
      - run: pnpm test:integration:ci
        env:
          E2E_AUTO_START_POSTGRES: 'false'
          E2E_DATABASE_ADMIN_URL: ${{ secrets.E2E_DATABASE_ADMIN_URL }}
          E2E_DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }}
      - run: pnpm openapi:export
      - run: pnpm openapi:diff
```

Regla CI/CD:

- `test`, `lint` y `typecheck` pueden cachearse.
- `e2e`, `smoke`, `security`, `deploy`, `db:migrate` y `cdk diff` no deben depender de cache.

---

## 14. Desarrollo seguro: `.npmrc`, `pnpm-workspace.yaml`, Husky y scripts

Regla importante:

- en pnpm 11, el repo debe dejar `.npmrc` para auth y certificados del registry.
- los settings no sensibles y de supply chain van en `pnpm-workspace.yaml`.

`.npmrc` del proyecto:

> Implementación y código original en [documento propietario del ejemplo](../../../../../platform/cicd/references/4-devsecops.md). Consultar allí el bloque completo para evitar copias divergentes.


`pnpm-workspace.yaml`:

```yaml
nodeVersion: 24.16.0
engineStrict: true
preferFrozenLockfile: true
verifyStoreIntegrity: true
strictStorePkgContentCheck: true
verifyDepsBeforeRun: error
strictDepBuilds: true
dangerouslyAllowAllBuilds: false
blockExoticSubdeps: true
minimumReleaseAge: 1440
minimumReleaseAgeStrict: true
minimumReleaseAgeIgnoreMissingTime: false
trustPolicy: no-downgrade
trustLockfile: false
resolutionMode: time-based
allowBuilds:
  esbuild: true
  '@swc/core': true
```

Reglas:

- el `.npmrc` del repo no contiene secretos hardcodeados.
- si se usan paquetes privados `@<organization>/*`, GitHub Actions debe
  tener `packages: read`.
- tokens privados van en `~/.npmrc`, variable de entorno o secreto de CI.
- el `.npmrc` versionado declara scopes y registry, pero no contiene la linea `_authToken`.
- `tokenHelper` solo va en el `.npmrc` del usuario, no en el repo.
- dependencias con build scripts se aprueban con `pnpm approve-builds`.
- nuevas excepciones de `allowBuilds` o `trustPolicy` deben revisarse en PR.

`package.json`:

```json
{
  "scripts": {
    "lint": "biome ci .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit && tsc --noEmit -p tsconfig.cdk.json",
    "test": "vitest run",
    "test:changed": "vitest run --changed --passWithNoTests",
    "test:coverage": "vitest run --coverage",
    "test:coverage:ci": "vitest run --coverage --reporter=default --reporter=junit --outputFile=reports/vitest-unit.xml",
    "test:integration": "vigilio-node setup-e2e-db && vitest run --config vitest.integration.config.ts",
    "test:integration:ci": "vigilio-node setup-e2e-db && vitest run --config vitest.integration.config.ts --reporter=default --reporter=junit --outputFile=reports/vitest-integration.xml",
    "test:e2e": "playwright test",
    "test:e2e:api": "playwright test --project=api",
    "test:e2e:browser": "playwright test --project=browser",
    "test:e2e:smoke": "playwright test --project=api --grep @smoke",
    "test:e2e:critical": "playwright test --project=api --grep @critical",
    "prepare": "husky",
    "commitlint": "vigilio-governance validate-commit-message --message-file .git/COMMIT_EDITMSG",
    "lint-staged": "lint-staged",
    "prepush:verify": "biome ci . && tsc --noEmit && tsc --noEmit -p tsconfig.cdk.json && vitest run && pnpm test:devsecops && pnpm test:bdd"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx,mjs,cjs}": ["biome check --write --no-errors-on-unmatched"],
    "*.{json,md,yml,yaml}": ["biome format --write --no-errors-on-unmatched"]
  }
}
```

Husky:

```bash
# .husky/pre-commit
pnpm lint-staged # ejecuta validaciones solo sobre archivos staged
```

```bash
# .husky/commit-msg
pnpm exec vigilio-governance validate-commit-message --message-file "$1"
```

```bash
# .husky/pre-push
pnpm prepush:verify # ejecuta validaciones locales antes de push
```

No correr integration/e2e en `pre-commit`; eso vive en CI o pre-push si el equipo acepta el costo.

---

## 15. Scripts finales recomendados

```json
{
  "scripts": {
    "test": "vitest run",
    "test:changed": "vitest run --changed --passWithNoTests",
    "test:coverage": "vitest run --coverage",
    "test:coverage:ci": "vitest run --coverage --reporter=default --reporter=junit --outputFile=reports/vitest-unit.xml",
    "test:integration": "vigilio-node setup-e2e-db && vitest run --config vitest.integration.config.ts",
    "test:integration:ci": "vigilio-node setup-e2e-db && vitest run --config vitest.integration.config.ts --reporter=default --reporter=junit --outputFile=reports/vitest-integration.xml",
    "test:e2e": "playwright test",
    "test:e2e:api": "playwright test --project=api",
    "test:e2e:browser": "playwright test --project=browser",
    "test:e2e:smoke": "playwright test --project=api --grep @smoke",
    "test:e2e:critical": "playwright test --project=api --grep @critical",
    "test:all": "pnpm test:devsecops && pnpm test:coverage && pnpm test:integration && pnpm test:bdd && pnpm test:e2e:api",
    "openapi:export": "tsx scripts/export-openapi.ts",
    "openapi:diff": "vigilio-node openapi-diff",
    "test:bdd:ci": "node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js tests/bdd/**/*.feature --import tests/bdd/**/*.steps.ts --format progress --format json:reports/cucumber-report.json"
  }
}
```

---

## 16. Que deja de ser baseline

Ya no se recomienda como baseline:

- `jest-cucumber` para todo.
- mocks de DB en integration tests.
- e2e sin validar DTO Zod de response.
- coverage global menor a 85%.
- tests que dependen de una DB compartida sin aislamiento.
- AWS SDK mockeado para flujos donde Floci puede levantar el servicio local.

---

## 17. Tests de governance y tooling

No solo se testea negocio. Tambien conviene testear las reglas que protegen el repo:

- regex de nombre de rama.
- parser del ticket Jira.
- validacion de PR title.
- politica de `packageManager`, `engines` y `nodeVersion`.

Ejemplo de test para naming de rama:

```typescript
// tests/unit/governance/validate-branch-name.test.ts
import { isValidBranchName } from '@/shared/tooling/validate-branch-name';

describe('isValidBranchName', () => {
  it('acepta feat con jira y descripcion', () => {
    expect(isValidBranchName('feat/ABC-123/crear-product')).toBe(true);
  });

  it('acepta fix con jira y descripcion', () => {
    expect(isValidBranchName('fix/ABC-456/corregir-openapi')).toBe(true);
  });

  it('rechaza ramas sin ticket', () => {
    expect(isValidBranchName('feat/crear-product')).toBe(false);
  });

  it('rechaza descripcion con espacios', () => {
    expect(isValidBranchName('feat/ABC-123/crear product')).toBe(false);
  });
});
```

Ejemplo de test para politica de package manager:

```typescript
// tests/unit/governance/validate-package-manager-policy.test.ts
import { validatePackageManagerPolicy } from '@/shared/tooling/validate-package-manager-policy';

describe('validatePackageManagerPolicy', () => {
  it('acepta la politica esperada', () => {
    const result = validatePackageManagerPolicy({
      packageManager: 'pnpm@11.7.0',
      engines: {
        node: '24.x',
        pnpm: '11.7.0',
      },
      nodeVersion: '24.16.0',
    });

    expect(result.success).toBe(true);
  });

  it('falla si packageManager cambia por error', () => {
    const result = validatePackageManagerPolicy({
      packageManager: 'pnpm@11.6.0',
      engines: {
        node: '24.x',
        pnpm: '11.7.0',
      },
      nodeVersion: '24.16.0',
    });

    expect(result.success).toBe(false);
    expect(result.errors).toContain('packageManager debe ser pnpm@11.7.0');
  });
});
```

Reglas:

- estos tests van en `unit`, no en `integration`.
- el script usado por Husky y CI debe reutilizar la misma regex o helper testeado.
- si cambia la politica de `pnpm` o `Node`, primero se actualiza el test y luego el pipeline.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Estrategia de Pruebas - `bus-impl` 2026

✅ **Correcto:** Para **Estrategia de Pruebas - `bus-impl` 2026**, cubrir casos negativos, autorización, datos reales y riesgos de concurrencia.

❌ **Incorrecto:** En **Estrategia de Pruebas - `bus-impl` 2026**, sustituir integración PostgreSQL por un mock y declarar equivalencia funcional.

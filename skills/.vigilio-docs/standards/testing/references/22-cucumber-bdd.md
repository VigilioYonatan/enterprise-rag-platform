# Cucumber BDD - `bus-impl`

Cucumber no reemplaza Vitest ni Playwright. Se usa para acceptance tests legibles por negocio cuando el flujo tiene lenguaje funcional claro.

`product`, `emision`, `renovacion` y otros nombres de seguros se usan solo como ejemplos de un flujo
con lenguaje de negocio; no son modulos obligatorios del template.

## Cuándo usar Cucumber

- Flujos de negocio con reglas compartidas entre negocio, QA y desarrollo.
- Acceptance criteria de Jira que conviene convertir a escenarios.
- Casos críticos donde el wording importa: products, emisión, pagos, anulaciones, renovaciones.
- Reglas que deben sobrevivir refactors internos.

## Cuándo no usar Cucumber

- Unit tests de services.
- Validaciones simples de DTO.
- Repositories Drizzle.
- Tests técnicos de cache, logger, health checks o migrations.

Para eso usar Vitest o Playwright.

## Estructura

```txt
tests/
`-- bdd/
    `-- product/
        |-- register-product.feature
        `-- register-product.steps.ts
```

Regla: BDD tambien sigue `tests/bdd/<modulo>`. No dejar features sueltas en `tests/bdd` porque con varios bounded contexts se vuelve dificil saber que negocio rompio.

## Script

```json
{
  "scripts": {
    "test:bdd": "node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber-js tests/bdd/**/*.feature --import tests/bdd/**/*.steps.ts --format progress"
  }
}
```

## Regla de arquitectura

Los steps deben usar application services, DTOs Zod y ports. No deben importar controllers HTTP, Drizzle repositories reales ni Nest testing module salvo que el escenario sea explicitamente e2e.

✅ Correcto:

```ts
const body = registerProductRequestDto.parse(payload);
const service = new ProductApplicationService(repository);
const response = await service.store(body);
```

❌ Incorrecto:

```ts
await request(app.getHttpServer()).post('/products').send(payload);
```

Eso es e2e HTTP, no BDD de application.

## Naming

- Feature en español si negocio trabaja en español.
- Steps cortos y declarativos.
- No poner detalles técnicos en Gherkin.
- No abusar de `Scenario Outline`; usarlo solo si la tabla aporta claridad.

Ejemplo:

```gherkin
Feature: Registrar product

  Scenario: Registrar un product de inclusion
    Given un request valido para registrar un product
    When registro el product
    Then la respuesta confirma el product registrado
```

## CI

`test:bdd` debe correr después de unit tests y antes de e2e HTTP:

```txt
lint -> typecheck -> test:coverage -> test:bdd -> openapi -> e2e
```

Si el BDD empieza a ser lento, separar por tags:

```bash
pnpm test:bdd -- --tags "@critical" # ejecuta script definido en package.json
```

## Reglas senior

- Cucumber solo para comportamiento observable de negocio.
- Los steps no tienen `any`.
- Los fixtures entran por DTOs Zod.
- No duplicar assertions técnicas que ya cubre Vitest.
- Cada feature debe mapear a una capacidad real del bounded context.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).


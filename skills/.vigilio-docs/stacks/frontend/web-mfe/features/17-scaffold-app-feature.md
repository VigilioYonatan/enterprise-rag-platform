# Scaffold De Aplicación Y Feature Web MFE

## Objetivo

Crear una aplicación o feature con boundaries previsibles, APIs separadas de hooks, contratos del backend reutilizados y tests adyacentes. Este documento define el resultado esperado; la skill ejecuta el procedimiento sobre el consumidor.

## Aplicación frente a feature

Usar la plantilla:

```text
apps/{dominio-o-producto}/{aplicacion}/
```

Crear una aplicación nueva solo si necesita build, runtime config, despliegue u ownership independiente. Una ruta o pantalla nueva normalmente es una feature dentro de una aplicación existente.

Ejemplos:

```text
apps/salud/backoffice/
apps/invoices/admin/
apps/orders/portal/
```

Los nombres son variables. La estructura puede alinearse con microservicios, pero el frontend se organiza por casos de uso, ownership y ciclo de entrega, no por copiar toda la topología backend.

## Inputs obligatorios

Antes de crear archivos confirmar:

- aplicación, ruta y layout owner;
- feature backend: `users`, `products`, `orders`, `invoices`;
- operaciones: `listUsers`, `getUser`, `registerUser`, `changeUserDetails`, `removeUser` **según la intención del dominio**, y comandos como `approvePolicy`/`cancelOrder` donde proceda (no scaffolding CRUD genérico);
- perfil contractual seleccionado y request/response DTOs publicados en su package exacto;
- permisos y estados UX;
- query params, invalidación y navegación;
- riesgos de accesibilidad, seguridad, rendimiento y testing.

Si falta contrato HTTP, detener el scaffold de integración y coordinarlo con el backend owner del perfil. Para `web-mfe-v2`, el único owner válido es `bus-impl-v2` y el package es `@vigilioyonatan/bus-v2-contracts`; no inventar DTOs locales ni reutilizar el contrato del otro perfil.

## Árbol mínimo completo

```text
apps/{dominio}/{aplicacion}/src/
|-- app/
|   |-- app.tsx
|   |-- app.test.tsx
|   |-- app.providers.tsx
|   |-- app.providers.test.tsx
|   |-- app.router.tsx
|   `-- app.router.test.tsx
|-- features/
|   `-- users/
|       |-- pages/
|       |   |-- list-users.tsx
|       |   `-- list-users.test.tsx
|       |-- components/
|       |   |-- register-user.tsx
|       |   `-- register-user.test.tsx
|       |-- hooks/
|       |   |-- use-list-users-query.ts
|       |   |-- use-list-users-query.test.ts
|       |   |-- use-register-user-mutation.ts
|       |   `-- use-register-user-mutation.test.ts
|       |-- services/
|       |   |-- list-users.api.ts
|       |   |-- list-users.api.test.ts
|       |   |-- register-user.api.ts
|       |   `-- register-user.api.test.ts
|       |-- constants/
|       |   |-- users-query-keys.constants.ts
|       |   `-- users-query-keys.constants.test.ts
|       |-- types/
|       |   `-- user-row.types.ts
|       |-- libs/
|       |   |-- map-user-row.ts
|       |   `-- map-user-row.test.ts
|       `-- mocks/
|           |-- users.handlers.ts
|           `-- users.fixtures.ts
|-- services/
|   `-- http/
|       |-- api-client.ts
|       `-- api-client.test.ts
`-- main.tsx
```

El árbol es una referencia poblada, no una orden de crear todas las carpetas. No dejar carpetas vacías ni placeholders.

## Feature agrupadora con subfeatures hermanas

No crear `features/products/products/`. Si el frontend necesita `products`, `categories` y `brands`
como capacidades hermanas bajo el mismo ownership, nombrar el padre por el bounded context real,
por ejemplo `catalog/`:

```text
features/catalog/
|-- products/
|   |-- pages/
|   |-- components/
|   |-- hooks/
|   |-- services/
|   |-- constants/
|   |-- types/
|   |-- libs/
|   `-- mocks/
|-- categories/
|   |-- pages/
|   |-- components/
|   |-- hooks/
|   |-- services/
|   |-- constants/
|   |-- types/
|   |-- libs/
|   `-- mocks/
|-- brands/
|   |-- pages/
|   |-- components/
|   |-- hooks/
|   |-- services/
|   |-- constants/
|   |-- types/
|   |-- libs/
|   `-- mocks/
`-- shared/
    |-- components/
    |-- hooks/
    |-- constants/
    |-- types/
    |-- libs/
    `-- mocks/
```

Cada hija es una feature completa y sus APIs viven en su propio `services/`. Crear solamente las
carpetas que tengan archivos. `catalog/shared/` exige al menos dos consumidoras hermanas;
`src/shared/` exige reutilización entre features de primer nivel; `libs/ui` se reserva para UI
agnóstica compartida entre aplicaciones.

## Flujo por operación

```text
list-users.tsx
  -> list-users.hooks.ts
    -> features/users/services/list-users.api.ts
      -> GET /users

register-user.tsx
  -> register-user.hooks.ts
    -> features/users/services/register-user.api.ts
      -> POST /users
        -> invalidar list-users
```

- `features/{feature}/services/{operacion}.api.ts`: HTTP, headers, request DTO y response schema.
- `features/{feature}/hooks/{operacion}.hooks.ts`: `useQuery`/`useMutation`, keys, retry e invalidación.
- `pages/`: composición de ruta y layout.
- `components/`: interacción específica y estados visibles.
- `components/ui/`: UI privada de la feature.
- `constants/`: query keys y valores runtime; todo comportamiento lleva test.
- `types/`: ViewModels y props de UI, nunca DTOs espejo.
- `libs/`: mappers/formatters privados con test.
- `mocks/`: MSW/fixtures deterministas; handlers con lógica llevan test.

## Convención de nombres

Nombrar por dominio y acción:

```text
list-users.tsx
register-user.tsx
change-user-details.tsx
list-users.hooks.ts
register-user.api.ts
```

Evitar `form.tsx`, `panel.tsx`, `table.tsx`, `utils.ts` o `hooks.ts` sin contexto.

## Tests y coverage

Todo `.ts`/`.tsx` escrito a mano que produzca JavaScript debe tener cobertura identificable y, por defecto, test adyacente con el mismo nombre base. Cubrir happy path, errores, loading, empty, permisos, sesión expirada, invalidación y accesibilidad según el riesgo.

Excepciones técnicas: `*.types.ts`, `.d.ts`, CSS, código generado y setup declarativo. Se validan con typecheck, build, visuales o la suite que los consume; no pueden esconder lógica ejecutable.

## Verificación del scaffold

```bash
pnpm lint
pnpm typecheck
pnpm governance:contracts
pnpm test
pnpm build
pnpm bundle:budget
```

Ejecutar E2E/visual cuando se agrega una ruta, journey o superficie visual de riesgo.

## No hacer

- Crear `libs/contracts` o schemas duplicados.
- Importar `*.doc.ts`, NestJS o Node built-ins en browser.
- Ejecutar `fetch` desde componentes/hooks.
- Copiar server state a Zustand/Signals.
- Crear otra app por una sola pantalla.
- Crear carpetas vacías.
- Crear tests sin assertions para inflar coverage.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Scaffold De Aplicación Y Feature Web MFE

✅ **Correcto:** Para **Scaffold De Aplicación Y Feature Web MFE**, crear operaciones semánticas según casos de uso y comprobar contratos publicados.

❌ **Incorrecto:** En **Scaffold De Aplicación Y Feature Web MFE**, generar métodos CRUD index/show/store como norma de negocio.

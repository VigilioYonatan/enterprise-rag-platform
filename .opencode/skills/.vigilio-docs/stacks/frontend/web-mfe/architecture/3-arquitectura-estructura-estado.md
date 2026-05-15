# Arquitectura, Estructura Y Estado Frontend

## Objetivo

Definir el baseline arquitectónico para frontends Preact/React compatibles con `web-mfe`. La documentación explica decisiones; el código, los tests y la configuración ejecutable del consumidor conservan prioridad.

## Stack de referencia 2026

- Node.js 24 y pnpm 11 con versiones exactas.
- TypeScript estricto y ESM.
- Preact 10 mediante compatibilidad React.
- Vite 8 y Tailwind CSS 4.
- TanStack Query para estado remoto.
- React Hook Form + Zod para formularios.
- TanStack Table cuando una tabla requiere comportamiento avanzado.
- Preact Signals para estado cliente reactivo local o compartido; Zustand solo cuando se necesita un store con acciones, middleware o tooling que Signals no aporta.
- Biome para lint y formato.
- Vitest, Testing Library, MSW y Playwright.

Las versiones concretas pertenecen al `package.json` y lockfile del consumidor. Esta guía no autoriza ranges flotantes ni reemplaza los gates de dependencias.

## Flujo de dependencias

```text
app shell / route
  -> feature container
    -> query y mutation hooks
      -> services HTTP
        -> ApiClient + contratos Zod publicados
    -> componentes de presentación
      -> libs/ui
```

Las dependencias apuntan hacia servicios y primitivas. `libs/ui` no conoce endpoints, stores, DTOs de negocio ni features.

## Capas

- `apps/`: aplicaciones desplegables. Sus nombres representan el dominio/producto y la aplicación concreta; no son nombres fijos.
- `app/`: bootstrap, providers, router, layout y error boundaries de una aplicación.
- `features/`: capacidades funcionales alineadas con dominios o APIs del backend, con UI y hooks específicos.
- `features/{feature}/services/`: APIs HTTP de dominio y sus pruebas adyacentes.
- `src/services/`: cliente HTTP, autenticación, runtime config, observabilidad y adapters transversales.
- `libs/ui`: primitivas visuales agnósticas de negocio.
- `libs/test-utils`: render con providers y utilidades de pruebas.
- paquete de contratos: schemas y tipos HTTP browser-safe.
- `infra/`: CDK y configuración de entrega.

No crear una carpeta genérica para esconder responsabilidades. Una abstracción se justifica por consumidores reales o por un boundary técnico estable.

## Aplicaciones variables por proyecto

`apps/salud/backoffice` es un ejemplo del consumidor actual, no una convención rígida. La plantilla es:

```text
apps/
`-- {dominio-o-producto}/
    `-- {aplicacion}/
        `-- src/
```

Ejemplos válidos según el proyecto y su ownership:

```text
apps/salud/backoffice/
apps/invoices/admin/
apps/orders/portal/
apps/claims/operations/
```

- `{dominio-o-producto}` identifica el bounded context, producto o unidad desplegable que tiene sentido para la organización.
- `{aplicacion}` identifica la experiencia concreta: `admin`, `backoffice`, `portal`, `operations`, `checkout` u otra.
- La estructura frontend puede alinearse con microservicios, pero no debe copiar su topología uno a uno sin necesidad. El boundary correcto lo definen casos de uso, ownership, rutas y ciclos de despliegue.
- Una aplicación nueva se crea solo cuando requiere build, configuración, despliegue u ownership independiente. Una pantalla nueva no justifica otra aplicación.

## Ownership de estado

| Tipo de estado | Owner |
|---|---|
| Datos HTTP, caché, retry y refetch | TanStack Query |
| Campos y errores del formulario | React Hook Form |
| Estado visual local reactivo | `useSignal` dentro del componente o hook propietario |
| Valor derivado de Signals | `useComputed`; no duplicar el valor en otro estado |
| Preferencia compartida de cliente | Signal con owner y lifecycle explícitos; Zustand solo con justificación |
| Filtros compartibles o navegación | URL/router |
| Contrato HTTP | `bus-impl` y paquete publicado |

No copiar server state a otro store. No usar `useEffect` como sustituto de TanStack Query ni sincronizar dos fuentes de verdad.

## Preact Signals

En código Preact nuevo, no introducir `useState` por reflejo. Preferir `useSignal` cuando el valor es
estado cliente reactivo y no pertenece a TanStack Query, React Hook Form, la URL o runtime config.
`useState` permanece permitido para interoperabilidad con APIs React de terceros o componentes
existentes donde migrar no reduzca renders, suscripciones ni complejidad; la excepción debe ser
deliberada, no el default.

```tsx
import { useComputed, useSignal } from '@preact/signals';

const selected_product_id = useSignal<string | null>(null);
const has_selection = useComputed(() => selected_product_id.value !== null);

function selectProduct(id: string) {
  selected_product_id.value = id;
}
```

Reglas:

- Mantener `useSignal` dentro del componente o custom hook propietario por defecto.
- Crear signals a nivel de módulo solo para estado realmente compartido, con owner, lifecycle,
  política de reset y pruebas que impidan contaminación entre casos.
- Actualizar arrays y objetos de forma inmutable: `items.value = [...items.value, next]`; no usar
  `items.value.push(next)` esperando notificación reactiva.
- Usar `useComputed` para valores derivados puros. No sincronizar dos signals mediante effects.
- Usar `useSignalEffect` únicamente para efectos externos inevitables y devolver cleanup cuando
  registre listeners, timers o suscripciones.
- No copiar responses de TanStack Query, campos de React Hook Form, tokens, runtime config ni
  parámetros de URL dentro de Signals.
- No crear un signal global por comodidad; estado global sin lifecycle claro produce fugas entre
  rutas, tests y posibles renders SSR.
- Probar comportamiento visible y transiciones. Los signals compartidos deben resetearse entre tests.

## Boundaries

- Todo dato de red inicia como `unknown` y se valida en el cliente HTTP o servicio.
- Los componentes reciben datos validados o ViewModels.
- Los errores de transporte, HTTP, contrato y UI se mantienen diferenciados.
- Autorización y reglas de negocio viven en backend; frontend solo mejora UX.
- Configuración runtime pública se valida con allowlist y Zod.

## SPA modular frente a MFE real

Un repositorio llamado `web-mfe` no implica Module Federation. Mantener una SPA modular mientras no existan equipos, dominios y ciclos de despliegue independientes.

Antes de composición runtime crear un ADR/OpenSpec que defina:

- shell y ownership de rutas;
- dependencias compartidas y compatibilidad;
- aislamiento de fallos;
- CSP y carga de remotos;
- observabilidad y rollback por MFE;
- presupuesto de bundle y estrategia de caché.

## Estructura escalable de una aplicación

```text
apps/{dominio-o-producto}/{aplicacion}/src/
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
|       `-- mocks/
|           |-- users.handlers.ts
|           `-- users.fixtures.ts
|-- services/
|   |-- http/
|   |   |-- api-client.ts
|   |   `-- api-client.test.ts
|   |-- forms/
|   |   |-- nullable-zod-resolver.ts
|   |   `-- nullable-zod-resolver.test.ts
|   `-- validation/
|       |-- zod-locale.ts
|       `-- zod-locale.test.ts
|-- styles/
|   `-- globals.css
|-- test/
|   `-- setup.ts
|-- main.tsx
`-- main.test.tsx
```

El árbol muestra posibilidades, no carpetas obligatorias. No crear carpetas vacías ni archivos placeholder. Cada directorio aparece únicamente cuando contiene una responsabilidad y al menos un archivo real.

## Naming Standards en APIs y Custom Hooks

1. **APIs en `services/` (por feature):** Cada operación API HTTP debe tener su propio archivo dedicado en kebab-case (`list-products.api.ts`, `register-product.api.ts`, `change-product-details.api.ts`, `remove-product.api.ts`). **Está prohibido** agrupar múltiples endpoints en un archivo monolítico como `product.service.ts`.
2. **Custom Hooks en `hooks/` (por feature):** Cada custom hook debe nombrarse en kebab-case indicando la acción y tipo (`use-list-products-query.ts`, `use-register-product-mutation.ts`). **Está prohibido** el uso de camelCase como `useListProducts.ts`.

## Features, dominios y subfeatures

`features/` representa capacidades consumidas o soportadas por el backend. Una feature simple es
autosuficiente y mantiene sus APIs de dominio dentro de `services/`:

```text
features/products/
|-- pages/
|   |-- list-products.tsx
|   `-- list-products.test.tsx
|-- components/
|   |-- register-product.tsx
|   |-- register-product.test.tsx
|   |-- change-product-details.tsx
|   |-- change-product-details.test.tsx
|   `-- ui/
|       |-- product-price.tsx
|       `-- product-price.test.tsx
|-- hooks/
|   |-- use-list-products-query.ts
|   |-- use-list-products-query.test.ts
|   |-- use-register-product-mutation.ts
|   `-- use-register-product-mutation.test.ts
|-- services/
|   |-- list-products.api.ts
|   |-- list-products.api.test.ts
|   |-- register-product.api.ts
|   `-- register-product.api.test.ts
|-- constants/
|   |-- product-status.constants.ts
|   `-- product-status.constants.test.ts
|-- types/
|   `-- product-row.types.ts
|-- libs/
|   |-- map-product-row.ts
|   `-- map-product-row.test.ts
`-- mocks/
    |-- products.handlers.ts
    `-- products.fixtures.ts
```

No crear `features/products/products/`. Si `products`, `categories` y `brands` son capacidades
hermanas bajo un mismo ownership, cambiar el padre a un nombre agregador real, por ejemplo
`catalog/`, y dar a cada hija la misma estructura interna:

```text
features/catalog/
|-- products/
|   |-- pages/
|   |-- components/
|   |   `-- ui/
|   |-- hooks/
|   |-- services/
|   |-- constants/
|   |-- types/
|   |-- libs/
|   `-- mocks/
|-- categories/
|   |-- pages/
|   |-- components/
|   |   `-- ui/
|   |-- hooks/
|   |-- services/
|   |-- constants/
|   |-- types/
|   |-- libs/
|   `-- mocks/
|-- brands/
|   |-- pages/
|   |-- components/
|   |   `-- ui/
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

El árbol anterior expresa carpetas posibles. En código real cada carpeta existe solo cuando contiene
archivos. `catalog/shared/` recibe únicamente piezas usadas por al menos dos hijas. Si algo se comparte
entre features no relacionadas de la aplicación, puede promoverse a `src/shared/`; si es una primitiva
visual agnóstica compartida entre aplicaciones, pertenece a `libs/ui`. Ningún `shared/` es un cajón
genérico.

Responsabilidades internas:

- `pages/`: entrada de ruta y composición de la pantalla; no ejecuta HTTP directamente.
- `components/`: componentes específicos de la feature con nombres que expresan acción o responsabilidad.
- `components/ui/`: UI privada y reutilizada dentro de la feature; no reemplaza `libs/ui` global.
- `hooks/`: queries, mutations y comportamiento reutilizable de la feature.
- `services/`: operaciones HTTP y adapters propios de esa feature; cada API tiene prueba adyacente.
- `constants/`: valores declarativos estables; no configuración runtime ni enums copiados del backend.
- `types/`: ViewModels, props y tipos exclusivos de UI; nunca DTOs HTTP espejo.
- `libs/`: formatters, mappers y helpers privados de la feature; no es un cajón genérico.
- `mocks/`: handlers MSW, fixtures y builders deterministas usados por pruebas o desarrollo controlado.
- `shared/`: piezas usadas por dos o más hijas del mismo agregador; no recibe código por comodidad.

## APIs de feature y servicios transversales

Las APIs de negocio viven junto a su feature:

```text
features/users/
|-- services/
|   |-- list-users.api.ts
|   |-- list-users.api.test.ts
|   |-- register-user.api.ts
|   `-- register-user.api.test.ts
|-- hooks/
|-- components/
`-- pages/
```

`src/services/` queda reservado para infraestructura transversal de la aplicación:

```text
services/
|-- http/
|   |-- api-client.ts
|   `-- api-client.test.ts
|-- forms/
|   |-- nullable-zod-resolver.ts
|   `-- nullable-zod-resolver.test.ts
|-- validation/
|   |-- zod-locale.ts
|   `-- zod-locale.test.ts
|-- auth/
|-- config/
`-- observability/
```

Cada `*.api.ts` de una feature representa una operación HTTP reconocible e importa el cliente HTTP
transversal y los contratos publicados. Los hooks hermanos configuran TanStack Query. No colocar APIs
de `products`, `users` o `orders` directamente en `src/services/`.

Flujo obligatorio:

```text
features/users/pages/list-users.tsx
  -> features/users/hooks/list-users.hooks.ts
    -> features/users/services/list-users.api.ts
      -> apiClient/fetch
        -> GET /users

features/users/components/register-user.tsx
  -> features/users/hooks/register-user.hooks.ts
    -> features/users/services/register-user.api.ts
      -> apiClient/fetch
        -> POST /users
          -> invalidar list-users
```

- `*.api.ts`: transporte, headers, request DTO y response schema; no TanStack Query, JSX ni estado visual.
- `*.hooks.ts`: `useQuery`/`useMutation`, query keys, caché e invalidación; no `fetch` ni parse manual del response.
- `*.tsx`: formulario, accesibilidad y estados visibles; no cliente HTTP directo.

No crear DTOs espejo dentro de `features/` ni `services/`; los contratos HTTP vienen del paquete publicado por backend.

## Nombres de archivos y pruebas adyacentes

- Usar kebab-case y un nombre descriptivo: `register-user.tsx`, `change-user-details.tsx`, `list-products.tsx`.
- Evitar nombres ambiguos como `form.tsx`, `modal.tsx`, `panel.tsx`, `utils.ts` o `hooks.ts` cuando el contexto no explica su responsabilidad.
- Todo archivo ejecutable con comportamiento tiene una prueba adyacente con el mismo nombre base: `change-user-details.tsx` junto a `change-user-details.test.tsx`.
- Hooks con lógica: `use-products-query.ts` junto a `use-products-query.test.tsx`.
- APIs: `register-user.api.ts` junto a `register-user.api.test.ts`.
- Helpers: `map-product-row.ts` junto a `map-product-row.test.ts`.
- Constantes runtime: `users-query-keys.constants.ts` junto a `users-query-keys.constants.test.ts`.
- Archivos puramente de tipos no generan JavaScript y se verifican con TypeScript. CSS, declaraciones, test setup, fixtures declarativas y código generado se verifican mediante sus gates o suites consumidores. Ninguna excepción puede contener lógica ejecutable oculta.
- Todo archivo `.ts`/`.tsx` escrito a mano que produzca JavaScript debe quedar cubierto por una prueba identificable. La preferencia es una prueba adyacente; entrypoints y composición global pueden cubrirse mediante un smoke test explícitamente trazable.

## Reglas compartidas entre MFEs

- Un `QueryClient` configurado por aplicación, no por componente.
- Cliente HTTP único con timeout, abort, correlation ID y parse Zod.
- Error boundaries por shell y por feature de riesgo.
- Primitivas UI accesibles antes de promover componentes de negocio.
- Budgets, headers, runtime config y observabilidad consistentes por plataforma.
- Dependencias compartidas solo cuando ownership y versionado están claros.

## Definition of Done arquitectónica

- La capa elegida tiene una responsabilidad concreta.
- No existe estado duplicado ni contrato duplicado.
- Los imports respetan boundaries.
- La feature vecina y `AGENTS.md` fueron revisados.
- Los tests cubren el riesgo observable.
- Lint, typecheck, contratos, tests, build y budget relevantes quedan verdes.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Componentes enfocados, contratos compartidos, estados explícitos, accesibilidad y `map()` puro para renderizar listas con keys estables.
- ❌ **Incorrecto:** `map()` para efectos ignorando el retorno, `forEach(async...)` sin esperar, duplicar schemas y renderizar HTML no confiable.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

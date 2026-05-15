# Arquitectura, Estructura, Estado Y Navegación Mobile

## Objetivo

Definir el baseline para aplicaciones Expo/React Native compatibles con `mobile-mfe`. La aplicación
de referencia demuestra el patrón; cada producto conserva sus propios dominios, application IDs,
rutas, permisos y ownership.

## Stack De Referencia

- Expo SDK 56, React Native 0.85 y React 19.2.
- Expo Router para rutas tipadas y deep links.
- TanStack Query para estado remoto.
- React Hook Form + Zod para formularios.
- Preact Signals para estado cliente compartido pequeño con lifecycle explícito.
- NativeWind y tokens semánticos para UI.
- SecureStore detrás de un adapter para material de sesión estrictamente necesario.
- Jest Expo, React Native Testing Library y Maestro.

Las versiones exactas pertenecen al `package.json` y lockfile. Esta guía no autoriza rangos flotantes.

## Flujo De Dependencias

```text
app/ route
  -> src/screens/ screen de composición
    -> src/features/{feature}/ component o hook
      -> src/features/{feature}/services/*.api.ts
        -> src/services/http/ApiClient
          -> @vigilioyonatan/bus-contracts
          -> backend HTTP
    -> src/services/ adapters nativos transversales
```

Las dependencias apuntan hacia contratos, services y adapters. Una capa inferior nunca importa una
route, screen o componente de presentación. `app/` registra navegación y metadata; no contiene
`fetch`, DTOs, schemas de dominio ni reglas de negocio.

## Capas

- `app/`: layouts, route groups y entrypoints delgados de Expo Router.
- `src/screens/`: composición de una pantalla, navegación y boundaries visibles.
- `src/features/`: capacidades de dominio con componentes, hooks y APIs propias.
- `src/features/{feature}/services/`: una operación HTTP reconocible por archivo.
- `src/services/`: HTTP, auth, archivos, observabilidad y adapters nativos transversales.
- `src/providers/`: QueryClient y bridges AppState/NetInfo.
- `src/design-system/`: primitivas nativas agnósticas de negocio.
- `libs/test-utils/`: render con providers y builders genéricos de pruebas.
- `tests/e2e/`: journeys Maestro de nivel aplicación.

No crear `shared`, `common`, `utils`, `types` o `schemas` como cajones genéricos. Una abstracción se
promueve cuando tiene consumidores reales o representa un boundary técnico estable.

## Estructura Escalable

```text
app/
|-- _layout.tsx
|-- (auth)/
|   `-- login.tsx
`-- (app)/
    |-- _layout.tsx
    `-- products.tsx
src/
|-- screens/
|   |-- products-screen.tsx
|   `-- products-screen.test.tsx
|-- features/
|   `-- catalog/
|       `-- products/
|           |-- components/
|           |   |-- list-products.tsx
|           |   |-- list-products.test.tsx
|           |   |-- register-product.tsx
|           |   `-- register-product.test.tsx
|           |-- hooks/
|           |   |-- use-list-products-query.ts
|           |   |-- use-list-products-query.test.ts
|           |   |-- use-register-product-mutation.ts
|           |   `-- use-register-product-mutation.test.ts
|           |-- services/
|           |   |-- list-products.api.ts
|           |   |-- list-products.api.test.ts
|           |   |-- register-product.api.ts
|           |   `-- register-product.api.test.ts
|           |-- constants/
|           |   |-- products-query-keys.constants.ts
|           |   `-- products-query-keys.constants.test.ts
|           |-- types/
|           |   `-- product-row.types.ts
|           |-- libs/
|           |   |-- map-product-row.ts
|           |   `-- map-product-row.test.ts
|           `-- mocks/
|               |-- products.fixtures.ts
|               `-- products.http-mocks.ts
|-- services/
|   |-- auth/
|   |-- files/
|   |-- http/
|   `-- observability/
|-- providers/
`-- design-system/
libs/
`-- test-utils/
tests/
`-- e2e/
```

El árbol muestra posibilidades, no carpetas obligatorias. No crear directorios vacíos, barrel files
sin consumidores ni placeholders. Una feature simple puede vivir directamente en
`features/products`; usar un agregador como `catalog/` solo cuando agrupe capacidades hermanas bajo
el mismo ownership.

## Responsabilidades Internas De Una Feature

- `components/`: UI de dominio; no ejecuta HTTP directo.
- `hooks/`: queries, mutations y comportamiento reutilizable; no parsea JSON manualmente.
- `services/`: transporte y parsing runtime; no contiene JSX, React hooks ni estado visual.
- `constants/`: query keys y valores declarativos del cliente; no enums copiados del backend.
- `types/`: props y ViewModels derivados; nunca DTOs HTTP espejo.
- `libs/`: mappers/formatters puros de la feature con prueba adyacente.
- `mocks/`: fixtures mínimas y adapters de red para pruebas; no una segunda fuente contractual.

Cada operación HTTP usa un archivo en kebab-case: `list-products.api.ts`,
`register-product.api.ts`, `change-product-details.api.ts`. No agrupar CRUD completo en
`product.service.ts`. Los adapters transversales permanecen en `src/services/`; las APIs de negocio
permanecen junto a su feature.

## Contratos Y Tipos De UI

No crear DTOs, schemas, enums o interfaces espejo dentro de `features/`, `services/`, `types/` o
`libs/`. Los tipos de UI se derivan con `Pick`, `Omit`, `Partial`, acceso indexado e intersecciones
sobre `@vigilioyonatan/bus-contracts`. La regla y los ejemplos canónicos viven en
[Contratos, Zod, formularios y TanStack](../contracts/1-contratos-zod-formularios-tanstack.md#derivación-de-tipos-sin-duplicación).

Un schema local `*-form.schema.ts` solo describe una representación nativa distinta —por ejemplo,
un `TextInput` numérico— y debe mapearse al request DTO publicado. No representa otro contrato HTTP.

## Ownership De Estado

| Estado | Owner |
|---|---|
| Respuesta backend, cache, retry y refresh | TanStack Query |
| Inputs, touched, validación y submit | React Hook Form |
| Params, tabs, stack y deep links | Expo Router |
| Sesión pública (`loading/authenticated/anonymous`) | Signal con owner/reset explícito |
| Access token estrictamente necesario | SecureStore detrás del service de auth |
| Preferencia no sensible persistente | Adapter de storage con schema/versionado |
| Modal, pressed y selección efímera | `useSignal` dentro del componente o hook propietario |
| Contrato HTTP | Backend y paquete publicado |

No copiar server state a Signals/Zustand, tokens a estado reactivo ni params de ruta a otro store.
Conectar TanStack Query a AppState y NetInfo desde un provider único, no desde cada screen.

## Preact Signals

En código React Native nuevo, no introducir `useState` por reflejo. Preferir `useSignal` cuando el valor es
estado cliente reactivo y no pertenece a TanStack Query, React Hook Form, la URL/router o runtime config.
`useState` permanece permitido para interoperabilidad con APIs React de terceros o componentes
existentes donde migrar no reduzca renders, suscripciones ni complejidad; la excepción debe ser
deliberada, no el default.

```typescript
import { useSignal, useComputed } from '@preact/signals-react';

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
  parámetros de Expo Router dentro de Signals.
- No crear un signal global por comodidad; estado global sin lifecycle claro produce fugas entre
  rutas, tests y posibles renders.
- Probar comportamiento visible y transiciones. Los signals compartidos deben resetearse entre tests.

## Navegación

- Grupos `(auth)` y `(app)` expresan boundaries, no autorización backend.
- El guard espera restauración de sesión antes de redirigir; no muestra brevemente rutas protegidas.
- Deep links y params externos se parsean, validan y autorizan como cualquier entrada no confiable.
- Tabs conservan tareas principales; flujos transaccionales usan stack o modal.
- Route files seleccionan una screen y metadata. La lógica de negocio vive debajo.
- Probar back de Android, dismiss de modal, enlace frío y enlace con app activa cuando sean críticos.

## Nombres Y Pruebas Adyacentes

- Archivos en kebab-case y nombres específicos: `register-product.tsx`, no `form.tsx`.
- Componentes en PascalCase; hooks comienzan con `use`.
- Cada archivo con comportamiento tiene prueba del mismo nombre base junto a él.
- APIs prueban payload válido, error HTTP y response incompatible.
- Hooks prueban keys, enabled, retry e invalidación.
- Screens prueban estados visibles, accesibilidad y navegación.
- Los E2E permanecen centralizados porque prueban journeys, no un único módulo.

## MFE Frente A Super-App

La modularidad por features es el default. Múltiples bundles nativos o mini-apps elevan riesgo de
versionado, permisos, tamaño y stores; necesitan ADR, ownership, contrato binario, observabilidad y
rollback propios. No introducir Module Federation web dentro del runtime nativo.

## Definition Of Done

- Dependencias respetan capas y la feature expone solo su API necesaria.
- No existe contrato ni estado duplicado.
- Cada API representa una operación y valida el response publicado.
- Back, deep links y sesión tienen pruebas proporcionales al riesgo.
- Loading, refresh, empty, error, offline, denied y success están modelados cuando aplican.
- No existen carpetas vacías, placeholders ni archivos runtime sin prueba identificable.
- Lint, typecheck, contratos, tests, export y budget relevantes quedan verdes.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Validar deep links y permisos, controlar secretos, estados offline, accesibilidad y pruebas en dispositivos.
- ❌ **Incorrecto:** Guardar secretos permanentes sin protección, depender sólo del happy path o ignorar permisos/OTA por ambiente.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

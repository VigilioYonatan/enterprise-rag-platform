# Testing Con Vitest, MSW Y Playwright

## Principio

Probar comportamiento observable por riesgo. No duplicar el mismo caso en todas las capas ni confundir cobertura con calidad.

## Capas

| Capa | Uso |
|---|---|
| Unit | funciones puras, formatters, mappings y stores |
| Component/integration | formularios, interacción, queries y accesibilidad |
| Contract | schemas publicados, browser safety y OpenAPI |
| E2E | journeys críticos conectados |
| Visual | layouts o componentes con riesgo visual real |

## Reglas

- Vitest como runner y assertions.
- Testing Library Preact para comportamiento visible.
- MSW para modelar el boundary HTTP.
- Playwright para desktop y viewport móvil.
- axe para fallos automáticos serios/críticos.
- Sin sleeps, red externa ni datos compartidos entre tests.
- Todo bug de producción deja una prueba de regresión.

## Colocación y nombres

Las pruebas unitarias y de componente viven junto al archivo que protegen y conservan el mismo nombre base:

```text
features/users/components/register-user.tsx
features/users/components/register-user.test.tsx

features/users/hooks/list-users.hooks.ts
features/users/hooks/list-users.hooks.test.tsx

features/users/services/list-users.api.ts
features/users/services/list-users.api.test.ts

features/users/services/register-user.api.ts
features/users/services/register-user.api.test.ts

features/users/constants/users-query-keys.constants.ts
features/users/constants/users-query-keys.constants.test.ts

libs/map-user-row.ts
libs/map-user-row.test.ts
```

- Usar `.test.tsx` cuando la prueba renderiza JSX y `.test.ts` para lógica sin JSX.
- No crear una carpeta `__tests__` paralela para esconder ownership, salvo una restricción técnica documentada.
- E2E y visuales permanecen en `tests/e2e` y `tests/visual` porque cubren journeys, rutas o composición entre varias unidades.
- Todo `.ts`/`.tsx` escrito a mano que genere JavaScript debe tener cobertura y una prueba identificable. Esto incluye APIs, hooks, componentes, páginas, constantes runtime, query-key factories, mappers, config y adapters.
- `*.types.ts`, `.d.ts`, CSS, test setup declarativo, fixtures sin lógica y código generado no requieren un unit test artificial. Se verifican mediante typecheck, build, visuales, suites consumidoras o el generador correspondiente.
- No crear carpetas o archivos de prueba vacíos para satisfacer la forma del árbol.

## Cobertura útil

- No bajar thresholds para hacer pasar un cambio.
- Una línea ejecutada no demuestra comportamiento: cubrir resultados, branches, errores y side effects relevantes.
- APIs: request correcto, headers relevantes, response válido e incompatibilidad contractual.
- Hooks query: key, parámetros, loading, success, error y empty cuando sea observable.
- Hooks mutation: payload, pending, success, error e invalidación de caché.
- Componentes: interacción, accesibilidad, validación, disabled y feedback.
- Constantes runtime/query keys: estructura estable, inclusión de filtros y ausencia de colisiones.
- Mappers/helpers: casos normales, límites y errores relevantes.
- Coverage global y por archivo debe respetar los thresholds ejecutables del consumidor; 100% de líneas sin branches útiles no reemplaza una prueba de riesgo.

## Contratos

Usar schemas reales de `@vigilioyonatan/bus-contracts` para request y response. Probar al menos:

- payload válido;
- payload inválido relevante;
- response válido;
- incompatibilidad contractual segura;
- ausencia de imports backend en el paquete.

## Componentes

Consultar en este orden:

1. `getByRole` con accessible name;
2. `getByLabelText`;
3. `getByText` para contenido no interactivo;
4. `data-testid` solo sin semántica estable.

Probar estados diferentes cuando existan: loading, refresh, empty, error, success, disabled, permisos y sesión expirada.

## Formularios

- Validación inválida y foco/mensaje asociado.
- Submit válido con request DTO exacto.
- Estado pending y prevención de doble envío.
- Error HTTP esperado.
- Éxito e invalidación de caché.

## Queries y mutations

No mockear internals de TanStack Query. Renderizar con un `QueryClient` aislado y handlers MSW deterministas.

- Query: loading + success + error/empty relevante.
- Mutation: payload + success + error + invalidación.
- Retry: controlarlo para que el test no sea lento o ambiguo.

## Ejemplo de matriz `list-users` / `register-user`

| Archivo | Prueba adyacente | Riesgo mínimo cubierto |
|---|---|---|
| `features/users/services/list-users.api.ts` | `features/users/services/list-users.api.test.ts` | query, auth/header, parse del response y contrato inválido |
| `features/users/hooks/list-users.hooks.ts` | `features/users/hooks/list-users.hooks.test.tsx` | query key, loading, success y error/empty |
| `features/users/pages/list-users.tsx` | `features/users/pages/list-users.test.tsx` | estados visibles y accesibilidad del listado |
| `features/users/services/register-user.api.ts` | `features/users/services/register-user.api.test.ts` | body POST, response válido y error contractual |
| `features/users/hooks/register-user.hooks.ts` | `features/users/hooks/register-user.hooks.test.tsx` | payload, pending, success, error e invalidación de `list-users` |
| `features/users/components/register-user.tsx` | `features/users/components/register-user.test.tsx` | Zod/RHF, submit, doble envío, error y éxito |
| `features/users/constants/users-query-keys.constants.ts` | `features/users/constants/users-query-keys.constants.test.ts` | keys estables, filtros completos y no colisión |

## Autenticación y uploads

Auth:

- sesión válida;
- expiración o `401`;
- logout y limpieza;
- token ausente en logs/error UI.

Uploads:

- MIME y tamaño;
- fallo al solicitar presigned URL;
- fallo durante upload;
- cancelación/feedback;
- no exponer URL o metadata sensible.

## Playwright

Mantener E2E pequeño y centrado en journeys críticos:

- carga del shell sin errores de navegador;
- navegación y guard relevante;
- formulario crítico;
- accesibilidad automática;
- headers en ambiente desplegado.

Capturar trace, screenshot y video como evidencia de fallo, no como sustituto de assertions.

## Visual regression

- Revisar snapshots antes de aprobarlos.
- Cubrir desktop y móvil cuando el layout cambie.
- Fijar datos, fuentes y animaciones.
- No usar visual testing para validar lógica.

## Flakiness

- Esperar condiciones observables.
- Controlar reloj, UUID y datos aleatorios.
- No compartir usuario mutable entre workers.
- Corregir causa; no aumentar retries o timeout por reflejo.

## Gates

```bash
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm test:visual
```

Ejecutar únicamente las capas relevantes durante desarrollo, pero mantener la matriz completa en CI según rutas y riesgo.

## Definition of Done

- El test habría fallado antes del cambio cuando cubre una regresión.
- No depende de orden, red real o sleeps.
- Usa queries accesibles.
- No filtra secretos o PII.
- Coverage y gates del repositorio se conservan.
- La prueba está colocada junto a la unidad cuando es unit/component/integration y su nombre permite identificar inmediatamente qué archivo protege.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).


## Amplitud de cobertura relacionada

Aplicar la [matriz extendida de escenarios](e2e-playwright.md) y seleccionar los controles relevantes por riesgo, sin convertir una lista de 2–3 ejemplos en cobertura total. ✅ Registrar evidencia por escenario; ❌ declarar ejecutado lo que solo se documentó.

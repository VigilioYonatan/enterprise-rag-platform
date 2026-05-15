# Buenas Practicas - `bus-impl` 2026

> **Regla vigente:** Zod y `z.output` comparten **un solo `*.dto.ts`**. No crear `*.validator.ts` en código nuevo; ejemplos históricos se conservan por trazabilidad. [Norma](../../../../../standards/api/http-dtos-and-contracts.md).


Este documento resume las reglas que deben mantenerse para que el backend actualizado siga siendo DDD de verdad y no solo por carpetas.

---

> **Convención constructor Vigilio 2026:** `private readonly productRepository` y `this.productRepository` son **camelCase** en NestJS; argumentos como `product_id` son `snake_case`. Los símbolos Zod públicos como `productSchema` conservan su nombre. [Norma canónica](../../../../../standards/engineering/naming-and-boundaries.md).

## 1. Regla de oro: el dominio no conoce frameworks

`domain/entities/` (comportamiento puro) no debe importar:

- `@nestjs/*`
- `zod`
- `drizzle-orm`
- `pg`
- `aws-sdk`
- `process.env`

**Excepción de ownership acordada:** `domain/schemas/*.schema.ts` sí usa Zod para representar datos estructurados propietarios sin introducir framework/infraestructura en `OrderEntity`. No mezclar `*.dto.ts` HTTP en Domain. [Norma vigente](../../../../../standards/api/http-dtos-and-contracts.md).

El dominio solo conoce:

- features
- servicios de dominio
- eventos de dominio
- interfaces de repositorio

---

## 2. Zod reemplaza a Joi

Regla:

- no crear schemas Joi nuevos
- toda validacion nueva se hace con Zod

Ubicaciones recomendadas:

- `shared/http/dto/` para entrada query HTTP; `shared/application/schemas/` para el contrato de salida reutilizable `createPaginatorDto`; `timestampSchema` en su owner
- `domain/schemas/` para schema propietario de entidad y tipos derivados `ProductSchema`
- `presentation/http/dto/` contiene contratos de entrada/salida con Zod + tipo inferido **juntos en cada DTO**; `domain/schemas/` posee los datos estructurales de entidad
- clases `createZodDto` de Nest/Swagger en el archivo hermano `*.request.doc.ts` o `*.response.doc.ts`
- `shared/infrastructure/http/pipes/` para `ZodPipe` y `ZodQueryPipe`
- `shared/infrastructure/persistence/drizzle/custom-types/` para tipos Drizzle reutilizables como `numericStringCustom` y `numericNumberCustom`
- `shared/infrastructure/config/environment.schema.ts` para variables de entorno validadas con Zod

Convencion recomendada:

- por acción crear únicamente los contratos necesarios: `*.request.dto.ts`, `*.response.dto.ts` y query/params cuando hagan falta; cada `*.dto.ts` expone Zod + tipo derivado. Respuestas iguales deben reutilizarse, no clonarse.
- ✅ `list-renovaciones.query.dto.ts` valida la consulta y deriva `ListRenovacionesQueryDto` en el mismo archivo.
- ✅ `register-renovacion.request.dto.ts` valida el body y expone su tipo en el mismo archivo.
- ✅ `change-renovacion-details.request.dto.ts` define la actualización semántica, con DTO tipo aparte.
- ✅ `renovacion.response.dto.ts` define la proyección compartida y su tipo derivado sin replicar campos.
- Crear `*.query.dto.ts`/`*.params.dto.ts` únicamente cuando la query/params requieren contrato separado; su schema vive en `*.query.dto.ts`/`*.params.dto.ts`. Crear `.doc.ts` solo para el adaptador NestJS/OpenAPI.
- todos los DTOs viven dentro de la carpeta de la feature para mantener alta cohesion; no van en carpetas globales por comodidad.

Convencion de metodos:

- ✅ Controllers y Application Services usan `listProducts`, `getProduct`, `registerProduct`, `changeProductDetails` o `removeProduct` según la operación. ❌ No imponer `index/show/store/update/destroy`, incluso si HTTP sigue siendo REST.
- para comandos de negocio, usar nombres semanticos (`approvePolicy`, `cancelOrder`, `activateSubscription`, `calculatePremium`) y mantener invariantes en dominio cuando corresponda.
- evitar sinonimos arbitrarios por gusto personal; un `operationId` publico estable solo cambia tras revision de compatibilidad.
- si existe `registerProduct()`, el caso `listProducts()` evalúa paginación según volumen y contrato.
- si una feature es catálogo pequeño, `listProducts()` puede no paginar si se documenta el límite.
- Controllers/Presenters exponen DTOs HTTP derivados (`ListRenovacionesResponseDto`); Application Services retornan modelos de dominio/lectura (`PageResult<T>`) sin importar DTO HTTP.
- `ResponseDocDto` existe solo como adaptador para `@ZodResponse` y Swagger; vive en `*.response.doc.ts` y nunca se exporta al frontend.

Uso:

- `schema.ts` define campos base como `id`, `nombre`, `estado`, fechas y reglas comunes
- los campos de objetos, DTOs, schemas y tablas usan `snake_case`: `nro_poliza`, `tipo_renovacion`, `broker_id`
- no usar `camelCase` en contratos de datos: evitar `nroPoliza`, `productType`, `idBroker`
- las FK siempre terminan en `_id`: `broker_id`, `poliza_id`, `cliente_id`
- los enums de datos van en minusculas: `inclusion`, `exclusion`, `pendiente`
- si hay paginacion, reutilizar `cursorPaginationQueryDto` con `cursor`, `offset`, `limit`, `search`, `sort_by`, `sort_dir`
- si hay response paginada, reutilizar `createPaginatorDto(itemSchema)`
- si hay fechas auditables, reutilizar `timestampSchema` con `created_at` y `updated_at`
- los schemas de entrada y salida viven en `presentation/http/schemas/*.schema.ts`, separados de tipos inferidos `presentation/http/dto/*.dto.ts`; Application solo recibe comandos/inputs propios.
- `.pick()`, `.omit()`, `.partial()` y `.extend()` de Request se declaran en `*.request.dto.ts`; el mismo `*.request.dto.ts` exporta Zod y el tipo inferido.
- `.pick()`, `.omit()`, `.partial()` y `.extend()` de Response se declaran en `*.response.dto.ts`; el mismo `*.response.dto.ts` exporta Zod y el tipo inferido.
- contratos estructurados de salida reutilizables pueden vivir en un owner compartido de Presentation, nunca duplicando el schema de entidad.
- no duplicar defaults de DB en DTOs; si Drizzle/PostgreSQL tiene `.default("active")`, no incluir ese campo en el `store.request.dto.ts`.
- usar `.default(...)` en DTO solo si el default forma parte del contrato HTTP documentado, no por comodidad de insert.
- en requests `registerProduct`, usar `nullable` solo cuando el negocio exige un `null` explícito; usar `optional` si la ausencia está permitida. No imponer una regla global indiscriminada.
- si la columna tiene default SQL, evaluar si `register-product.request.dto.ts` debe omitirla o exponer un default HTTP distinto; no duplicarlos inadvertidamente.
- utilizar `.optional()` también en cuerpo cuando la ausencia sea semánticamente válida; en `change-product-details.request.dto.ts` se aplica `.partial()` según PATCH.
- `@Body()` valida con `*.request.dto.ts` y `ZodPipe`; `*.request.dto.ts` exporta Zod y tipos
- `@Query()` valida con `*.query.dto.ts` y `ZodQueryPipe`
- `@Param()` valida con `*.params.dto.ts` si hay reglas de ruta específicas
- responses se validan/documentan con `*.response.dto.ts`, que también deriva sus tipos; `*.response.doc.ts` adapta OpenAPI/Scalar cuando corresponde y `@ZodResponse` es opt-in para validación/serialización runtime

Alta cohesion:

- todo lo relacionado a una funcionalidad vive en su carpeta de bounded context.
- un service solo inyecta repositorios/cache propios o services de otro modulo cuando quiere delegar una accion.
- `UserCache` pertenece a `UserService`; `AuthService` no debe manipularlo directamente.
- después de `registerProduct`, `changeProductDetails` o `removeProduct`, invalidar la caché afectada después de persistir; no hacer `.set()` optimista salvo excepción documentada.

Regla para decimales:

- dinero, primas, tasas regulatorias y saldos no deben convertirse a `number`.
- usar string decimal exacto, `Decimal` o enteros menores segun el dominio.
- `number` queda permitido solo para metricas, porcentajes no regulatorios o valores donde la perdida binaria sea aceptable.

---

## 3. Swagger y Scalar son adaptadores de infraestructura

Swagger no define el dominio. Solo genera el contrato HTTP.
Scalar tampoco define el dominio. Solo renderiza ese contrato con una UI mejor.

Por eso:

- `@ApiOperation`, `@ApiBody`, `@ApiResponse` viven en controllers
- `cleanupOpenApiDoc(...)` procesa el documento creado por `SwaggerModule.createDocument(...)`
- los `DocDto` de infraestructura adaptan los validadores/contratos Zod de `presentation/http/`
- Scalar debe consumir el mismo documento OpenAPI, no un contrato paralelo

El ejemplo ejecutable, incluido el perfil RRLL, vive en
[6. Ejemplos de codigo](../../http/references/6-ejemplos-codigo.md#51-caso-de-uso-rrll-con-decoradores-nestjs-y-zod).

---

## 4. Endpoints validados y auth explicita

Regla:

- todo endpoint valida `body`, `query` y `params` en la entrada.
- usar `ZodPipe` para body y `ZodQueryPipe` para query params.
- la validacion del endpoint no reemplaza la validacion de negocio del `domain/`.

Regla de autenticacion:

- preferir backend `private-by-default` con guard global.
- usar `@Public()` solo en endpoints que realmente deben saltar autenticacion.
- `@Public()` no es decoracion; debe estar conectado al guard real.

Casos tipicos de `@Public()`:

- `login`
- `register`
- `forgot-password`
- `health` o `ready` si el equipo decide exponerlos sin auth
- docs publicas si el entorno lo permite

❌ Incorrecto:
- dejar rutas publicas por omision
- usar `@Public()` por costumbre en endpoints internos
- confiar solo en validacion HTTP sin reglas de dominio

---

## 5. Un repositorio por aggregate root

❌ Incorrecto:
- un repositorio por tabla
- consultas SQL desperdigadas por services
- logica de negocio dentro del repositorio

Preferir:

- una interfaz por caso de uso/aggregate en `application/repositories/`
- una implementacion Drizzle en `infrastructure/persistence/drizzle/`

---

## 6. Application service delgado y dominio pragmatico

La capa `application/`:

- orquesta
- coordina transacciones
- llama al dominio solo cuando hay reglas reales
- publica eventos cuando corresponda

La capa `domain/`:

- modela estados y transiciones solo cuando la feature lo necesita
- decide reglas de negocio si existe comportamiento real de dominio

Para CRUD simple, no crear entities de dominio por obligacion. Es mejor un service claro usando DTOs Zod y un repository Drizzle que una clase vacia sin comportamiento real.

---

## 7. `schema.ts` de Drizzle no es entity de dominio

Regla:

- `src/product/infrastructure/persistence/drizzle/schema.ts` define tablas Drizzle, columnas, indices y enums de PostgreSQL.
- no llamarlo `product.entity.ts` si no representa una entidad de dominio con comportamiento.
- en este proyecto, CRUD simple usa `application/schemas/*.schema.ts` para contratos Zod y `infrastructure/persistence/drizzle/schema.ts` para persistencia.
- crear `domain/entities/product.entity.ts` solo si existe comportamiento real de negocio, por ejemplo transiciones, invariantes o reglas que viven fuera de HTTP/DB.

Por que:

- `entity.ts` en DDD comunica modelo de dominio.
- Drizzle `pgTable(...)` es mapping de persistencia, no comportamiento de negocio.
- renombrarlo a `product.entity.ts` puede confundir a devs y mezclar dominio con infraestructura.

Si el equipo quiere nombres mas explicitos para Drizzle, la alternativa sana seria `product.table.ts`, no `product.entity.ts`. Pero mantener `schema.ts` por feature es consistente con `user`, `product` y `product`.

---

## 8. Configuracion NestJS validada con Zod

Regla:

- `ConfigModule.forRoot({ isGlobal: true, validate })` centraliza el entorno.
- `src/shared/infrastructure/config/environment.schema.ts` valida variables con Zod.
- controllers, services, repositories, guards y providers leen config mediante `ConfigService`.
- `process.env` directo queda permitido solo en bootstrap de config, CDK, scripts y helpers fuera de Nest.
- `.env` es local; AWS debe inyectar variables por Lambda/CDK y secretos por Secrets Manager o SSM.
- production ignora `.env` para evitar configuracion accidental de maquina.

Esto hace mas facil:

- testear
- tipar
- detectar errores de boot
- separar local, development, staging y production

---

## 9. PostgreSQL real en integration tests

No se recomienda simular la base de datos en integration tests si el flujo depende de:

- constraints
- indices
- transacciones
- SQL generado por Drizzle

Unit tests si pueden usar dobles. Integration tests no deben mentir.

---

## 10. Playwright para smoke y flujos criticos

Aunque sea backend, Playwright si tiene valor cuando se usa para:

- probar Scalar o Swagger UI
- validar `/health` y `/ready`
- recorrer flujos criticos con `request.newContext()`
- verificar contratos publicados en entornos preview

---

## 11. Logging estructurado

Usar:

- `pino`
- `nestjs-pino`

Incluir siempre:

- `requestId`
- `correlationId`
- `tenant_id` en variables/datos. En NestJS, `constructor(private readonly tenantRepository: TenantRepository)` usa **camelCase** por ser dependencia inyectada.
- `user_id` si aplica
- `action` o `eventName`

No loguear:

- passwords
- tokens
- cookies
- payloads sensibles completos

Buenas practicas:

- `stdout` JSON como salida canonica en cloud
- `pino-pretty` solo en local
- usar redaction para `authorization`, `cookie`, `set-cookie`, `password`, `token`, `secret`
- si usas Nest, preferir `app.useLogger(app.get(Logger))` con `nestjs-pino`
- mantener `Logger` de `@nestjs/common` en servicios para no acoplar todo el codigo a una libreria concreta
- en workers, agregar `eventName`, `messageId`, `queue`, `retry_count` y contexto del bounded context
- no loguear bodies completos de requests salvo debugging muy controlado
- si hay error, loguear stack, clase de error y metadatos utiles, no ruido duplicado

❌ Incorrecto:
- `console.log` disperso
- mezclar logs texto y JSON en el mismo runtime
- pretty logs en `production`
- mandar PII a CloudWatch por costumbre

---

## 12. Handlers async explicitos

No volver al patron de:

```ts
controller[action](event)
```

Preferir:

```ts
const handlers = {
  productRegistrado: productRegistradoHandler,
  validarTrama: validarTramaHandler,
};
```

Beneficios:

- mejor tipado
- menor superficie de error
- trazabilidad mas clara

---

## 13. CDK con naming y tags centralizados

No hardcodear nombres de recursos en stacks sueltos.

Crear un modulo de naming y tags:

- `lib/config/naming.ts`
- `lib/tags/default-tags.ts`

Para que:

- el stage defina sufijos
- el equipo aplique FinOps y observabilidad consistente

---

## 14. No mezclar persistencia con DTOs HTTP

❌ Incorrecto:
- usar directamente la fila de Drizzle como response del controller
- reusar schema de DB como input HTTP sin filtro

Separar:

- schema DB
- DTO Zod de application
- entity de dominio solo si aporta comportamiento real
- respuesta HTTP final

---

## 15. Imports absolutos con TypeScript paths

Evitar imports relativos largos como:

```ts
import { setupTestDb } from '../../../helpers/setup-integration';
```

Preferir aliases estables:

```ts
import { setupTestDb } from '@tests/helpers/setup-integration';
```

Configuracion recomendada:

```json
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

- usar `@/` para codigo productivo dentro de `src`.
- usar `@tests/` solo en tests.
- no crear alias para cada carpeta pequena; demasiados aliases vuelven opaca la arquitectura.
- los imports dentro del mismo folder pueden seguir siendo relativos: `./schema`, `./constants`.
- `domain/` puede usar alias, pero no puede importar `application/` ni `infrastructure/`.
- mantener los mismos aliases en `tsconfig`, `vitest.config.ts`, `tsconfig-paths` o el bundler usado por Nest/Lambda.

---

## 16. Scripts canonicos

Todos los equipos deben hablar el mismo idioma:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm openapi:export`
- `pnpm cdk:synth`

---

## 17. Ramas, PRs y Jira

Buenas practicas:

- la rama debe describir tipo, ticket y cambio corto.
- el PR debe repetir el ticket de Jira en el titulo.
- cada commit debe repetir el mismo ticket de la rama.
- Husky valida localmente, pero CI debe validar otra vez.

Formato recomendado de rama:

```text
feat/ABC-123/crear-product
fix/ABC-456/corregir-openapi
hotfix/ABC-789/reintento-sqs
```

Regex recomendada:

```regex
^(feat|fix|hotfix|refactor|docs|test|ci|build|chore|perf)\/[A-Z][A-Z0-9]+-[0-9]+\/[a-z0-9-]+$
```

Titulo de PR recomendado:

```text
[ABC-123] - feat: Crear product
[ABC-456] - fix: Corregir contrato OpenAPI
```

Commit recomendado:

```text
[ABC-123] - feat: crear product
[ABC-456] - fix: corregir contrato openapi
```

Reglas:

- no abrir ramas como `feature/nuevo-cambio`, `bugfix/prueba` o `juan/cambio`.
- el ticket del PR y de los commits debe coincidir con el ticket de la rama.
- el ticket de Jira debe existir de verdad cuando el equipo tenga Jira integrado.
- si no hay ticket por una urgencia real, documentar la excepcion en el PR.

---

## 18. Gobierno de package manager y lockfile

Reglas:

- fijar `packageManager` exacto en `package.json`: `pnpm@11.7.0`.
- fijar `engines.node` y `engines.pnpm`.
- fijar `nodeVersion` exacto en `pnpm-workspace.yaml`.
- correr `pnpm install --frozen-lockfile` en CI.
- si cambia `packageManager`, `engines`, `nodeVersion` o `pnpm-lock.yaml`, pedir review de plataforma.

❌ Incorrecto:
- cambiar la version de `pnpm` por error local y subirlo sin explicacion.
- cambiar el lockfile sin revisar por que cambio.
- mezclar upgrade de runtime con cambio funcional en el mismo PR si no es necesario.

Preferir:

- PR dedicado para upgrade de `Node` o `pnpm`.
- changelog corto en el PR cuando cambia tooling base.
- etiqueta como `dependencies`, `platform` o similar para cambios de runtime.

---

## 19. `.npmrc` y registries privados

Reglas:

- `.npmrc` no guarda secretos hardcodeados.
- `.npmrc` seguro puede commitearse para scopes y registry, sin `_authToken`.
- en pnpm 11, settings fuertes de supply chain viven en `pnpm-workspace.yaml`.
- tokens privados van en `~/.npmrc`, variable de entorno o secreto de CI.
- `tokenHelper` solo en el `.npmrc` del usuario.

Ejemplo sano:

```ini
engine-strict=true
save-exact=true
package-manager-strict=true
strict-peer-dependencies=true
@vigilio-services:registry=https://npm.pkg.github.com
@vigilioyonatan:registry=https://npm.pkg.github.com
always-auth=true
```

La autenticacion vive en `~/.npmrc` o la agrega CI mediante
`vigilio-platform-actions/actions/configure-github-packages`.

CI debe tener:

```yaml
permissions:
  contents: read
  packages: read
```

Y en install:

```yaml
- run: pnpm install --frozen-lockfile
  env:
    GITHUB_PACKAGES_TOKEN: ${{ secrets.GITHUB_PACKAGES_TOKEN }}
```

Resultado: paquetes privados `@<organization>/*` no se instalan sin token
con permiso.

Si hay registry corporativo con CA privada:

- documentar `cafile` o `ca` por desarrollador.
- no commitear llaves o certificados sensibles en el repo de aplicacion.

## 20. Regla corta para revisar PRs

Un PR de `bus-impl` esta sano si cumple esto:

- respeta DDD
- valida con Zod
- documenta con Swagger y expone Scalar si aplica
- persiste con Drizzle
- prueba con Vitest o Playwright segun capa
- pasa Biome y typecheck
- no mete secretos ni `any`

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).


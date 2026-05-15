# Convenciones de nombres y fronteras — estándar transversal Vigilio

**Propietario:** `standards/engineering`. **Principio:** la semántica del negocio manda sobre la nomenclatura de un framework. Estas reglas aplican a nuevos desarrollos y refactors controlados; no autorizan renombrar contratos publicados ni columnas persistidas sin migración compatible. [DDD](../../foundations/architecture/ddd.md), [SOLID](../../foundations/architecture/solid.md), [SOLID en SQL/cache](solid-data-access.md), [versiones](../../technology/versions.md).

## Convención explícita

| Elemento | Regla | Ejemplo |
|---|---|---|
| Funciones y métodos propios | `camelCase`, **semánticos** | `listProducts()`, `getProduct()`, `registerProduct()`, `approvePolicy()`, `cancelOrder()` |
| Comportamiento del agregado | Verbo del dominio, sin transporte | `approve()`, `cancel()`, `activate()` |
| Puertos repositorio | Intención de consulta/persistencia | `findById()`, `findByCriteria()`, `save()`, `findForUpdate()` si hay concurrencia |
| Variables locales, argumentos y parámetros ordinarios | `snake_case` | `product_id`, `tenant_id`, `current_user` |
| **Propiedades inyectadas por constructor (TypeScript/NestJS)** | **`camelCase` obligatorio** | `productRepository`, `policyService`, `eventPublisher` |
| Campos de schemas/DTO/JSON/eventos/SQL | `snake_case` | `nro_poliza`, `product_type`, `event_id`, `sort_by` |
| Clases, interfaces, tipos y enums | `PascalCase` | `ProductService`, `ProductSchema`, `OrderStatus` |
| Constantes inmutables globales | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE`, `CACHE_TTL_SECONDS` |
| Archivos fuente | `kebab-case` cuando el ecosistema lo permita | `register-product.request.dto.ts` |

**Regla de constructores (acuerdo explícito):** en TypeScript/NestJS las dependencias declaradas con `constructor(private readonly ...)` son **`camelCase`**, y la referencia `this.productRepository` usa el mismo nombre; por ejemplo `private readonly productRepository: ProductRepository`. Aplica también a dependencias `@Inject(TOKEN)`. La identidad de una dependencia es una propiedad de clase inicializada por DI, no un campo de contrato JSON. Los demás parámetros de métodos y variables temporales propios siguen `snake_case`: `getProduct(product_id: ProductSchema['id'])`. No renombrar automáticamente propiedades de modelos externos, campos `snake_case` del dominio, parámetros de `FormRequest` Laravel ni bindings de frameworks. En PHP/Laravel se mantiene la convención PHP `$product_repository` acordada para DTOs/propiedades, sin imponer una nueva migración por el ejemplo TypeScript.

**Nombre del tipo inferido (acuerdo definitivo):** cuando Zod define datos estructurados de una entidad, `export type ProductSchema = z.infer<typeof productSchema>` y `CategorySchema`, `UserSchema`, `OrderSchema` para sus equivalentes. `ProductSchema['id']` permite reutilizar identificadores, mientras `ProductEntity` sigue nombrando al agregado con comportamiento DDD. `ProductSchema` **no es** el objeto validador Zod: para su tipo runtime se usa `typeof productSchema`. No reescribir clases `Product` de dominio ni tipos de terceros; un renombre de un paquete publicado exige migración de exports/versionado y pruebas de consumidores.

**Entradas HTTP:** `*.query.dto.ts`, `*.request.dto.ts`, `*.params.dto.ts` son Zod en la frontera; `*.dto.ts` contiene el contrato Zod y el tipo `z.output`/`z.infer`. `*.response.dto.ts` define el validador de salida, distinto del schema de entidad; Drizzle se queda en `*.table.ts`. [Norma canónica](../api/http-dtos-and-contracts.md). No crear alias trivial `OrderStatus`: usar `OrderSchema['status']` directamente cuando el schema es dueño del estado y `OrderEntity.cancel()` como método de dominio.

**Nombres públicos de schemas Zod:** `productSchema` es el modelo estructurado Zod; `listProductsResponseDto` y `createPaginatorDto` son símbolos exportados de validación HTTP, en `camelCase`; los nombres anteriores requieren compatibilidad/versionado y por la nomenclatura ya acordada. No confundir esos símbolos con variables locales (`product_id`) ni con propiedades de JSON (`product_type`). Cambiarlos exigiría migrar imports/exports de todos los consumidores.

**Ejemplo NestJS:**

```typescript
@Injectable()
export class ProductService {
  constructor(private readonly productRepository: ProductRepository) {}

  async getProduct(product_id: ProductSchema['id']): Promise<ProductSchema> {
    const product = await this.productRepository.findById(product_id);
    if (!product) throw new ProductNotFoundError();
    return product;
  }
}
```

**✅ Correcto:** `productRepository` al declarar una dependencia en constructor y `product_id` como argumento de `getProduct()`. **❌ Incorrecto:** `constructor(private readonly product_repository: ProductRepository)` en NestJS o cambiar por accidente el nombre SQL `product_id` por `productId`.

**Excepción:** nombres exigidos por terceros (`toArray`, lifecycle de framework, `where`, APIs externas), protocolos ya publicados, migraciones históricas y reglas del lenguaje. No renombrar una API externa por estética. Los métodos HTTP de un controller propio pueden llamarse `listProducts()` aunque la ruta siga siendo REST `GET /products`.

✅ **Correcto:** `ProductController::registerProduct()` → `ProductService::registerProduct()` → `Product::register()/activate()` cuando existe transición → `ProductRepository::save()`; tipos derivados de contrato y atributos de payload homogéneos.

❌ **Incorrecto:** imponer `index/show/store/update/destroy` como casos de uso, llamar `update()` a cancelar una póliza, fusionar reglas compartidas con código NestJS/Laravel, cambiar nombres de campos JSON sin versión/compatibilidad.

## Separación y DRY real

1. **Una fuente por entidad:** `product.schema.ts` no declara `categorySchema`; compone o importa lo necesario. Laravel usa enums/DTO/validador propietario por entidad sin imitar literalmente Zod.
2. **Tipo sin frontera no exige schema runtime nuevo:** composición de tipos derivados para consultas internas; schemas derivados `.pick()`, `.omit()`, `.extend()` cuando hay frontera de validación/documentación.
3. **Request distinto de input de caso de uso:** HTTP valida entrada, controller adapta a un comando; Application no importa clases HTTP y Domain no importa ORM.
4. **Response reutilizable por forma pública:** si `getProduct` y `registerProduct` devuelven los mismos campos, compartir `ProductResponseDto`. Nunca serializar toda entidad por mera anotación TS.
5. **Paginación común** por modo (cursor/offset), criterios de sort/filtros por feature, autorización y tenant obligatorios, no mezclar `cursor` con `offset` a ciegas.
6. **Cache keys** incluyen tenant, ámbito de autorización, filtro normalizado y versión/generación de invalidación; la invalidación se prueba después de mutaciones.
7. **Bulk SQL** reutiliza la norma [SQL Performance](../data/sql-performance.md); el tamaño del lote se mide, no se codifica como dogma.
8. **Mismos principios, lenguajes separados:** [NestJS](../../stacks/backend/nestjs/architecture/schema-derived-types.md) y [Laravel](../../stacks/backend/laravel/architecture/typed-domain-and-ports.md). La norma compartida no contiene implementaciones mixtas.

## Gate de cambio verificable

- Inventariar archivos de origen y contratos publicados; clasificar cada renombre **interno vs externo**; renombrar externo solo con estrategia compatible.
- Comparar tests de políticas de transición, controller rutas y JSON, puertos de repositorio y SQL real, migraciones, consultas autorizadas, claves caché, consumidores frontend/mobile y eventos.
- Ejecutar grep dirigido a DTO CRUD y a uniones hardcodeadas, pero revisar **contexto**: `update()` del ORM, `index` de arreglo, `store` de frontend y ADR históricos **no** son faltas.
- Gate: `PASS | FAIL | NOT_RUN | BLOCKED`; un validador Markdown no prueba integración SQL ni autorización.


## Cliente web/móvil: mismo caso de uso, misma semántica

La convención DDD atraviesa backend, cliente HTTP y hooks:
`ProductController.listProducts()` → `ProductService.listProducts()` →
`listProductsApi()` → `useListProductsQuery()` → `productsQueryKeys.list(query)`.
Para altas: `registerProduct()` → `registerProductApi()` → `useRegisterProductMutation()`.
No convertir automáticamente una acción de negocio en `update()` / `destroy()`: nombrar
`approvePolicy`, `cancelOrder`, `changeProductDetails` o `removeProduct` según su regla real,
autorización, idempotencia y semántica de persistencia.

**✅ Correcto:** conservar HTTP `GET /products` y `POST /products` mientras cambian
solo nombres internos y archivos fuente; migrar exports de paquetes publicados bajo
versión controlada y ejecutar tests de consumidores.

**❌ Incorrecto:** publicar ejemplos frontend/mobile `productsIndexApi()` después de haber
prohibido `index()` como caso de uso en backend; reemplazar a ciegas `index.ts`,
`Array#index`, métodos de terceros o nombres contractuales históricos.

Ver [frontend web](../../stacks/frontend/web-mfe/contracts/1-contratos-dtos-zod-tanstack.md#compatibilidad-de-contratos-publicados-gate-obligatorio)
y [móvil](../../stacks/mobile/expo/contracts/1-contratos-zod-formularios-tanstack.md#compatibilidad-de-contratos-publicados-gate-obligatorio).

## Gate de revisión DDD y nombres (sin falsos positivos)

1. Revisar **todas las guías fuente** y las skills, no dar por satisfechos los controles porque pasan links Markdown; distinguir código nuevo, ejemplos ❌, documentación histórica y API de terceros.
2. Detectar constructores TS `private readonly *_*` y corregirlos junto con `this.*`; comprobar que `@Inject(TOKEN)` mantenga su token y que el service siga siendo testeable.
3. Detectar variables locales/argumentos nuevos `productId`, `tenantId`, `currentUser` y sustituirlos por `product_id`, `tenant_id`, `current_user`, salvo nombres impuestos por contratos publicados o librerías externas.
4. No cambiar `productSchema`, `categorySchema`, `createPaginatorDto` ni exports de terceros en la misma migración; verificar imports y typecheck de consumidores antes de renombrar símbolos públicos.
5. Buscar prescripciones `index/show/store/update/destroy`, schemas de requests dentro de `product.schema.ts`, uniones de estados en entidades, paginadores anónimos y DTOs que duplican schemas. Corregir el **contenido normativo**, preservar el contexto histórico y documentar compatibilidad.
6. Ejecutar `validate-docs`, `validate-guidance`, `validate-workflows`, comprobación SHA del snapshot npm, instalación aislada de perfiles y build-site. Clasificar compilaciones y E2E no ejecutados como **NOT_RUN**, nunca PASS.



## Convención explícita de HTTP vs datos — revisión posterior

- `*.schema.ts` define un modelo estructurado propietario (por ejemplo `userSchema`, tipo `UserSchema`). **No equivale automáticamente a una tabla SQL**; la tabla es `*.table.ts` y sus migraciones.
- `*.dto.ts` en Presentation/Shared HTTP contiene la regla de entrada o salida para body, query, params y responses JSON.
- `*.dto.ts` reúne Zod y tipo derivado (`z.output<typeof registerUserRequestDto>`), sin `z.object`, `.pick`, ni clases de frameworks.
- `*.doc.ts` es optativo, solo adaptador OpenAPI de NestJS; no exportarlo a web/mobile.
- `OrderSchema['status']` evita repetir uniones literales; `OrderEntity.cancel()` maneja invariantes mientras `OrderService.cancelOrder()` orquesta.
- Laravel usa FormRequest/Spatie Data (DTOs PHP) y Eloquent/migrations (SQL); React/Expo consumen el validator browser-safe + DTO, Angular lo hace por DI/HttpClient si comparte contracts.
- Si un export actual de `@vigilioyonatan/bus-contracts` aún usa `*Schema`, no inventar que ya fue migrado: migración coordinada y aliases de compatibilidad antes de cambiar imports de consumidores.

## Decisión posterior: DTO HTTP único y tipos indexados sin alias triviales

Un `*.dto.ts` es dueño del objeto Zod (por ejemplo `listProductsQueryDto`) y del tipo inferido `ListProductsQueryDto`; no crear `*.validator.ts` paralelo ni declarar Zod HTTP dentro de `product.schema.ts`. Preferir `ProductSchema['id']`, `ProductSchema['estado']` y `ProductSchema['product_type']` **directamente** sobre alias `ProductId`/`ProductStatus`/`ProductType` si no aportan identidad adicional. Los enums PHP Laravel son objetos de dominio reales, no alias TypeScript triviales. `pgEnum()` puede referenciar `productSchema.shape.product_type.options` y `.estado.options`.

✅ **Correcto:** una fuente para estados, un DTO HTTP por contrato, DI `productRepository` en camelCase. ❌ **Incorrecto:** duplicar uniones, declarar que el tipo DTO valida sin ejecutar Zod o generar archivos extra sin responsabilidad.

## Reglas obligatorias contra Abreviaturas, Variables de una letra, Uniones `| string` y Alias Triviales (Backend y Frontend)

### 1. Prohibido usar abreviaturas en constantes, DTOs, schemas, clases, métodos y variables

Todo nombre de constante (`UPPER_SNAKE_CASE`), schema/DTO (`camelCase` / `PascalCase`), tipo interno o variable local debe escribirse con **palabras completas y semánticas**. Quedan prohibidas las abreviaturas ambiguas (`DOC`, `DOCS`, `KB`, `EMBED`, `CHARS`, `EVAL`, `CFG`, `CTX`, `RES`, `VAL`, `QC`) y las variables o parámetros de callback de una sola letra (`q`, `m`, `a`, `d`, `o`, `e`, `u`, `s`, `r`, `c`, `n`, `t`).

```typescript
// ❌ INCORRECTO (Cómo NO debe ser): Constantes, DTOs, tipos y variables abreviadas o de una letra
export const DEFAULT_EMBED_MODEL = 'nomic-embed-text';
export const EMBED_TIMEOUT_MS = 10_000;
export const MIN_DOC_TITLE_LENGTH = 1;
export const CHUNK_MAX_CHARS = 4000;
export const DOCS_POLL_INTERVAL_MS = 3000;
export const MIN_KB_NAME_LENGTH = 2;

export const kbQuery = z.object({ organization_id: z.string().uuid() });
export type KbQueryDto = z.infer<typeof kbQuery>;
export const evalSuiteFormSchema = z.object({ name: z.string().min(2) });
type EvalClaim = { id: string };

const qc = useQueryClient();
const q = useQuery({ queryKey: ['agents'], queryFn: listAgents });
const m = useMutation({ mutationFn: createAgent });
const c = this.getOAuthConfig(provider);
const list = items.map((a) => a.name);
<input onChange={(e) => setName(e.target.value)} />
```

```typescript
// ✅ CORRECTO (Cómo debe ser): Nombres semánticos completos sin abreviaturas en Backend y Frontend
export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';
export const EMBEDDING_TIMEOUT_MS = 10_000;
export const MIN_DOCUMENT_TITLE_LENGTH = 1;
export const CHUNK_MAX_CHARACTERS = 4000;
export const DOCUMENTS_POLL_INTERVAL_MS = 3000;
export const MIN_KNOWLEDGE_BASE_NAME_LENGTH = 2;

export const knowledgeBaseQueryDto = z.object({ organization_id: z.string().uuid() });
export type KnowledgeBaseQueryDto = z.infer<typeof knowledgeBaseQueryDto>;
export const evaluationSuiteFormSchema = z.object({ name: z.string().min(2) });
type EvaluationClaim = { id: string };

const queryClient = useQueryClient();
const agentsQuery = useQuery({ queryKey: ['agents'], queryFn: listAgents });
const createAgentMutation = useMutation({ mutationFn: createAgent });
const oauth_config = this.getOAuthConfig(provider);
const list = items.map((agent) => agent.name);
<input onChange={(event) => setName(event.target.value)} />
```

### 2. Prohibido usar `| string` junto a tipos indexados de Schema o `Partial<Omit<Schema, ...>>` redundantes

Cuando un campo proviene de un schema Zod (`ApprovalSchema['status']`, `MembershipSchema['role']`, `RunSchema['status']`, `WorkflowNode['type']`), **jamás** se debe concatenar `| string` ni usar `string` suelto, ya que destruye la validación estática del compilador TypeScript. Tampoco se debe construir `Pick<Schema, K> & Partial<Omit<Schema, K>>` para reescribir todo el schema; se debe especificar explícitamente `Partial<Pick<Schema, CamposOpcionales>>` o usar directamente el tipo del schema propietario.

```typescript
// ❌ INCORRECTO (Cómo NO debe ser): Unión laxa con `| string` e intersección `Partial<Omit<...>>` redundante
export interface ChangeMemberRoleInput {
  organization_id: string;
  user_id: string;
  role: MembershipSchema['role'] | string; // ❌ Anula el enum estricto convirtiéndolo en `string`
}

export type ApprovalRecord = Pick<
  ApprovalSchema,
  'id' | 'organization_id' | 'run_id' | 'requested_by' | 'status' | 'expires_at' | 'reason'
> &
  Partial<
    Omit<
      ApprovalSchema,
      'id' | 'organization_id' | 'run_id' | 'requested_by' | 'status' | 'expires_at' | 'reason'
    >
  >;
```

```typescript
// ✅ CORRECTO (Cómo debe ser): Tipos indexados estrictos del Schema propietario (`Schema['campo']`)
export interface ChangeMemberRoleInput {
  organization_id: OrganizationSchema['id'];
  user_id: UserSchema['id'];
  role: MembershipSchema['role']; // ✅ Solo permite 'owner' | 'admin' | 'builder' | 'operator' | 'viewer'
}

export type ApprovalRecord = Pick<
  ApprovalSchema,
  'id' | 'organization_id' | 'run_id' | 'requested_by' | 'status' | 'expires_at' | 'reason'
> &
  Partial<Pick<ApprovalSchema, 'decided_by' | 'decided_at' | 'created_at'>>;
```

### 3. Prohibido crear Alias Triviales (`export type A = B`, `export const a = b`) en Schemas, Puertos o Frontend

Cada símbolo tiene **un único nombre canónico (SSOT)**. Queda prohibido reasignar un schema, DTO o tipo de dominio a otro nombre igual con diferente identificador tanto en el backend como en el frontend.

```typescript
// ❌ INCORRECTO (Cómo NO debe ser): Alias triviales que duplican nombres para el mismo contrato
// En DTOs / Schemas:
export const chatAnswerSchema = answerResultSchema;
export type ChatAnswerSchema = AnswerResultSchema;

// En Puertos de Repositorio (Backend):
export type OAuthState = OAuthStateRecord;
export type StoredConnection = StoredConnectionRecord;
export type ConnectedAccount = ConnectedAccountRecord;
export type ConnectionInput = SaveConnectionInput;
export type MemberRole = MembershipSchema['role'];

// En api-client.ts (Frontend):
export type Org = OrganizationResponseDto;
export type Agent = AgentResponseDto;
export type Page<T> = PaginatedResult<T>;
```

```typescript
// ✅ CORRECTO (Cómo debe ser): Importar y consumir directamente el símbolo propietario sin renombrarlo
import { answerResultSchema, type AnswerResultSchema } from '../../domain/schemas/answer.schema';
import type {
  OAuthStateRecord,
  StoredConnectionRecord,
  ConnectedAccountRecord,
  SaveConnectionInput,
} from '../../domain/types/integration.type';
import type {
  OrganizationResponseDto,
  AgentResponseDto,
  PaginatedResult,
} from '@enterprise-agents/contracts';
```


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Llamar UserService a clase que hace pagos, emails y auditoría
- **❌ Incorrecto**: Llamar UserService a clase que hace pagos, emails y auditoría.
- **✅ Correcto**: Casos de uso/roles específicos y owner por contexto.

### 02. Colocar HASH_OPTIONS en método cuando es política compartida
- **❌ Incorrecto**: Colocar HASH_OPTIONS en método cuando es política compartida.
- **✅ Correcto**: Config de auth feature con nombre semántico, temporales sí locales.

### 03. Exportar types desde shared/types.ts sin consumidores claros
- **❌ Incorrecto**: Exportar types desde shared/types.ts sin consumidores claros.
- **✅ Correcto**: Types por feature y reexport de contrato publicado.

### 04. Generar repositorio por tabla aun para solo lectura simple
- **❌ Incorrecto**: Generar repositorio por tabla aun para solo lectura simple.
- **✅ Correcto**: Límite de datos por necesidad de dominio y queries.

### 05. Usar un archivo constants.ts con 400 constantes de cinco módulos
- **❌ Incorrecto**: Usar un archivo constants.ts con 400 constantes de cinco módulos.
- **✅ Correcto**: Configuración por feature, valores por ámbito y pruebas de imports.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

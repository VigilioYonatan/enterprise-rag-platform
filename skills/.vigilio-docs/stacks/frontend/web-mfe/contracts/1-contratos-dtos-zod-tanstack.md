# Contratos DTO, Zod, React Hook Form Y TanStack

Fuentes ejecutables: package de contratos del backend owner y gates `governance:contracts`/OpenAPI del consumidor.

| Perfil | Fuente backend | Package | Consumer |
|---|---|---|---|
| `current-web` | `bus-impl/packages/contracts` | `@vigilioyonatan/bus-contracts` | `web-mfe` |
| `k8s-v2` | `bus-impl-v2/packages/contracts` | `@vigilioyonatan/bus-v2-contracts` | `web-mfe-v2` |

## Objetivo

Consumir en frontend los contratos HTTP definidos por el backend owner del perfil sin copiar DTOs y manteniendo validacion runtime en el navegador.

```text
*.request.dto.ts
  -> payload de formulario/query/mutation

*.response.dto.ts
  -> validacion de respuesta HTTP

*.request.doc.ts / *.response.doc.ts
  -> solo NestJS/OpenAPI; prohibido en frontend
```

El package exacto se resuelve por la tabla anterior. Debe contener solo Zod, tipos inferidos y modulos browser-safe. Cruzar package/owner/consumer produce `CONTRACT_OWNER_MISMATCH`.

## React Hook Form

La aplicación configura el locale oficial de Zod 4.4 una sola vez en el bootstrap:

```typescript
// services/validation/zod-locale.ts
import { z } from 'zod';

z.config(z.locales.es());
```

La carga se hace antes de montar la aplicación y también en el setup de Vitest. Por eso un error
como `Too small: expected string to have >=12 characters` se muestra como:
`Demasiado pequeño: se esperaba que texto tuviera >=12 caracteres`.
Los mensajes personalizados definidos explícitamente en un schema no son reemplazados por el locale.

Usar el request schema publicado como resolver y su tipo inferido como modelo del formulario. 

> [!IMPORTANT]
> **Regla Principal (Caso Estándar):** En la gran mayoría de los casos **NO SE CREARÁ** un schema local de formulario manual como `const registerProductFormSchema = z.object({ ... })`.
> 
> En su lugar, se importa y utiliza directamente el `requestDto` (y su schema Zod) publicado desde el package de la fila contractual seleccionada.
> 
> Únicamente en situaciones excepcionales donde el input UI requiera una transformación estructural compleja antes del submit, se crearía un schema local intermedio con su respectivo mapper hacia el DTO publicado.

En este proyecto se usa `nullableZodResolver` como adapter local para convertir controles vacíos del navegador en `null` antes de delegar al resolver oficial de Zod:

```typescript
import {
  registerProductRequestDto,
  type RegisterProductRequestDto,
} from '@vigilioyonatan/bus-v2-contracts'; // Perfil k8s-v2; current-web usa bus-contracts
import { useForm } from 'react-hook-form';
import { nullableZodResolver } from '@/services/forms/nullable-zod-resolver';

// MAYORMENTE SERÁ ASÍ: Consumo directo del contrato DTO publicado
const register_product_form = useForm<RegisterProductRequestDto>({
  mode: 'onChange',
  reValidateMode: 'onChange',
  resolver: nullableZodResolver(registerProductRequestDto),
});
```

Reglas:

- No crear manualmente `const xSchema = z.object({ ... })` cuando el DTO ya fue publicado en el paquete de contratos.
- No usar response DTO como schema de formulario.
- Respetar `nullable`, `optional`, defaults y coerciones del contrato.
- No crear otra interface ni schema espejo para los mismos campos.
- Reglas exclusivamente visuales pueden vivir en frontend; no reemplazan validacion/autorizacion backend.

### Normalizacion `""` a `null`

`nullableZodResolver` ejecuta esta secuencia por cada validacion de React Hook Form:

```text
valores del formulario -> normalizacion recursiva -> schema Zod -> errores RHF
```

Implementación compartida y prueba adyacente:

```text
apps/{dominio-o-producto}/{aplicacion}/src/services/forms/
|-- nullable-zod-resolver.ts
`-- nullable-zod-resolver.test.ts
```

- `""` se convierte en `null` antes de validar.
- Arrays y objetos planos se recorren recursivamente.
- `File`, `Blob`, `Date` y otras instancias se preservan.
- El estado visual del `<input>` sigue siendo `""`; no se escribe `null` en el control.
- Un campo requerido que no acepta `null` sigue fallando, correctamente.
- El dato recibido por `handleSubmit` ya es el resultado validado por Zod.
- No copiar el parser interno de `@hookform/resolvers`; el adapter solo normaliza y delega.

No usar `z.preprocess` directamente con `useForm` para este caso: en Zod 4 puede convertir el
input del resolver en `unknown` y romper la inferencia de React Hook Form. La conversion queda
aislada en el boundary tipado del adapter.

## Derivación de tipos sin duplicación

Los tipos HTTP vienen del package contractual resuelto. No volver a escribir un DTO, schema,
enum o interface con los mismos campos. Cuando la UI necesita una proyección, derivarla:

```typescript
import type {
  UserPublicSchema,
  RegisterUserRequestDto,
} from '@vigilioyonatan/bus-v2-contracts'; // Perfil k8s-v2; current-web usa bus-contracts

type UserRow = Pick<
  UserPublicSchema,
  'id' | 'email' | 'full_name' | 'status'
>;

type RegisterUserFormProps = {
  defaults?: Partial<Pick<RegisterUserRequestDto, 'role' | 'status'>>;
};

type UserRowWithActions = UserRow & {
  onEdit: (id: UserRow['id']) => void;
};
```

Usar `Pick`, `Omit`, `Partial`, `Readonly` e intersecciones (`A & B`) para props, rows,
ViewModels y composiciones type-only. `interface X extends Y` también es válido cuando expresa una
relación clara; no usar herencia para esconder campos repetidos.

Si la UI recibe datos externos nuevos, `Pick<>` u `Omit<>` no validan runtime. La respuesta debe
seguir teniendo un `response.dto.ts`/schema Zod en el backend owner del perfil, y el frontend debe importar ese
schema publicado. Cuando la UI solo necesita formatear presentación, consumir el campo contractual
directamente:

```typescript
type ProductRow = ListProductsResponseDto['results'][number];

function formatProductPrice(product: ProductRow): string {
  return formatMoney(product.precio);
}
```

No crear `UserTest`, `ProductType`, `UserDto` ni campos como `formattedPrice` repitiendo o
transformando datos del backend dentro del objeto de respuesta. Crear un ViewModel solo cuando
exista una composición real de UI que no pueda expresarse en la presentación; derivarlo con
`Pick`/`Omit` y probar el mapping.

### Prohibición de Alias Triviales en `api-client.ts` y de Abreviaturas en Componentes/Hooks

```typescript
// ❌ INCORRECTO (Cómo NO debe ser en el Frontend):
// 1. Re-exportar alias cortos en api-client.ts o schemas.ts:
export type Org = OrganizationResponseDto;
export type Agent = AgentResponseDto;
export type Page<T> = PaginatedResult<T>;
export const workflowNodeSchema = workflowGraphSchema.shape.nodes.element;

// 2. Constantes, schemas y variables de 1 o 2 letras abreviadas:
export const DOCS_POLL_INTERVAL_MS = 3000;
export const MIN_KB_NAME_LENGTH = 2;
export const evalSuiteFormSchema = z.object({ ... });
const qc = useQueryClient();
const q = useQuery({ queryKey: ['agents', orgId], queryFn: () => api.listAgents(orgId) });
const m = useMutation({ mutationFn: api.createAgent });
{q.data?.results.map((a) => <div key={a.id}>{a.name}</div>)}
```

```typescript
// ✅ CORRECTO (Cómo debe ser en el Frontend):
// 1. Importar directamente los DTOs y Schemas canónicos desde el paquete de contratos:
import type {
  AgentResponseDto,
  OrganizationResponseDto,
  PaginatedResult,
  WorkflowNode,
} from '@enterprise-agents/contracts';

// 2. Nombres semánticos completos sin abreviaturas en constantes, schemas, queries, mutations y callbacks:
export const DOCUMENTS_POLL_INTERVAL_MS = 3000;
export const MIN_KNOWLEDGE_BASE_NAME_LENGTH = 2;
export const evaluationSuiteFormSchema = z.object({ ... });
const queryClient = useQueryClient();
const agentsQuery = useQuery({
  queryKey: ['agents', organization_id],
  queryFn: () => api.listAgents(organization_id),
});
const createAgentMutation = useMutation({ mutationFn: api.createAgent });
{agentsQuery.data?.results.map((agent) => <div key={agent.id}>{agent.name}</div>)}
```

## Borde HTTP

El dato de red comienza como `unknown`. Para APIs propias controladas se puede **tipar sin parse runtime**
usando el contrato publicado por el backend y verificaciones de contrato en CI:

```typescript
// features/products/services/list-products.api.ts
export function listProductsApi(query: ListProductsQueryDto): Promise<ListProductsResponseDto> {
  return apiClient.requestJson<ListProductsResponseDto>({ path: '/products', query });
}
```

El cliente HTTP debe verificar status y normalizar errores; el generic no inspecciona el JSON.
La asercion tipada se considera frontera de confianza, NO validacion runtime.
Para respuestas de terceros, alto riesgo o cambios sin contrato coordinado, agregar
`responseSchema: listProductsResponseDto` y validar una vez dentro de `ApiClient` cuando el
cliente instalado soporte esa opcion. Nunca parsear repetidamente en cada componente.
Un desajuste se detecta con tests de contrato/OpenAPI diff o, cuando se habilita, validacion
runtime y telemetria sanitizada.

## TanStack Query

El `queryFn` retorna datos tipados por contrato (y validados runtime solo si el boundary lo configura):

```typescript
const products_query = useQuery({
  queryKey: ['products', filters],
  queryFn: () => listProductsApi(filters),
  staleTime: 30_000,
});
```

- La key incluye todo filtro que cambia el resultado.
- No copiar server state a Zustand/signals.
- `select` transforma datos tipados; no presupone que hubo parse runtime.
- Retry solo para operaciones idempotentes y errores recuperables.

## TanStack Mutation

```typescript
const query_client = useQueryClient();
const register_product_mutation = useMutation({
  mutationFn: (input: RegisterProductRequestDto) => registerProductApi(input),
  onSuccess: async () => {
    await query_client.invalidateQueries({ queryKey: productsQueryKeys.lists() });
  },
});
```

- Payload tipado por request DTO.
- Response validado por response DTO.
- Invalidacion/actualizacion de cache explicita.
- Optimistic update solo con rollback determinista.
- No reintentar escrituras sin idempotencia.

## Convención API, hook y componente

```text
features/users/services/list-users.api.ts
  -> features/users/hooks/list-users.hooks.ts
    -> features/users/pages/list-users.tsx

features/users/services/register-user.api.ts
  -> features/users/hooks/register-user.hooks.ts
    -> features/users/components/register-user.tsx
```

- `*.api.ts` importa contratos, ejecuta HTTP y valida responses.
- `*.hooks.ts` importa la API y configura `useQuery`/`useMutation`.
- El componente importa el hook y controla React Hook Form, accesibilidad y estados visibles.
- Una mutation exitosa invalida las query keys relacionadas; `register-user` invalida `list-users`.
- Cada archivo runtime tiene una prueba adyacente con el mismo nombre base, incluidas las factories de query keys en `constants/`.

## Componentes

Los componentes reciben datos validados o un ViewModel:

```typescript
type ProductListItem = ListProductsResponseDto['results'][number];

interface ProductCardProps {
  readonly product: ProductListItem;
}
```

Crear un ViewModel solo si la UI combina datos de varias fuentes o necesita un modelo de interacción
propio. Formatear `precio`, fechas y labels en la celda/componente sin agregar campos al response.

## TanStack Table

```typescript
type ProductRow = ListProductsResponseDto['results'][number];

const columns: ColumnDef<ProductRow>[] = [
  { accessorKey: 'nombre', header: 'Producto' },
  {
    accessorKey: 'precio',
    header: 'Precio',
    cell: ({ getValue }) => formatMoney(getValue<string>()),
  },
];
```

- La tabla consume tipos del response.
- Las columnas no llaman HTTP ni mutan cache.
- Dinero exacto permanece `string`; presentacion lo formatea sin perder precision.
- Sorting/filtering server-side se expresa mediante request/query DTOs.
- Virtualizar solo con volumen medido.

## Desarrollo y produccion

```bash
# bus-impl
pnpm dev:contracts

# web-mfe
pnpm dev
```

El link local permite feedback rapido, pero CI/produccion debe instalar una version exacta publicada. Nunca depender de rutas hermanas en un pipeline independiente.

## Gates

```bash
pnpm governance:contracts
pnpm typecheck
pnpm test
pnpm build
pnpm bundle:budget
```

El bundle debe rechazar `nestjs-zod`, `@nestjs/`, `node:` y adaptadores `*.doc.ts`.

## No hacer

- Copiar DTOs a `libs/contracts`.
- Definir interfaces espejo del backend.
- Confiar solo en TypeScript para datos de red.
- Importar el barrel backend completo esperando que tree-shaking elimine NestJS.
- Parsear response en JSX.
- Enviar credenciales de Grafana/CloudWatch desde el browser.

## Documentos relacionados

- [Arquitectura y ownership de estado](../architecture/3-arquitectura-estructura-estado.md).
- [Integración BFF, HTTP y autenticación](../http/5-bff-http-runtime-auth.md).
- [Golden path de feature](../features/6-golden-path-feature-componentes-hooks.md).
- [Testing](../testing/7-testing-vitest-msw-playwright.md).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).



## Compatibilidad de contratos publicados (gate obligatorio)

Fuente normativa y gate de contratos: [DTOs, publicación y migración de consumidores](../../../../standards/api/http-dtos-and-contracts.md). Conservar aquí únicamente la integración de esta plataforma.

## Nombres de contratos bajo convención `*.dto.ts` (migración controlada)

Fuente normativa y gate de contratos: [DTOs, publicación y migración de consumidores](../../../../standards/api/http-dtos-and-contracts.md). Conservar aquí únicamente la integración de esta plataforma.

### ✅ Correcto / ❌ Incorrecto — Contratos DTO, Zod, React Hook Form Y TanStack

✅ **Correcto:** Para **Contratos DTO, Zod, React Hook Form Y TanStack**, derivar DTOs HTTP compartidos y comprobar exports efectivamente publicados.

❌ **Incorrecto:** En **Contratos DTO, Zod, React Hook Form Y TanStack**, duplicar schemas/DTOs o importar contratos que aún no existen.

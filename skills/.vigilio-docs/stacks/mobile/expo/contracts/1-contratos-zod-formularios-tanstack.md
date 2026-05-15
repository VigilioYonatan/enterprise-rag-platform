# Contratos, Zod, Formularios Y TanStack Mobile

Fuentes ejecutables: `bus-impl/packages/contracts`, `@vigilioyonatan/bus-contracts` y los gates de
contrato/OpenAPI del consumidor. La app no es owner de DTOs HTTP.

## Objetivo

Consumir contratos publicados por el backend sin copiarlos. Para la API first-party controlada,
tipar sus responses sin `parse()` runtime por defecto; usar validacion explicita en el boundary
para terceros, integraciones no confiables o riesgos que la justifiquen.

```text
input nativo -> schema de formulario UI -> request DTO publicado -> service HTTP
response first-party -> ResponseDto tipado -> query cache -> screen
response externa/no confiable -> schema.parse en boundary -> query cache -> screen
```

## Fuente Única Del Contrato

- Fijar una versión exacta de `@vigilioyonatan/bus-contracts` y su integridad en el lockfile.
- Importar request DTOs, response DTOs, enums y schemas runtime desde el paquete publicado.
- No importar `bus-impl/src`, NestJS, repositorios, entidades de base de datos ni adapters cloud.
- No crear `libs/contracts`, `src/contracts` o `types/` como mirror del backend.
- `src/contracts` solo puede contener una proyección/adaptación temporal del borde, documentada con
  owner y condición de eliminación; nunca vuelve a declarar todos los campos.

Una incompatibilidad debe detectarse mediante tests de contrato, OpenAPI diff y, si el riesgo lo
requiere, validacion runtime centralizada en `ApiClient`/`*.api.ts` con telemetria sin payload/PII.
`as ResponseDto` aporta solo tipado estático; no afirma que el JSON cumple el contrato.

## Derivación De Tipos Sin Duplicación

Los tipos HTTP vienen de `@vigilioyonatan/bus-contracts`. No volver a escribir un DTO, schema, enum
o interface con los mismos campos. Cuando React Native necesita una proyección, derivarla:

```typescript
import type {
  UserPublicSchema,
  RegisterUserRequestDto,
} from '@vigilioyonatan/bus-contracts';

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

Usar `Pick`, `Omit`, `Partial`, `Readonly`, acceso indexado e intersecciones para props, rows y
ViewModels type-only. Por ejemplo:

```typescript
import type { ListProductsResponseDto } from '@vigilioyonatan/bus-contracts';

type ProductRow = ListProductsResponseDto['results'][number];
type ProductRowProps = Readonly<{
  product: Pick<ProductRow, 'id' | 'nombre' | 'precio' | 'status'>;
  onPress: (id: ProductRow['id']) => void;
}>;
```

Estas utilidades TypeScript no validan runtime. El schema Zod publicado es la fuente del
tipo y puede activarse en el borde para respuestas externas/de alto riesgo; para API interna
controlada no se exige parse cada vez. Crear un ViewModel nuevo solo cuando componga estado exclusivamente visual;
derivarlo del contrato y probar su mapper. No crear `UserDto`, `ProductType`, `UserTest` ni enums
paralelos.

## React Hook Form Y Adaptación Nativa

> [!IMPORTANT]
> **Regla Principal (Caso Estándar):** En la mayoría de los casos **NO SE CREARÁ** un schema de formulario local como `const registerProductFormSchema = z.object({ ... })`. 
> 
> Se debe consumir **directamente el request DTO** publicado desde el paquete de contratos del proyecto (ej. `@vigilioyonatan/bus-contracts` — *nota: el nombre del paquete variará según el proyecto*).

### 1. Caso Estándar (Mayoría de los casos)

Si los controles coinciden con los tipos esperados por el DTO, se pasa directamente el `registerProductRequestDto` al resolver de React Hook Form:

```typescript
import {
  registerProductRequestDto,
  type RegisterProductRequestDto,
} from '@vigilioyonatan/bus-contracts'; // Nota: El paquete de contratos varía según el proyecto
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

// MAYORMENTE SERÁ ASÍ: Uso directo del contrato publicado
const register_product_form = useForm<RegisterProductRequestDto>({
  resolver: zodResolver(registerProductRequestDto),
});
```

### 2. Caso Excepcional (Adaptación Nativa/Local)

Solo cuando un control nativo (`TextInput`) requiera representar números, fechas o `null` temporalmente como texto antes de enviar al backend, se define un schema local intermedio `const registerProductFormSchema = z.object(...)` y su mapper explicito:

```typescript
import {
  type RegisterProductRequestDto,
  registerProductRequestDto,
} from '@vigilioyonatan/bus-contracts'; // Nota: El paquete de contratos varía según el proyecto
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// SOLO CUANDO SE NECESITE ADAPTACIÓN DE TIPOS EN LA UI:
const registerProductFormSchema = z.object({
  descripcion: z.string(),
  nombre: z.string().trim().min(1),
  precio: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  stock: z.string().regex(/^\d+$/),
});

type RegisterProductForm = z.infer<typeof registerProductFormSchema>;

function toRegisterProductRequest(value: RegisterProductForm): RegisterProductRequestDto {
  return registerProductRequestDto.parse({
    ...value,
    descripcion: value.descripcion.trim() || null,
    stock: Number(value.stock),
  });
}

const register_product_form = useForm<RegisterProductForm>({
  resolver: zodResolver(registerProductFormSchema),
});
```

El schema local no puede cambiar required/nullable, límites o reglas de negocio para aceptar algo que el request DTO rechaza. Cada `TextInput` mantiene label accesible, error asociado, teclado adecuado y estado disabled/pending.

## TanStack Query

TanStack Query posee server state. Las keys son factories estables y contienen todo filtro que cambia
el resultado:

```typescript
import type { ListProductsQueryDto } from '@vigilioyonatan/bus-contracts';

export const product_keys = {
  all: ['products'] as const,
  list: (filters: ListProductsQueryDto) => [...product_keys.all, 'list', filters] as const,
  detail: (id: number) => [...product_keys.all, 'detail', id] as const,
};
```

- Conectar `onlineManager` con NetInfo y `focusManager` con AppState.
- `queryFn` retorna datos ya parseados por el response schema.
- `select` crea proyecciones de lectura; no altera el contrato almacenado sin necesidad.
- Invalidar el scope mínimo afectado por una mutation.
- Reintentar queries solo ante fallos transitorios.
- No reintentar uploads o comandos no idempotentes sin idempotency key y semántica probada.
- No copiar responses completas a Signals, Zustand o AsyncStorage.

## Gates

- Gobierno de versión exacta, integridad y exports del paquete.
- Pruebas de payload válido, inválido y drift del response schema.
- Pruebas del mapper de formulario y de los services `*.api.ts`.
- Pruebas de query/mutation, retry e invalidación.
- Typecheck sin `any`, `as unknown as` ni casts que oculten incompatibilidades.
- Diff OpenAPI/contratos en CI cuando el backend publique una versión nueva.

## No Hacer

- Copiar DTOs en screen, service, hook, fixture o `libs/contracts`.
- Usar response DTO como formulario cuando la representación nativa es distinta.
- Inventar defaults para campos ausentes del backend.
- Enviar una URI local del dispositivo como si fuese el contenido del archivo.
- Probar solo el happy path del schema o del mapper.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).



> Fuente única para **Compatibilidad de contratos publicados (gate obligatorio)**: [abrir documento canónico](../../../frontend/web-mfe/contracts/1-contratos-dtos-zod-tanstack.md).


> Fuente única para **Nombres de contratos bajo convención `*.dto.ts` (migración controlada)**: [abrir documento canónico](../../../frontend/web-mfe/contracts/1-contratos-dtos-zod-tanstack.md).

### ✅ Correcto / ❌ Incorrecto — Contratos, Zod, Formularios Y TanStack Mobile

✅ **Correcto:** Para **Contratos, Zod, Formularios Y TanStack Mobile**, derivar DTOs HTTP compartidos y comprobar exports efectivamente publicados.

❌ **Incorrecto:** En **Contratos, Zod, Formularios Y TanStack Mobile**, duplicar schemas/DTOs o importar contratos que aún no existen.

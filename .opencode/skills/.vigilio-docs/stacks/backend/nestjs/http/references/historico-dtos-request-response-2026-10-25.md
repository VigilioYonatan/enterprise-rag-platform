# DTOs Request/Response — copia histórica (no normativa)

> **ARCHIVO HISTÓRICO:** ejemplos anteriores íntegros preservados; usar [norma vigente](../../../../../standards/api/http-validators-and-dtos.md) para implementar código nuevo.

## DTOs públicos y adaptadores de documentación

> **PRECEDENCIA — cambios 2026-10-25:** Este capítulo es **histórico**, no plantilla vigente de nombres/rutas. Las entradas HTTP nuevas usan `*.validator.ts` + `*.dto.ts` solo con tipos; entidades en `domain/schemas/` con `ProductSchema` / `OrderSchema`, métodos `OrderEntity.cancel()` y casos de uso `cancelOrder()`. Consultar [norma vigente](../../../../../standards/api/http-validators-and-dtos.md). Conservar el resto del capítulo como contexto, sin copiar los fragmentos anteriores como nuevos estándares.

Convención canónica 2026:

```text
feature-action.request.schema.ts   # Zod puro (contrato, validación y reutilización)
feature-action.request.dto.ts      # SOLO type derivado con z.infer/z.output
feature-action.request.doc.ts      # createZodDto(schema); NestJS/OpenAPI
feature-action.response.schema.ts  # Zod puro para la respuesta
feature-action.response.dto.ts     # SOLO type derivado con z.infer
feature-action.response.doc.ts     # createZodDto(schema); NestJS/OpenAPI
```

Los archivos `.doc.ts` se crean solo cuando Swagger/Scalar necesita una clase. Los campos del `userSchema` no se redeclaran dentro de schemas de DTO; se reutilizan con `.pick()`. No cuentan como
otro contrato: son adaptadores de infraestructura derivados del DTO puro.

## 1. Regla de frontera

- `*.schema.ts` define y exporta el objeto Zod para la frontera correspondiente; el `*.dto.ts` solo exporta tipos derivados de ese schema.
- `*.dto.ts` no puede importar `nestjs-zod`, `@nestjs/*`, Node built-ins ni infraestructura.
- `*.doc.ts` puede importar `createZodDto` y exactamente el schema del DTO hermano.
- `src/contracts.ts` exporta schemas de contrato y tipos DTO, nunca `*.doc.ts`.
- services usan comandos y tipos de Application; controllers retornan tipos `*Dto`; `*DocDto` solo aparece en decoradores.

La separación es obligatoria aunque exista tree shaking. `createZodDto(schema)` se ejecuta al
evaluar el módulo y obliga al bundler a resolver NestJS; tree shaking no es una frontera confiable.

## 2. Request público

El schema de entrada vive en `*.request.schema.ts`; el DTO `*.request.dto.ts` solo define su tipo. Body, query y params pueden compartir composición si pertenecen al mismo caso de uso, sin fusionar validaciones de distinta procedencia:

```typescript
// src/user/presentation/http/schemas/register-user.request.schema.ts
import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';
export const registerUserRequestSchema = userSchema.pick({
  email: true,
  name: true,
}).extend({ password: z.string().min(12) });
```

```typescript
// src/user/presentation/http/dto/register-user.request.dto.ts
import type { z } from 'zod';
import { registerUserRequestSchema } from '../schemas/register-user.request.schema';
export type RegisterUserRequestDto = z.infer<typeof registerUserRequestSchema>;
```

Adaptador backend:

```typescript
// src/user/presentation/http/dto/register-user.request.doc.ts
import { createZodDto } from 'nestjs-zod';
import { registerUserRequestSchema } from '../schemas/register-user.request.schema';

export class RegisterUserRequestDocDto extends createZodDto(registerUserRequestSchema) {}
```

Para un listado:

```typescript
// src/user/presentation/http/schemas/list-users.query.schema.ts
import { userSchema } from '../../../domain/schemas/user.schema';
import { offsetPaginationQuerySchema } from '@/shared/application/schemas/pagination-query.schema';
export const listUsersQuerySchema = offsetPaginationQuerySchema.extend({
  email: userSchema.shape.email.optional(),
});
```

```typescript
// src/user/presentation/http/dto/list-users.query.dto.ts
import type { z } from 'zod';
import { listUsersQuerySchema } from '../schemas/list-users.query.schema';
export type ListUsersQueryDto = z.output<typeof listUsersQuerySchema>;
```

```typescript
// src/user/application/dtos/list-users.request.doc.ts
import { createZodDto } from 'nestjs-zod';
import { listUsersQuerySchema } from '../schemas/list-users.query.schema';

export class ListUsersQueryDocDto extends createZodDto(listUsersQuerySchema) {}
```

Reglas:

- crear `*.query.dto.ts` o `*.params.dto.ts` cuando el contrato sea independiente; nunca crear archivos vacíos ni wrappers redundantes;
- derivar con `pick`, `omit`, `partial` y `extend` dentro del `*.schema.ts` de la operación; el `*.dto.ts` solo deriva `z.infer`/`z.output`;
- no duplicar defaults de Drizzle/PostgreSQL en el request;
- usar `nullable()` cuando el cliente debe enviar ausencia explícita;
- reservar `optional()` para query/filtros y PATCH;
- no crear interfaces manuales que dupliquen `z.infer`.

## 2.1 Derivación obligatoria de tipos

La fuente de verdad es el schema base y su tipo inferido. No inventar un tipo paralelo si el dato
ya existe en la feature:

```typescript
export type UserSchema = z.infer<typeof userSchema>;

export type UserIdentity = Pick<
  UserSchema,
  'id' | 'email' | 'full_name'
>;

export type UserWithoutAudit = Omit<
  UserSchema,
  'created_at' | 'updated_at'
>;

export type UserWithProduct = UserPublicSchema & {
  product: Pick<ProductSchema, 'id' | 'nombre' | 'status'>;
};
```

Usar `Pick<T, K>`, `Omit<T, K>`, `Partial<T>`, `Required<T>`, `Readonly<T>` e intersecciones
(`A & { extra: X }`) para proyecciones y composiciones type-only. `interface X extends Y` también
es válido cuando existe una relación clara; no usar herencia solo para esconder una duplicación.

TypeScript desaparece en runtime. Si la forma debe validarse en requests, responses, eventos o
datos externos, derivar primero el schema Zod y luego inferir el tipo:

```typescript
export const userWithProductSchema = userPublicSchema.extend({
  product: productPublicSchema.pick({
    id: true,
    nombre: true,
    status: true,
  }),
});

export type UserWithProduct = z.infer<typeof userWithProductSchema>;
```

`Pick<>` u `Omit<>` solos no sustituyen `.pick()` u `.omit()` cuando se necesita validación. No
repetir manualmente campos de `UserSchema`, `ProductSchema` ni de otro contrato. Si un tipo agrega
formato o datos exclusivos de UI, nombrarlo `*ViewModel` y derivar sus campos de la fuente original.

## 3. Response público

```typescript
// src/user/presentation/http/schemas/register-user.response.schema.ts
import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';
const user_public_schema = userSchema.pick({ id: true, name: true, email: true });
export const registerUserResponseSchema = z.object({
  success: z.literal(true),
  user: user_public_schema,
});
```

```typescript
// src/user/presentation/http/dto/register-user.response.dto.ts
import type { z } from 'zod';
import { registerUserResponseSchema } from '../schemas/register-user.response.schema';
export type RegisterUserResponseDto = z.infer<typeof registerUserResponseSchema>;
```

```typescript
// src/user/presentation/http/dto/register-user.response.doc.ts
import { createZodDto } from 'nestjs-zod';
import { registerUserResponseSchema } from '../schemas/register-user.response.schema';

export class RegisterUserResponseDocDto extends createZodDto(registerUserResponseSchema) {}
```

Errores transversales reutilizables viven en `shared/application/dtos`; sus adaptadores Swagger
también van en archivos `.doc.ts`. No dupliques el mismo error en cada feature.

## 4. Controller

```typescript
import { RegisterUserRequestDocDto } from '@/user/application/dtos/register-user.request.doc';
import {
  registerUserRequestSchema,
  type RegisterUserRequestDto,
} from '@/user/application/dtos/register-user.request.dto';
import { RegisterUserResponseDocDto } from '@/user/application/dtos/register-user.response.doc';
import type { RegisterUserResponseDto } from '@/user/application/dtos/register-user.response.dto';

@Post()
@ApiBody({ type: RegisterUserRequestDocDto })
@ZodResponse({ status: 201, type: RegisterUserResponseDocDto })
store(
  @Body(new ZodPipe(registerUserRequestSchema)) body: RegisterUserRequestDto,
): Promise<RegisterUserResponseDto> {
  return this.service.store(body);
}
```

## 5. Paquete compartido backend/frontend

El backend es dueño del contrato y publica un paquete independiente, por ejemplo
`@vigilioyonatan/bus-contracts`. El paquete contiene únicamente el barrel browser-safe compilado,
declara `sideEffects: false` y depende solo de Zod como runtime/peer dependency.

Desarrollo local:

```powershell
# bus-impl
pnpm dev:contracts

# web-mfe, una vez
pnpm link ..\bus-impl\packages\contracts
```

CI y producción deben instalar una versión publicada exacta. No usar `link:`, `file:`,
`workspace:*` ni `latest` fuera del desarrollo local.

## 6. Definition of Done

- el generador excluye `*.doc.ts`;
- falla si un contrato público importa NestJS;
- el paquete genera `.js` y `.d.ts` válidos;
- un bundle de navegador no contiene `nestjs-zod`, `@nestjs/*` ni Node built-ins;
- backend typecheck/tests/OpenAPI pasan;
- frontend typecheck/tests/build y validación de drift pasan;
- no queda una copia manual de los DTOs en frontend.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Derivar proyecciones de un esquema canónico (`productSchema.pick()`/OpenAPI), documentar valores opcionales y comprobar compatibilidad en CI.
- ❌ **Incorrecto:** Copiar DTOs por controller o interpretar `as T` como validación runtime; usar `.parse()` repetidamente sólo para obtener el tipo.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.

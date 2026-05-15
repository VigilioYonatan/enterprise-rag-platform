# DTOs HTTP públicos, query y Swagger/Scalar — Vigilio

> **Vigente:** el contrato Zod y `z.output`/`z.infer` viven en **un único `*.dto.ts`**. No crear carpeta `validators/`. La edición anterior íntegra se conserva en [histórico](historico-dtos-request-response-2026-10-25.md). [Norma transversal](../../../../../standards/api/http-dtos-and-contracts.md).

## Carpetas y límites

```text
users/
├── domain/schemas/user.schema.ts
├── presentation/http/
│   ├── dto/
│   │   ├── register-user.request.dto.ts
│   │   ├── register-user.response.dto.ts
│   │   └── list-users.query.dto.ts
│   └── docs/register-user.request.doc.ts   # opcional: clase NestJS para Swagger
└── infrastructure/persistence/users.table.ts
shared/http/dto/offset-pagination-query.dto.ts
```

- `*.schema.ts`: estructura de entidad Zod y tipo `UserSchema`.
- `*.table.ts`: tabla, índices y constraints SQL (Drizzle).
- `*.dto.ts`: **objeto Zod ejecutable y tipo derivado en el mismo archivo**, reutilizando `.pick()/.extend()` del schema de entidad.
- `*.doc.ts`: adaptador de OpenAPI para NestJS cuando la integración exija una clase; nunca importado por React/Expo.

## Registrar usuario (Request DTO)

```typescript
// users/presentation/http/dto/register-user.request.dto.ts
import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';
export const registerUserRequestDto = userSchema.pick({
  email: true,
  name: true,
}).extend({ password: z.string().min(12) });
export type RegisterUserRequestDto = z.output<typeof registerUserRequestDto>;
```

```typescript
// users/presentation/http/docs/register-user.request.doc.ts — OPCIONAL
import { createZodDto } from 'nestjs-zod';
import { registerUserRequestDto } from '../dto/register-user.request.dto';
export class RegisterUserRequestDocDto extends createZodDto(registerUserRequestDto) {}
```

El controlador valida con el DTO vía pipe **real**, adapta a input de Application y no transmite `password_hash` en respuesta. `DocDto` solo se crea si un adaptador OpenAPI lo necesita; el paquete web no importa `@nestjs/*` ni `nestjs-zod`.

## Query con paginación común

```typescript
// users/presentation/http/dto/list-users.query.dto.ts
import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';
import { offsetPaginationQueryDto } from '@/shared/http/dto/offset-pagination-query.dto';
export const listUsersQueryDto = offsetPaginationQueryDto.extend({
  email: userSchema.shape.email.optional(),
});
export type ListUsersQueryDto = z.output<typeof listUsersQueryDto>;
```

```typescript
// users/presentation/http/dto/register-user.response.dto.ts
import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';
export const registerUserResponseDto = z.object({
  success: z.literal(true),
  user: userSchema.pick({ id: true, name: true, email: true }),
});
export type RegisterUserResponseDto = z.output<typeof registerUserResponseDto>;
```

Usar `z.input` para lo recibido (antes de la transformación) y `z.output` para el payload validado. No convertir texto de query con `Number('')` sin una precondición léxica. En frontend, `useListUsersQuery()` consume DTO browser-safe; la librería de server state maneja caching/invalidation, no la capa Domain.

## Tipos derivados, sin aliases triviales ni duplicación

```typescript
// users/domain/schemas/user.schema.ts
export type UserSchema = z.infer<typeof userSchema>;
// En otro archivo: usar UserSchema['id'] en parámetros;
// y Pick<UserSchema, 'id' | 'email'> para una proyección type-only.
```

No generar por rutina `UserId = UserSchema['id']` si no añade reglas o invariantes. Un Value Object real (por ejemplo un ID con validación/branding) es una decisión distinta. Del mismo modo, en Products usar `ProductSchema['product_type']` directamente; no repetir una unión literal `ProductType`.

## Gate de producción

**✅** DTO con Zod+tipo en un solo archivo, validador realmente ejecutado en los bordes, proyecciones allowlist, respuestas públicas y OpenAPI coherentes, autorizaciones y tenant desde sesión confiable.

**❌** DTO sin validación runtime asumida, imports backend en el paquete React/Expo, duplicar las mismas reglas en `.schema.ts` del HTTP y un DTO, crear `*.validator.ts`, generar tipos indexados triviales o publicar un renombre de export sin migrar consumidores.

**Estado:** ejemplos documentales; compilación/E2E de consumidores `NOT_RUN`.

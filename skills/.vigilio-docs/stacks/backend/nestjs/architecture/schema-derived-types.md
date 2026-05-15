# NestJS — un schema por entidad, tipos derivados y DDD semántico

**Alcance:** ejemplos TypeScript/Zod. [Norma compartida](../../../../standards/engineering/naming-and-boundaries.md) y [versiones](../../../../technology/versions.md). Estos bloques son **plantillas**, no código ejecutado en aplicación consumidora.

## 1. Schemas propietarios y tipos sin duplicación

```typescript
// products/domain/schemas/product.schema.ts
import { z } from 'zod';
export const productSchema = z.object({
  id: z.uuid(),
  tenant_id: z.uuid(),
  nro_poliza: z.string().trim().min(1).max(30),
  product_type: z.enum(['inclusion', 'exclusion']),
  category_id: z.uuid(),
});
export type ProductSchema = z.infer<typeof productSchema>;
```

```typescript
// categories/domain/schemas/category.schema.ts (archivo independiente)
import { z } from 'zod';
export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1),
});
export type CategorySchema = z.infer<typeof categorySchema>;
```

`product.schema.ts` **importa** `categorySchema` solo cuando un contrato lo requiere; no lo redefine. Los schemas Zod representan validación/contrato, **no** reemplazan invariantes de dominio ni migraciones Drizzle. La entrada HTTP Zod y su tipo se definen juntos en `presentation/http/dto/*.dto.ts`; [norma transversal](../../../../standards/api/http-dtos-and-contracts.md).

✅ **Correcto:** tipo interno enriquecido sin crear un segundo schema:

```typescript
import type { ProductSchema } from '../../products/domain/schemas/product.schema';
import type { CategorySchema } from '../../categories/domain/schemas/category.schema';
export type ProductWithCategory = ProductSchema & {
  category: Pick<CategorySchema, 'id' | 'name'>;
};
export type ProductSummary = Pick<ProductSchema, 'id' | 'nro_poliza'>;
```

❌ **Incorrecto:** crear `productWithCategorySchema` solo para inferir tipos internos, o repetir `type ProductStatus = 'pending' | 'shipped' | 'cancelled'` si el estado ya está declarado en un schema.

### Caso práctico real: `Pick<Schema, ...> & Partial<Pick<Schema, ...>>`, cero `| string` y cero alias en Puertos

```typescript
// ❌ INCORRECTO (Cómo NO debe ser):
// 1. Intersección redundante Partial<Omit<...>> que oculta qué campos son opcionales:
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

// 2. Unión laxa con `| string` que destruye el tipo indexado del schema:
export interface ChangeMemberRoleInput {
  organization_id: string;
  user_id: string;
  role: MembershipSchema['role'] | string;
}

// 3. Re-exportar alias triviales en el puerto del repositorio:
export type OAuthState = OAuthStateRecord;
export type StoredConnection = StoredConnectionRecord;
export type ConnectedAccount = ConnectedAccountRecord;
export type ConnectionInput = SaveConnectionInput;
```

```typescript
// ✅ CORRECTO (Cómo debe ser):
// 1. Especificar explícitamente los campos requeridos y opcionales desde el Schema canónico:
export type ApprovalRecord = Pick<
  ApprovalSchema,
  'id' | 'organization_id' | 'run_id' | 'requested_by' | 'status' | 'expires_at' | 'reason'
> &
  Partial<Pick<ApprovalSchema, 'decided_by' | 'decided_at' | 'created_at'>>;

// 2. Usar exclusivamente tipos indexados estrictos del Schema (`Schema['campo']`):
export interface ChangeMemberRoleInput {
  organization_id: OrganizationSchema['id'];
  user_id: UserSchema['id'];
  role: MembershipSchema['role'];
}

// 3. En puertos y servicios, usar directamente `OAuthStateRecord`, `StoredConnectionRecord`,
//    `ConnectedAccountRecord` y `SaveConnectionInput` sin renombrarlos.
```

## 2. Los atributos y métodos de dominio no duplican uniones

```typescript
// orders/domain/schemas/order.schema.ts
import { z } from 'zod';
export const orderSchema = z.object({
  id: z.uuid(),
  status: z.enum(['pending', 'shipped', 'cancelled']),
});
export type OrderSchema = z.infer<typeof orderSchema>;
// orders/domain/entities/order.entity.ts
import type { OrderSchema } from '../schemas/order.schema';
import { OrderAlreadyShippedError } from '../errors/order-already-shipped.error';
export class OrderEntity {
  constructor(readonly id: OrderSchema['id'], private status: OrderSchema['status']) {}
  cancel(): void {
    if (this.status === 'cancelled') return; // solo si negocio exige idempotencia
    if (this.status === 'shipped') throw new OrderAlreadyShippedError();
    this.status = 'cancelled';
  }
  getStatus(): OrderSchema['status'] { return this.status; }
}
```

La idempotencia está condicionada a la regla aprobada; en producción validar contexto/autoridad del actor, persistencia, concurrencia y eventos. `OrderAlreadyShippedError` es dominio puro, no `HttpException`. Las **propiedades** pueden llamarse `snake_case`; métodos propios, `camelCase`.

## 3. Tipo interno ≠ schema de entrada/salida

```typescript
// users/domain/schemas/user.schema.ts
export const userSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  email: z.email(),
  password_hash: z.string(), // dato interno; NUNCA serializar públicamente
});
export type UserSchema = z.infer<typeof userSchema>;
```

```typescript
// auth/presentation/http/dto/login.request.dto.ts
import { z } from 'zod';
import { userSchema } from '../../../domain/schemas/user.schema';
export const loginRequestDto = userSchema.pick({ email: true }).extend({
  password: z.string().min(1),
});
export type LoginRequestDto = z.output<typeof loginRequestDto>;
```

✅ `.pick()`/`.omit()`/`.extend()` en fronteras HTTP, mensajes recibidos, OpenAPI, validación externa. ❌ Usar `Pick<UserSchema, ...>` como supuesto validador runtime; ni un `as ProductSchema` garantiza bytes recibidos.

## 4. Calidad y pruebas

1. Unit: `OrderEntity.cancel()` válido, prohibido, repetido y sin cambio de estado tras excepción.
2. Contract: `loginRequestDto` acepta email válido y rechaza payload mal formado, protegiendo secretos.
3. Typecheck: `OrderSchema['status']` y `ProductSchema['id']` gobiernan interfaces/repositorios; prohibir duplicar uniones.
4. Integration: JSON de salida solo tiene campos allowlist; controller no envía `password_hash`.
5. Migración: cambiar schema público exige OpenAPI diff y pruebas de clientes; no se reescribe DB automáticamente.

**Estado de estos ejemplos:** `NOT_RUN`; se requiere compilación del proyecto consumidor y suite real.

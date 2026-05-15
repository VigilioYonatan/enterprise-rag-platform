# NestJS: DI, tokens y ports sin dependencia de infraestructura

Un interface TypeScript desaparece en runtime; Nest no puede usarlo directamente como token de DI. Definir symbol o constant token, registrar adapter en `providers` del módulo y consumirlo con `@Inject` desde aplicación.

```typescript
// application/repositories/product.repository.interface.ts
export interface ProductRepository {
  findById(product_id: ProductSchema['id'], tenant_id: ProductSchema['tenant_id']): Promise<ProductEntity | null>;
  save(product: ProductEntity): Promise<void>;
}
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

// infrastructure/providers (fragmento de product.module.ts)
@Module({ providers: [
  ProductApplicationService,
  { provide: PRODUCT_REPOSITORY, useClass: DrizzleProductRepository },
] })
export class ProductModule {}
```

En NestJS la aplicación puede usar `@Inject(PRODUCT_REPOSITORY)` como adaptador DI de Nest; el **dominio puro no importa Nest**. Para DDD estricto, orquestación sin Nest puede inyectarse en una factory, pero no introducir ese nivel extra en todo CRUD.

✅ Correcto: tests construyen service con repositorio falso, inyectan instancia y prueban errores sin levantar un HTTP server.

❌ Incorrecto: `new DrizzleProductRepository()` dentro del caso de uso o `@Injectable()` en `Product` entidad.

Revisión: no ciclos de módulos, no providers singleton con estado por request/tenant, scopes adecuados. [Ports](../application/repository-ports.md).

## Convención explícita para parámetros-propiedad del constructor

La inyección de dependencias de NestJS usa **`camelCase` en el constructor**: `productRepository` / `productService` / `policyService`. La propiedad que genera `private readonly` también se accede en `this` con ese mismo nombre. Este es el caso especial respecto de las variables locales y parámetros ordinarios `snake_case`.

```typescript
@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: ProductRepository,
  ) {}

  async getProduct(product_id: ProductSchema['id']): Promise<ProductEntity> {
    const product = await this.productRepository.findById(product_id);
    if (!product) throw new ProductNotFoundError();
    return product;
  }
}
```

**✅ Correcto:** `this.productRepository`, `product_id` en el argumento del método, `getProduct()` semántico. **❌ Incorrecto:** `private readonly product_repository` en un constructor TS, renombrar `findById()` a `find_by_id()` o convertir el campo público `tenant_id` a camelCase. Este ejemplo es ilustrativo (`ProductEntity`, `ProductSchema`, `PRODUCT_REPOSITORY` y excepción deben importarse del propietario del consumidor); no equivale a compilación ejecutada.

> Fuente única para **Procedencia documental preservada**: [abrir documento canónico](ddd-implementation.md).


> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).


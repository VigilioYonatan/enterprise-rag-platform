# NestJS: nombres DDD, application service y dominio

`listProducts`/`searchProducts` para queries; `approvePolicy`, `cancelOrder`, `activateSubscription`, `calculatePremium` cuando esos comportamientos existan. `index/store/update` permitidos en CRUD trivial y adapters técnicos, pero no deben esconder una invariante de negocio.

```typescript
async processProduct(id: ProductSchema['id'], tenant_id: TenantId): Promise<ProductResultDto> {
  return this.unitOfWork.transaction(async (tx) => {
    const product = await tx.products.findForUpdate(id, tenant_id);
    if (!product) throw new ProductNotFoundError();
    product.process();
    await tx.products.save(product);
    return { id: product.id, estado: product.status };
  });
}
```

`transaction` y `findForUpdate` ilustran contratos a implementar, no SDKs ya existentes. Types, constants, enums en capa propietaria si añaden semántica; `z.infer` permanece junto al schema Zod. No repetir DTO con interfaces manuales.

[Golden Path original](architecture/references/21-golden-path-feature.md) · [DDD común](../../../foundations/architecture/ddd.md).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).


> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../governance/complete-work-coverage-policy.md).

### ✅ Correcto / ❌ Incorrecto — NestJS: nombres DDD, application service y dominio

✅ **Correcto:** Para **NestJS: nombres DDD, application service y dominio**, emplear métodos DDD semánticos, DTOs Zod y DI camelCase para constructor.

❌ **Incorrecto:** En **NestJS: nombres DDD, application service y dominio**, importar ORM dentro de Domain o inventar aliases triviales de ProductSchema.

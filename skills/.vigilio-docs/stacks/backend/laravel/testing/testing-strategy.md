# Laravel: Pest 5, PHPUnit 13, pruebas por riesgo

Baseline Pest 5 (`>=PHP 8.4`, PHPUnit 13 compatible por Composer), Laravel 13 y PostgreSQL real para integration; los pactos de contrato frontend/backend vienen de OpenAPI generado.

```php
<?php
// tests/Unit/ProductTest.php

it('rejects processing a cancelled product', function () {
    $product = new Product(1, ProductStatus::Cancelled);
    expect(fn () => $product->process())->toThrow(InvalidProductState::class);
});

it('processes a pending product', function () {
    $product = new Product(1, ProductStatus::Pending);
    $product->process();
    expect($product->status())->toBe(ProductStatus::Processed);
});
```

Feature:

```php
it('requires authentication for product listing', function () {
    $this->getJson('/api/products')->assertUnauthorized();
});
```

Tests adicionales: limit inválido (`0`, `101`, `abc`), `limit='10'` convertido, listados filtrados y ordenados, total/next/previous, aislamiento tenant, Policy, exclusión PII del JSON, N+1, transacción rollback, duplicación/outbox, cache hit-miss-invalidación y fallo Redis. `assertJsonPath`/snapshot contra contrato no debe ser el único control: comparar OpenAPI con producer real.

Gate: `composer validate --strict`, `composer audit --locked`, Pint, Larastan, Pest unit/feature, integración PostgreSQL/Redis, contract diff; reportar `NOT_RUN` cuando falte runtime.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Probar invariantes, guards/Policies, query Zod/FormRequest, contrato OpenAPI y DB/Redis real donde aplique.
- ❌ **Incorrecto:** Confundir mocks con integración, afirmar cobertura por porcentaje o ignorar comportamiento existente y casos negativos.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Implementación concreta:** Controller delega a use-case semántico; Repository port devuelve modelo de dominio/read model, Eloquent queda fuera de dominio.
2. **Contratos:** Form Request valida entrada; API Resource proyecta salida y OpenAPI documenta el contrato.
3. **Seguridad:** Policy por acción y recurso con filtros por tenant/documento; incluir test anónimo y cross-tenant.
4. **Transacciones:** Probar DB real, rollback, outbox y colas con retry/deduplicación según caso.
5. **Operación:** Observar logs estructurados, traces, jobs y N+1 con consultas reales.
6. **Testing:** Probar Unit/Pest, Feature HTTP y E2E real sin confundir fakes con infraestructura ejecutada.

**Matriz de escenarios vinculada:** [e2e-http](e2e-http.md).

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

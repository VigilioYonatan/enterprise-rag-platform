# Contratos HTTP: un propietario, varios stacks


**Norma complementaria de diseño REST/HTTP:** [Arquitectura y endpoints Senior/Staff 2026](rest-endpoint-design.md). Este documento conserva sus contratos existentes; no los reemplaza.

> **Referencia canónica actualizada:** [Convención transversal de nombres](../engineering/naming-and-boundaries.md) · [DTOs NestJS](../../stacks/backend/nestjs/http/semantic-dtos-and-pagination.md) · [validadores HTTP](http-dtos-and-contracts.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

## Fuente de verdad

En Vigilio el contrato API tipo TypeScript se modela con Zod 4 (`productSchema`, `productSchema.pick`, `createPaginatorDto`, `z.infer`), se exporta a OpenAPI y se verifica frente al JSON real del backend. Laravel **no importa Zod en PHP**: implementa ese contrato vía Form Request, DTO tipado y proyección API Resource. Nunca escribir un segundo Swagger divergente manualmente.

```typescript
// products/presentation/http/dto/list-products.response.dto.ts
export const listProductsResponseDto = createPaginatorDto(
  productSchema.pick({ id: true, nro_poliza: true, product_type: true }),
);
// products/presentation/http/dto/list-products.response.dto.ts
export type ListProductsResponseDto = z.infer<typeof listProductsResponseDto>;
```

- Backend TS tipa salida `Promise<ListProductsResponseDto>`; frontend TS usa el tipo compartido o cliente generado. `.parse()` por respuesta **no es obligatorio** solo para tipado: si se omite, TS no verifica datos recibidos en runtime.
- Validar *entrada* externa en el borde; usar validación de *salida* si riesgo/compliance lo pide, evitando dobles validaciones automáticas no intencionadas.
- La proyección explícita de campos de salida es obligatoria: un `pick()` de tipos no filtra por sí solo el JSON real.
- Scalar visualiza OpenAPI; proteger `/reference`, `/openapi.json` y documentación privada por entorno.
- CI: verificar `operationId`, payload de éxito/error, paginación, permisos y diff de cambios incompatibles.
- Fechas JSON = string ISO; no publicar un `Date` de memoria como contrato serializado.

[API NestJS existente](../../software-factory/backend-api-contracts.md) · [API Laravel](../../stacks/backend/laravel/http/openapi-scalar.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Derivar proyecciones de un esquema canónico (`productSchema.pick()`/OpenAPI), documentar valores opcionales y comprobar compatibilidad en CI.
- ❌ **Incorrecto:** Copiar DTOs por controller o interpretar `as T` como validación runtime; usar `.parse()` repetidamente sólo para obtener el tipo.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../engineering/refactoring-existing-code.md).

## Mejoras técnicas verificables — 2026

**3. Esquema público y datos privados.** ✅ Contrato derivado de un schema de dominio mediante proyección allowlist y pruebas de conformidad. ❌ Serializar toda la fila ORM y asumir que el DTO TypeScript elimina propiedades runtime.

**4. Tipado estático sin validar dos veces.** ✅ Contrato con inferencia y `Promise<...>` / cliente tipado; parse runtime en bordes externos según riesgo. ❌ Usar `parse()` de cada respuesta únicamente para obtener un tipo o dar por garantizado un JSON por `as T`.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Contrato versionable:** Documentar éxito, error, paginación, autenticación y política de deprecación en OpenAPI consumidor-verificable.
2. **Compatibilidad:** Probar cambios aditivos y breaking en producer y consumer antes de publicar nueva revisión.
3. **Errores uniformes:** Vincular errores de dominio a códigos de transporte sin filtrar internals ni secretos.
4. **Proyecciones explícitas:** Limitar propiedades serializadas a listas positivas aprobadas; revisar PII con test negativo.
5. **Validación límite:** Probar coerción numérica, límites, enums, orden y campos desconocidos con requests reales.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

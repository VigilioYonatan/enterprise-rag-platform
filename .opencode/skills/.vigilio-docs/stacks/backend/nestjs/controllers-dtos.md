# NestJS: controllers, Zod DTO, Swagger y Scalar

```typescript
// products/presentation/http/dto/list-products.response.dto.ts
// Se deriva directamente del schema propietario: no declarar otro schema item.
export const listProductsResponseDto = createPaginatorDto(
  productSchema.pick({ id: true, nro_poliza: true, product_type: true }),
);

// products/presentation/http/dto/list-products.response.dto.ts (archivo distinto)
export type ListProductsResponseDto = z.infer<typeof listProductsResponseDto>;

@Get()
@ApiOperation({ operationId: 'listProducts' })
@ApiOkResponse({ type: ListProductsResponseDocDto })
listProducts(
  @Query(new ZodQueryPipe(listProductsQueryDto)) query: ListProductsQueryDto,
): Promise<ListProductsResponseDto> {
  return this.application.listProducts(query);
}
```

Fragmentos ilustrativos, los imports y guards están en las guías ejecutables de la app; **documentar** auth con `@ApiBearerAuth` no reemplaza `@UseGuards` ni permissions. `ZodQueryPipe` recibe strings HTTP y el schema usa coerción numérica segura; no reconvertir a string después. Scalar renderiza el OpenAPI publicado por el bootstrap, no se instala por controller. No usar `@ZodResponse` si sólo quieres documentación y no su comportamiento runtime.

Documentación original: [DTOs](http/references/27-dtos-request-response.md), [ejemplos completos](http/references/6-ejemplos-codigo.md), [reglas 2026](http/references/46-zod-query-ddd-versiones-2026.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Derivar proyecciones de un esquema canónico (`productSchema.pick()`/OpenAPI), documentar valores opcionales y comprobar compatibilidad en CI.
- ❌ **Incorrecto:** Copiar DTOs por controller o interpretar `as T` como validación runtime; usar `.parse()` repetidamente sólo para obtener el tipo.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Responsabilidad:** Conservar controllers como adaptadores del contrato, nunca dueños de reglas DDD.
2. **Zod:** Derivar respuestas con schema.pick() para no duplicar propiedades y verificar coerce en query.
3. **Uso semántico:** Delegar al servicio con nombre de capacidad del dominio, no a un único manager CRUD.
4. **Paginador:** Comprobar count/next/previous/results y protección de campos.
5. **Doc:** Producir OpenAPI/Scalar desde la misma fuente tipada.
6. **Test:** Probar no autorizado, inválido, vacío y paginación real.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

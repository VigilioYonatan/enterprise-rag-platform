# NestJS: controllers delgados, DDD y seguridad real

> **Convención vigente HTTP:** schemas base solo para entidades; entradas/salidas HTTP en `*.dto.ts`; DTO `*.dto.ts` con Zod y tipo inferido en el mismo archivo; adaptador `*.doc.ts` opcional NestJS. [Fuente normativa](../../../../standards/api/http-dtos-and-contracts.md). No asumir exports publicados renombrados sin migración.


> **Referencia canónica actualizada:** [Controller/DTO semánticos actualizados](semantic-dtos-and-pagination.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

## Responsabilidad

Un controller es adapter HTTP: recibe entrada ya validada, usa contexto autorizado, delega al caso de uso y devuelve un DTO público. Swagger/Scalar es metadato, no control de seguridad. **Privado por defecto**; endpoint público requiere decisión explícita y prueba.

```typescript
@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProductsReadGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductApplicationService) {}

  @Get()
  @ApiOperation({ operationId: 'listProducts', summary: 'Listar productos' })
  @ApiOkResponse({ type: ListProductsResponseDocDto })
  @ApiBadRequestResponse({ description: 'Query inválida' })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  listProducts(
    @Query(new ZodQueryPipe(listProductsQueryDto)) query: ListProductsQueryDto,
  ): Promise<ListProductsResponseDto> {
    return this.productService.listProducts(query);
  }
}
```

Los imports y guards son componentes del consumidor: `ProductsReadGuard` debe aplicar permisos y alcance tenant sobre datos reales; el fragmento muestra el patrón, **no un controller que compila de forma aislada**. Si el proyecto usa `@CurrentUser`, derive tenant desde su identidad validada, no la query del cliente.

## Contratos

- Documentar `operationId` estable, request, respuesta 200/201 y errores 400/401/403/404/409/429 según endpoint.
- No duplicar `@ApiQuery` manualmente si la integración Zod/OpenAPI lo genera; comparar documento real en CI.
- `@ApiBearerAuth()` no instala auth; guards y policies sí ejecutan control.
- No usar `@ZodResponse` si solo se quiere tipado y Swagger (puede instalar interceptor de respuesta en `nestjs-zod`).
- Observabilidad HTTP transversal con Pino/OTel; instrumentación de dominio en services solo cuando aporte valor.

✅ Correcto: `listProducts()`/`approvePolicy()` semánticos, controller sin SQL, 403 probado.

❌ Incorrecto: `@Public()` sin justificación, `async index()` como caso de uso de negocio, o `logger.info({query,body})` con PII.

Tests: authn/authz, filtros, respuesta proyectada, status y operación OpenAPI. [DTOs](dtos-zod.md), [Swagger/Scalar](swagger-scalar.md).

## Procedencia documental preservada

- [Capítulo heredado: 6-ejemplos-codigo.md](references/6-ejemplos-codigo.md) — contenido íntegro conservado.
- [Capítulo heredado: 12-authz-security.md](../security/references/12-authz-security.md) — contenido íntegro conservado.

## Mejoras técnicas verificables — 2026

**12. Controller NestJS completo.** ✅ Método `listProducts()`, `@UseGuards()` para seguridad real, `@ApiOkResponse()` para documentación, `ZodQueryPipe` sobre entradas; output `Promise<ListProductsResponseDto>`. ❌ Suponer que `@ApiBearerAuth()` autoriza, usar `@Public()` por comodidad o meter consultas Drizzle en controller.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).

## Referencia normativa transversal — endpoints y comentarios (2026-10-25)

- **Contrato REST**, métodos GET/POST/PUT/PATCH/DELETE, recursos, filtros, paginación, errores, authZ por objeto/tenant, concurrencia, idempotencia, jobs, auditoría y quality gates: [Diseño Senior/Staff](../../../../standards/api/rest-endpoint-design.md).
- **Comentarios locales, JSDoc/TSDoc, PHPDoc y TODO/FIXME**: [Comentarios y docstrings](../../../../standards/engineering/code-comments-and-docstrings.md). No copiar OpenAPI entero a un controller ni comentar operaciones triviales.
- Mantener los ejemplos de este stack y los contratos legacy existentes; aplicar la norma a cambios aprobados y probar compatibilidad.

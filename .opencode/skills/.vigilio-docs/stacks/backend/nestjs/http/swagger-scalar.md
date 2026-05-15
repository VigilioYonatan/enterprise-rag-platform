# NestJS: OpenAPI, Swagger y Scalar desde los contratos

> **Convención vigente HTTP:** schemas base solo para entidades; entradas/salidas HTTP en `*.dto.ts`; DTO `*.dto.ts` con Zod y tipo inferido en el mismo archivo; adaptador `*.doc.ts` opcional NestJS. [Fuente normativa](../../../../standards/api/http-dtos-and-contracts.md). No asumir exports publicados renombrados sin migración.


Swagger es la **especificación** generada por Nest; Scalar es una interfaz que la renderiza. No instalar Scalar dentro de cada controller ni crear schemas paralelos. Los DTO `*.doc.ts` se derivan de Zod cuando el adaptador lo necesita.

```typescript
// Adaptador de documentación (imports disponibles en el consumidor)
export class ListProductsResponseDocDto
  extends createZodDto(listProductsResponseDto) {}

@ApiOkResponse({ type: ListProductsResponseDocDto })
// Tipado de retorno en el método:
// Promise<ListProductsResponseDto>
```

El bootstrap registra la generación de `SwaggerModule.createDocument` con bearer security, operation IDs y versiones; expone OpenAPI a Scalar mediante una ruta protegida por entorno. La ruta concreta (`/docs-json`, `/openapi.json`) debe comprobarse contra el proyecto. NestJS 12 incluye soporte Standard Schema: elegir **un** mecanismo de documentación/validación según baseline, evitar dos pipelines Zod incompatibles.

## Gates de contratos

1. Swagger/OpenAPI exportado desde build reproducible.
2. Contract test comprueba success/error, filtros, fecha ISO, paginación y exposición de campos.
3. Diff alerta rupturas para cliente React/Expo/Laravel y rutas existentes.
4. Restricción de docs privadas en producción cuando proceda.

✅ Correcto: un `productSchema` + `.pick()` alimenta responses y OpenAPI/Scalar; el DTO adapter no duplica campos.

❌ Incorrecto: Swagger manual distinto de Zod, inferir auth real de `@ApiBearerAuth`, asumir que `@ZodResponse` es solo decorador de documentación.

[Contratos](../../../../standards/api/contracts.md), [Controllers](controllers.md). Fuentes externas: https://docs.nestjs.com/openapi/introduction y https://docs.nestjs.com/openapi/operations .

## Procedencia documental preservada

- [Capítulo heredado: 27-dtos-request-response.md](references/27-dtos-request-response.md) — contenido íntegro conservado.
- [Capítulo heredado: 47-scalar-openapi-produccion.md](references/47-scalar-openapi-produccion.md) — Scalar y OpenAPI seguros en producción.

- [Capítulo heredado: 29-config-nest-zod-aws.md](../runtime/references/29-config-nest-zod-aws.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).


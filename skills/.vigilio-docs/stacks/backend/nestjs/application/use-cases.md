# NestJS: Application Services con lenguaje de negocio

> **Referencia canónica actualizada:** [Casos de uso, tipos y dominio](../architecture/schema-derived-types.md) · [controller/response](../http/semantic-dtos-and-pagination.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

Un application service orquesta autorizaciones, repositorios, transacciones y resultado de la operación. Las invariantes que protegen cambios de estado viven en el agregado cuando existe complejidad real.

```typescript
// application/services/product.service.ts — no importa DTO HTTP
@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_READ_REPOSITORY)
    private readonly productRepository: ProductReadRepository,
  ) {}

  async listProducts(
    criteria: ProductCriteria,
  ): Promise<PageResult<ProductSummary>> {
    return this.productRepository.findByCriteria(criteria);
  }
}
```

El Controller traduce `ListProductsQueryDto` ya validado a `ProductCriteria`, incluyendo tenant/ACL desde identidad **autorizada**, y Presentation adapta `PageResult<ProductSummary>` con `ProductPresenter.presentProductsPage()` a `ListProductsResponseDto`. No retornar `success: true` ni DTO de HTTP desde Application. [Fronteras canónicas](../../../../standards/api/http-dtos-and-contracts.md).

El ejemplo presupone que el adapter aplica tenant/permisos en la consulta real. Las proyecciones públicas las crea Presentation desde tipos internos; no duplicar un DTO por operación cuando el JSON es el mismo. Para mutaciones, nombres `approvePolicy`, `cancelOrder`, `processProduct` y patrón de transacción + agregado.

✅ Correcto: `Promise<PageResult<ProductSummary>>` estáticamente tipado sin `.parse()` automático por salida; devolver read model antes de presentación cuando mejora independencia.

❌ Incorrecto: `async index()` si la operación refleja caso de uso semántico o usar repository retornando objetos con semántica HTTP `statusCode`/`message` sin justificación.

Testing: mock de repository port, casos de error y contrato, integraciones que comprueban SQL real. [DDD](../architecture/ddd-implementation.md).

## Procedencia documental preservada

- [Capítulo heredado: 21-golden-path-feature.md](../architecture/references/21-golden-path-feature.md) — contenido íntegro conservado.
- [Capítulo heredado: 6-ejemplos-codigo.md](../http/references/6-ejemplos-codigo.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Comportamiento:** Un caso de uso implementa una operación semántica y valida invariantes, no un CRUD genérico.
2. **Autorización:** Orquestar permisos de entrada y reforzar filtros por recurso en puerto de lectura.
3. **Transacción:** Definir unidad atómica y disparo de eventos tras commit.
4. **Idempotencia:** Garantizar respuesta estable ante reintento según regla de negocio.
5. **Dependencias:** Inyectar reloj, repositorio, gateway y transaction boundary por port mínimo.
6. **Prueba:** Simular puertos para invariantes, y usar integración real para DB/outbox.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Opcionalidad de presenter 2026

Para un CRUD cuya proyección es sencilla y segura, **no exigir** un `ProductPresenter` ni `presenters/` separado: Application devuelve tipos propios sin HTTP; Presentation puede proyectar con DTO Zod y helpers HTTP. Crear mapper/Presenter solo si hay múltiples formatos, transformación compleja o proyección reutilizable. [Owner REST](../../../../standards/api/rest-endpoint-design.md).

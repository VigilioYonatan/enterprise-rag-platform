# NestJS: estructura DDD de features y responsabilidad

## Golden path por feature

```text
src/modules/products/
├── domain/                     # solo con reglas de negocio reales
│   ├── entities/product.entity.ts
│   ├── enums/product-status.enum.ts
│   ├── constants/product-rules.constant.ts
│   ├── types/product-id.type.ts
│   └── exceptions/invalid-product-state.error.ts
├── application/
│   ├── schemas/product.schema.ts
│   ├── dtos/product-list.response.dto.ts
│   ├── service/product.application-service.ts
│   └── repositories/product.repository.interface.ts
├── infrastructure/
│   ├── http/controllers/product.controller.ts
│   ├── http/docs/product-list.doc.ts
│   ├── persistence/drizzle/product.repository.ts
│   └── cache/product-cache.adapter.ts
└── product.module.ts
```

La estructura es un patrón, no ordena crear carpetas vacías; `application/service/` singular mantiene compatibilidad con el Golden Path existente. Restringir imports para que dominio no conozca Nest, Drizzle, HTTP ni Redis; `types/` y `constants/` pertenecen a la capa propietaria de cada definición (no a un util global).

## Reglas que preservamos

- Nombres de caso de uso: `listProducts`, `approvePolicy`, `cancelOrder`, `registerEndorsement` según lenguaje del dominio.
- En CRUD trivial se pueden conservar métodos de repository `save/findById`; no forzar un agregado ceremonial.
- Contratos Zod request/response son schemas compartibles con frontend y OpenAPI; un tipo de dominio nunca importa adaptadores HTTP.
- Framework y ruta de despliegue son decisiones distintas: NestJS puede ejecutarse en EKS o Lambda; referencias AWS viven en `platform/`.
- Si hay worker, crear entrada explícita al mismo caso de uso y autorización contextual, no reusar controller HTTP.

## Anti-patrones y evidencia

✅ Correcto: `ProductController.listProducts()` delega a aplicación; tests ejercitan invariantes sin Nest.

❌ Incorrecto: mover TODO a `shared/`, insertar `@Injectable()` en entidades o publicar filas ORM como respuesta HTTP.

**Verificación:** imports prohibidos en dominio, tests unitarios, integración de ports, lint/typecheck y diff OpenAPI. Consultar [arquitectura compartida](../../../../foundations/architecture/clean-architecture.md) y [golden path](../golden-path-feature.md).

## Procedencia documental preservada

- [Capítulo heredado: 1-estructura-archivos.md](references/1-estructura-archivos.md) — contenido íntegro conservado.
- [Capítulo heredado: 21-golden-path-feature.md](references/21-golden-path-feature.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).


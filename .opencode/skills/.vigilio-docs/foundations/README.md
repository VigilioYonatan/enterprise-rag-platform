# Fundamentos de arquitectura Vigilio

Este directorio es propietario de conceptos independientes del lenguaje. No se vuelven a definir al añadir PHP, Java o Go.

- [DDD pragmático](architecture/ddd.md)
- [SOLID sin sobreingeniería](architecture/solid.md)
- [Arquitectura hexagonal y Clean](architecture/hexagonal.md)

**Regla de precedencia:** decisión humana aprobada y trazable en el proyecto > norma transversal aplicable > adaptación por stack > ejemplos ilustrativos. Si las fuentes entran en conflicto, el agente reporta el conflicto, no elige arbitrariamente.

Migración conservadora: las guías históricas `stacks/backend/nestjs/` permanecen íntegramente consultables; no se suprimen ejemplos por mover su ownership lógico.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).


## Guías canónicas incorporadas en la migración NestJS 2026

Arquitectura compartida: [Clean Architecture](architecture/clean-architecture.md), [CQRS](architecture/cqrs.md), [calidad transversal](engineering/code-quality.md).

✅ Correcto: enlazar el propietario único de cada decisión. ❌ Incorrecto: duplicar una norma universal en cada framework.

- [DRY de código: fuente del conocimiento](architecture/dry.md) — no confundir con la política DRY documental.

# Quality gates — nombres semánticos, contratos DRY, SQL y DDD

Esta norma compartida define qué **evidencia** exigir; implementaciones propias de [NestJS](../../stacks/backend/nestjs/testing/e2e-http.md), [Laravel](../../stacks/backend/laravel/testing/e2e-http.md) y clientes. [Norma de nombres](../engineering/naming-and-boundaries.md), [SQL](../data/sql-performance.md).

## Matriz mínima de 30 casos relevantes

| Área | Casos que debe demostrar la implementación | Evidencia |
|---|---|---|
| Casos de uso | 1. operación semántica; 2. transición válida; 3. transición prohibida; 4. doble petición; 5. error de dominio tipado | Unit + contract |
| Controller | 6. parse de ID; 7. input inválido; 8. auth 401; 9. permiso 403; 10. no revelar recurso ajeno 404 | HTTP e2e |
| DTOs | 11. `.pick` de schema propietario; 12. sólo campos allowlist; 13. response reutilizada sin clones; 14. strings/fechas ISO; 15. datos PII excluidos | Contract snapshots |
| Pagination | 16. default limit; 17. reject cero/negativos; 18. offset/cursor separados; 19. orden determinista; 20. conteo filtrado correcto | API + SQL |
| Repository | 21. filtros tenant; 22. `findById` not found; 23. `save` atómico; 24. concurrencia; 25. no N+1 | PostgreSQL integración |
| Cache | 26. key tenant/auth; 27. invalidación; 28. cache caído; 29. TTL; 30. stale/replay | Integration + logs |
| Operaciones extra | 31. outbox; 32. SQL lote e idempotencia; 33. copy/staging; 34. rollback; 35. EXPLAIN y WAL | Load/ops |
| Compatibilidad | 36. evento versionado; 37. OpenAPI consumer; 38. PHP enum; 39. Zod infer; 40. hooks/lib externos sin renombrar | Contract + static |

✅ **Correcto:** elegir el subconjunto que aplica, completar pruebas positivas y negativas, adjuntar SQL/HTTP real y marcar `PASS | FAIL | NOT_RUN | BLOCKED` por criterio.

❌ **Incorrecto:** reportar 40 PASS tras ejecutar solo lint de Markdown, inventar pruebas de PostgreSQL, renombrar API ajena, hacer prueba exclusivamente del camino feliz o asumir que TypeScript parsea datos.

## Condiciones de release

1. No hay duplicación de esquemas por entidad ni unión de estados TypeScript hardcodeada fuera del schema propietario.
2. HTTP/Service usan acciones `getProduct`, `listProducts`, `approvePolicy`; repositorio `findById`, `save`. Métodos de framework (Eloquent `update`) no se penalizan.
3. Identificadores locales y campos estructurados `snake_case`, métodos `camelCase`, tipos/clases `PascalCase` según [excepciones](../engineering/naming-and-boundaries.md).
4. DB: migración generada comprobada, tenant y ACL por consulta, reglas de concurrencia y benchmark cuando se cambien índices/carga.
5. Los cambios del ZIP documentan hash previo y nuevo, categorías revisadas, errores y pruebas no ejecutadas, sin borrar contenido anterior.

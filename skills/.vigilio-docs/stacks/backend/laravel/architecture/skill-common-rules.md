# Reglas de ejecución para skills Laravel (fuente única)

Este documento guarda las reglas **específicas de trabajo en Laravel** que antes se repetían entre `php-laravel-*`. Leer también las reglas compartidas de [DDD y nombres](../../../../standards/engineering/naming-and-boundaries.md), [DTOs HTTP](../../../../standards/api/http-dtos-and-contracts.md), [SQL](../../../../standards/data/sql-performance.md) y [evidencia](../../../../governance/complete-work-coverage-policy.md).

## Flujo común de ejecución Laravel

- Leer el workflow y la feature vecina del consumidor antes de modificar código; la skill elegida añade sus pasos propios.
- Los métodos de casos de uso son semánticos (`listProducts`, `registerProduct`, `approvePolicy`, `cancelOrder`); Domain expresa invariantes mediante `approve`, `cancel` o `activate`.
- Mantener Domain independiente de Laravel, Eloquent, Redis y transporte HTTP; los adapters son infraestructura.
- Usar enums PHP, Value Objects, constantes y tipos solo cuando aportan semántica; no trasplantar schemas Zod a PHP.
- Spatie Data o FormRequest validan contratos de frontera cuando corresponde; Eloquent maneja persistencia. Las APIs publicadas necesitan compatibilidad y tests.
- Para cargas grandes comprobar [bulk Laravel](../persistence/bulk-ingest.md); no reemplazar PostgreSQL por SQLite y declarar equivalencia.

## Evidencia y seguridad

- Registrar ruta cambiada y comandos realmente ejecutados: `composer validate --strict`, `composer audit --locked`, formato, análisis estático y unit/feature/integration/contract tests según impacto.
- No registrar secretos, tokens ni PII en logs o caché. No activar Horizon/Sanctum/Reverb automáticamente ni mezclar configuraciones ESLint/Vitest de Node con el stack PHP.
- Si faltan dependencias, infraestructura o aprobación, reportar `NOT_RUN` / `BLOCKED`, nunca `PASS` supuesto.

✅ **Correcto:** la skill Laravel de persistencia enlaza esta norma y aporta su prueba de índices, locks y transacciones, sin repetir toda la política DDD.

❌ **Incorrecto:** diez skills Laravel con textos normativos copiados, DTO PHP haciendo de ORM o suites SQLite presentadas como evidencia PostgreSQL.

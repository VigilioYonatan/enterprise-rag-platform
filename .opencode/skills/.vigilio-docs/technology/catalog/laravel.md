# Laravel — compatibilidad y decisiones del framework

> **Versiones centralizadas:** consultar [technology/versions.md](../versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

- Utilizar la rama estable aprobada en [versions.md](../versions.md); comprobar releases oficiales y dependencias reales antes de actualizar.
- Comprobar la matriz oficial PHP/Laravel contra el runtime aprobado en [versions.md](../versions.md). No confundir soporte declarado del framework con compatibilidad probada del sistema completo.
- Adapters propios del framework: Form Request + Policies + API Resource, Eloquent/PostgreSQL, Container, Cache Repository, Jobs, Events, Sanctum cuando aplique.
- **No** imponer CQRS estricto, Horizon, Reverb, Redis o Sanctum en todos los proyectos.
- DDD pragmático: controllers delgados, named use cases, domain invariants, repositorios por agregado cuando aportan valor.
- Contratos externos: OpenAPI de Vigilio (Zod como origen TS) y respuestas conformes desde Laravel con contract tests.

Fuentes: [Laravel release notes](https://laravel.com/docs/13.x/releases), [releases GitHub](https://github.com/laravel/framework/releases), [Packagist](https://packagist.org/packages/laravel/framework).

## ✅ Correcto / ❌ Incorrecto

- ✅ Framework 13 según baseline aprobado y `composer audit --locked` + pruebas PHP reales.
- ❌ Tratar compatibilidad declarada del framework como certificación de todos los paquetes.
- **Gate:** fijar versiones concretas en `composer.lock` y reportar pruebas no ejecutadas.

## Librerías: política por capacidad (no instalar todo)

| Capacidad | Elección primaria | Condición |
| --- | --- | --- |
| Autenticación API | Sanctum 4.x | Solo si se eligió ese modelo de identidad; mantener Policies de recurso |
| Test | Pest 5.x, plugin Laravel | Resolver PHPUnit con Composer; no fijarlo independientemente sin lock |
| Estática y formato | Larastan 3.x/PHPStan 2.x, Pint 1.x | Quality gate revisado |
| Documentación | Scalar desde OpenAPI generado y versionado | No inventar segunda fuente en PHP |
| Queue Redis | Horizon 5.x | Solo driver Redis, nunca asumir soporte SQS |
| Realtime | Reverb 1.x | Opt-in con seguridad de canales |
| Observabilidad | Paquetes OpenTelemetry PHP compatibles | Verificar spans y exportación; no basta instalar SDK |

**Migración de Laravel 12 a 13:** resolver `composer update --dry-run`, ejecutar tests, revisar breaking changes de providers, middleware, policies y colas, exportar/diff OpenAPI y comprobar runtime PHP-FPM real. Mantener baseline en estado `proposed` hasta superar pruebas.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


# Implementaciones por stack

> **Versiones centralizadas:** consultar [technology/versions.md](../technology/versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

Esta carpeta contiene **cómo se escribe y prueba el código real** con cada tecnología, no reescrituras de DDD ni SOLID.

- [Backend Laravel 13 / PHP 8.5](backend/laravel/README.md): Controllers, Form Requests, DTOs, recursos, services/use cases, domain, cache, PostgreSQL, seguridad, Scalar, OTel, CI y tests.
- [Backend NestJS (guía canónica histórica conservada)](backend/nestjs/references/README.md): implementación Node/Nest vigente mientras se migra su ubicación con pruebas de compatibilidad.
- Web/móvil conservan [frontend web](frontend/web-mfe/README.md) y [mobile](mobile/expo/README.md).

No migrar, borrar o cambiar rutas antiguas sin una operación posterior con mapa 1:1 y actualización validada de todas las skills.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).


## Guías canónicas incorporadas en la migración NestJS 2026

Para NestJS, la implementación canónica reside en [stacks/backend/nestjs](backend/nestjs/README.md), no en los capítulos históricos.

✅ Correcto: enlazar el propietario único de cada decisión. ❌ Incorrecto: duplicar una norma universal en cada framework.

- [Rust: Cargo y especializaciones](rust/README.md) para CLI, backend, Desktop/GPUI y systems.
- [C++: CMake y especializaciones](cpp/README.md) para core, Qt Widgets y Qt WebEngine opcional.

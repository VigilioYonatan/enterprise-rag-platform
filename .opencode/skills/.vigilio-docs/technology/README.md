# Catálogo de tecnología y baseline aprobable

> **Versiones centralizadas:** consultar [technology/versions.md](versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

El objetivo es evitar repetir versiones en todas las guías. [PHP 8.5](catalog/php.md), [Laravel 13](catalog/laravel.md), [Composer](catalog/composer.md) y [NestJS existente](catalog/references/43-backend-technologies-skill-2026.md).

La fuente machine-readable **propuesta** es [backend-laravel.yaml](baselines/backend-laravel.yaml). El estado es `proposed`, no aprobado: no hay un `composer.lock` ni CI de consumidor dentro de estos ZIP que demuestre resolución de todas las dependencias.

Para NestJS se conserva el baseline cross-repo histórico en [Compatibilidad](../COMPATIBILITY.md); no se modifica la ejecución de consumidores existentes con una recomendación de Laravel.

Para Node/NestJS, ver [Node LTS y NestJS](catalog/nodejs.md) y [baseline candidato no aplicado](baselines/backend-nestjs.yaml).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).


## Guías canónicas incorporadas en la migración NestJS 2026

Para NestJS usar [catálogo](catalog/nestjs.md) y [baseline candidato Markdown](baselines/backend-nestjs-2026.md), sin modificar automáticamente consumidores.

✅ Correcto: enlazar el propietario único de cada decisión. ❌ Incorrecto: duplicar una norma universal en cada framework.

## Catálogo de librerías por versión

[Índice de librerías, migraciones y ejemplos ✅/❌](libraries/README.md). Para TS [guía del lenguaje](catalog/typescript.md), para PHP [guía del lenguaje](catalog/php.md). No duplicar aquí sus APIs.

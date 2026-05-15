# Composer y dependencias reproducibles

> **Versiones centralizadas:** consultar [technology/versions.md](../versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

- Mantener `composer.json` con constraints compatibles y **`composer.lock` commiteado**. Evitar combinar últimas versiones individualmente sin resolver el conjunto.
- `composer validate --strict`, `composer install --no-interaction --prefer-dist --no-progress`, `composer audit --locked`; desplegar con flags adecuados `--no-dev --classmap-authoritative` tras checks.
- Analizadores: Larastan 3.x con PHPStan 2.x, Pint 1.x. Pest 5.x requiere PHP >= 8.4 y se basa en PHPUnit 13.x. Pest plugin Laravel 5.x.
- `scalar/laravel` 0.4.1 compatible Laravel 13, PHP >= 8.2 (verificar nueva versión antes de desplegar). Sanctum 4.x sólo si es la estrategia elegida. Horizon 5.x **solo Redis**. Reverb 1.x **solo realtime**. OTel auto Laravel 1.x requiere verificación de instrumentación instalada.
- Evitar forzar `phpunit/phpunit` a un patch independiente de la resolución de Pest. PHP extensions y restricciones de arquitectura se fijan por proyecto.

Fuentes: [Pest Upgrade 5](https://pestphp.com/docs/upgrade-guide), [Packagist framework](https://packagist.org/packages/laravel/framework), [Scalar Packagist](https://packagist.org/packages/scalar/laravel), [Larastan](https://github.com/larastan/larastan).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Versiones basadas en lockfiles, escaneo dependencias, CI con gates reales, rollback y aprobaciones.
- ❌ **Incorrecto:** Declarar `PASS` sin ejecutar gates, instalar dependencias latest sin compatibilidad o subir secretos a pipelines.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../standards/engineering/refactoring-existing-code.md).

## Semántica correcta de Composer

- `composer.json` establece restricciones aprobadas; `composer.lock` contiene versiones resueltas para la aplicación y se versiona.
- `composer install` reproduce lock, `composer update` cambia resolución: revisar su diff antes del commit.
- `composer audit --locked` identifica avisos en dependencias bloqueadas; no sustituye SAST, tests, permisos ni revisión de paquetes.
- `composer check-platform-reqs` debe ejecutarse en una imagen con PHP/extensiones del runtime objetivo.

✅ Usar `--no-dev` al construir la capa runtime después de probar; ❌ regenerar `composer.lock` silenciosamente en deployment o ignorar vulnerabilidades sin excepción aprobada.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


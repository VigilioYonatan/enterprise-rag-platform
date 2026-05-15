# Laravel Products — referencia de código verificable por sintaxis

**Scope:** colección de clases PHP para copiar/adaptar dentro de una aplicación Laravel 13 **ya inicializada**. No es una aplicación que se pueda servir o probar sin Composer, bootstrap Laravel, provider, migraciones y entorno. `php -l` valida sintaxis y el test de dominio sin framework se puede ejecutar con `php tests/smoke-domain.php`.

- `src/Domain`: entidad que protege transición real, enums, exception, constantes.
- `src/Application`: DTOs `readonly`, ports, use case semántico `ProcessProduct`, y lectura `ListProducts`.
- `src/Infrastructure`: Eloquent, FormRequest, Resources, controller, cache adapter y provider (adaptar namespaces y auth al consumidor).
- Migraciones, `APP_KEY`, PostgreSQL, Redis, Composer lock y tests de integración deben ser aportados por la aplicación host. No confundir estos ejemplos con un release listo para producción.

```bash
find src tests -name '*.php' -exec php -l {} \;
php tests/smoke-domain.php
```

La **norma** es [DDD](../../foundations/architecture/ddd.md) y [Laravel Golden Path](../../stacks/backend/laravel/golden-path-feature.md). No instalar dependencias durante builds documentales.

## Referencia de cache y security

`CachedListProducts` utiliza `ProductCache` e instrumenta fallback para fallos del adaptador. `RedisProductCache` muestra `INCR` sin wildcard y evita duplicar TTL. `ProductPolicy` es un ejemplo que debe vincularse al modelo real de usuario de la app. `ProductServiceProvider` vincula ports a adapters pero el host debe registrar el provider.

**Importante:** la invalidación tras commit requiere conectarse al workflow de `ProcessProduct`/outbox del consumidor. Este ejemplo *no* garantiza invalidación durable ni auto-registro; la guía [cache-invalidation](../../stacks/backend/laravel/persistence/cache-invalidation.md) detalla esos gates. Nunca mezclar políticas de cache/DB sin pruebas de integración.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../standards/engineering/refactoring-existing-code.md).

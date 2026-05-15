# PHP — runtime, extensiones y buenas prácticas

> **Versiones centralizadas:** consultar [technology/versions.md](../versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

- La **versión PHP objetivo y la alternativa soportada** se mantienen exclusivamente en [versions.md](../versions.md); no arrancar despliegues nuevos sobre un patch vulnerable.
- Elegir una línea alternativa solo cuando librerías/extensiones bloqueen la línea recomendada; registrar la excepción y revisar sus avisos de seguridad.
- **Recomendación:** usar el baseline de [versions.md](../versions.md) únicamente después de superar pruebas de extensiones, ABI y `composer.lock`; registrar fallback controlado.
- Definir `declare(strict_types=1);`, tipos explícitos, `readonly`, `enum`, fechas `DateTimeImmutable`, dinero decimal exacto, excepciones de dominio.
- Confirmar `pdo_pgsql`, `mbstring`, `openssl`, `ctype`, `json`, `xml` según paquete, driver Redis/phpredis y agente OTel según despliegue; no inventar requisitos obligatorios para todos.

Fuentes: [php.net downloads](https://www.php.net/downloads.php) y [notas oficiales de seguridad](https://www.php.net/releases/). Verificado 2026-10-23. Actualizar el baseline previo a cada release, no hardcodear patch en doc de controller.

## ✅ Correcto / ❌ Incorrecto

- ✅ Declarar versión PHP y extensiones resueltas por composer.lock, ejecutar tests y análisis estático.
- ❌ Elegir el patch más nuevo sin validar ABI/extensions o publicar sobre una versión vulnerable.
- **Gate:** fijar versiones concretas en `composer.lock` y reportar pruebas no ejecutadas.

## Requisitos de ejecución verificables

| Gate | Evidencia |
| --- | --- |
| Runtime | `php -v`, SAPI FPM/CLI y imagen de contenedor por digest |
| Extensiones | `php -m`, `composer check-platform-reqs` sobre runtime de destino |
| Dependencias | `composer.lock`, `composer install --no-interaction` y `composer audit --locked` |
| Estática | Larastan + Pint, tipos explícitos y `strict_types` |
| Integración | Pest con PostgreSQL, Redis/Valkey y permisos de filesystem reales |

**existente:** evitar convertir automáticamente fechas `DateTime` mutables a `DateTimeImmutable` sin revisar serialización y tests, ni sustituir casts monetarios por `float`. Añadir adapters para librerías que todavía no soportan 8.5.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


## Tipado, errores, seguridad y legado (PHP 8.4/8.5)

✅ Correcto:

```php
<?php
declare(strict_types=1);
final readonly class Money { public function __construct(public int $amount_cents) {} }
function calculatePremium(Money $base_amount): Money { return new Money(intdiv($base_amount->amount_cents * 118, 100)); }
```

❌ Incorrecto:

```php
<?php
$amount = (float) $_POST['amount']; // float monetario inseguro
$query = "SELECT * FROM users WHERE id = '" . $_GET['id'] . "'"; // SQL injection
```

- `strict_types`, propiedades tipadas, tipos retorno, enums respaldados y Value Objects para invariantes justificadas.
- Preferir `match`, nullsafe `?->`, constructor promotion, readonly en DTOs inmutables y `DateTimeImmutable`; verificar compatibilidad al modernizar legacy.
- Prepared queries vía DBAL/Eloquent, escapes output según contexto HTML/JSON, `password_hash()` y `password_verify()` para credenciales.
- Nunca `eval`, `unserialize` sobre fuente no confiable, consultas concatenadas, `extract` arbitrario ni silenciamiento `@` como normalidad.
- `composer audit --locked`, PHPStan/Larastan + Pint + Pest, tests con DB/Redis reales, control de upgrades con `composer.lock`.
- Evitar clases omnipotentes y arrays sin tipos cuando hay contratos importantes. En Laravel Spatie Data transporta, Eloquent persiste, Domain protege invariantes.
- Deprecaciones de PHP se determinan **por versión instalada** y release notes; no remover API sin pruebas y sin transición de consumidores.

Para framework enlazar [Laravel](../libraries/laravel-framework.md); para DTOs [Spatie](../libraries/spatie-laravel-data.md); no duplicar sus implementaciones.


## PHP 8.5: patrones reales para mantener DDD sin código legado

### Entidades, repositorios y enums

**✅ Correcto**

```php
<?php
declare(strict_types=1);

enum OrderStatus: string
{
    case Pending = 'pending';
    case Cancelled = 'cancelled';
    case Shipped = 'shipped';
}

final class OrderEntity
{
    public function __construct(
        public readonly string $id,
        private OrderStatus $status,
    ) {}

    public function cancel(): void
    {
        if ($this->status === OrderStatus::Cancelled) return; // Solo si la idempotencia está aprobada.
        if ($this->status === OrderStatus::Shipped) throw new DomainException('Already shipped');
        $this->status = OrderStatus::Cancelled;
    }
}
```

**❌ Incorrecto:** escribir `public $status = 'pending'` en cada Controller, pasar array sin validación a Domain o ejecutar SQL desde la entidad.

### I/O y transacciones

- El Controller recibe el DTO Spatie Data de HTTP; Application decide `cancelOrder`, Domain hace `cancel()` y el Repository Port define persistencia. Eloquent es adaptador de Infrastructure.
- `DB::transaction` y condiciones atómicas/optimistic locking protegen invariantes concurrentes; `Model::save()` aislado no siempre basta.
- Para 1M registros usar `chunkById`, `cursor`/streaming y `upsert` por lotes tras medir; `COPY` para PostgreSQL masivo si encaja. No traer toda la tabla a memoria.
- Validar cada operación SQL por `tenant_id`, política de usuario e índices de acceso. No confiar en un `tenant_id` enviado por el cliente.

### Excepciones, nullability y colecciones

**✅ Correcto**

```php
public function getProduct(string $product_id, string $tenant_id): ProductEntity
{
    return $this->product_repository->findById($product_id, $tenant_id)
        ?? throw new ProductNotFoundException();
}
```

Usar `?ProductEntity` en el Port donde la ausencia es normal y `ProductEntity` en el caso de uso cuando la ausencia se convierte en error semántico. Mantener `camelCase` para métodos y `snake_case` para variables PHP Vigilio; en la implementación PHP se respetan los nombres de interfaz de terceros.

### Modernización y quality gates

- `composer validate --strict`, `composer audit`, Pint, PHPStan/Larastan y Pest/PHPUnit como gates diferentes.
- No usar `@` para silenciar errores ni `mixed` indiscriminadamente; verificar reglas de PHPStan, casts y PHPDoc de colecciones.
- `readonly` no vuelve inmutable a un objeto anidado; el agregado sigue custodiando reglas de transición.
- PHP 8.5.12 estable en 2026-10-25 no obliga migrar todos los consumidores desde 8.4.27. Resolver Composer, extensiones y plataforma de despliegue antes de aprobar.

[PHP oficial](https://www.php.net/downloads.php) · [Laravel](../../stacks/backend/laravel/README.md) · [CI/CD Laravel](../../stacks/backend/laravel/quality/ci-quality.md).

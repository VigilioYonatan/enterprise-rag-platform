# Laravel: Enums, Constants, Types y Value Objects

No acumular definiciones globales en controllers/services. No crear carpetas vacías ni duplicar enums en contratos públicos Zod.

```php
<?php
// Domain/Enums/ProductStatus.php

declare(strict_types=1);
namespace App\Modules\Products\Domain\Enums;

enum ProductStatus: string
{
    case Pending = 'pendiente';
    case Processed = 'procesado';
    case Cancelled = 'anulado';
}
```

```php
<?php
// Domain/Constants/ProductRules.php

declare(strict_types=1);
namespace App\Modules\Products\Domain\Constants;

final class ProductRules
{
    public const MAX_POLICY_LENGTH = 30;
}
```

```php
<?php
// Domain/Types/ProductAuditContext.php

declare(strict_types=1);
namespace App\Modules\Products\Domain\Types;

final readonly class ProductAuditContext
{
    public function __construct(
        public string $actorId,
        public \DateTimeImmutable $occurred_at,
    ) {}
}
```

**Criterios:** `Enums/` estados cerrados; `Constants/` invariantes literales de negocio; `Types/` datos compuestos con semántica; `ValueObjects/` tipos que **se validan a sí mismos** (dinero exacto, email, identificadores). TTL Redis y variables AWS son configuración de infraestructura, nunca constantes del dominio. En TS preservar `z.infer` junto a `productSchema`, no regenerar el tipo en `types/`.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Laravel: Enums, Constants, Types y Value Objects

✅ **Correcto:** Para **Laravel: Enums, Constants, Types y Value Objects**, mantener Domain desacoplado de Eloquent y ejecutar Composer/Pint/PHPStan/tests.

❌ **Incorrecto:** En **Laravel: Enums, Constants, Types y Value Objects**, duplicar DTOs PHP o reutilizar comandos de Node como si fueran Laravel.

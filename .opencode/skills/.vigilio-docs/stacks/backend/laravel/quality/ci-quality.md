# Calidad PHP y Laravel: Composer, Pint, Larastan, CI

## Dependencias con responsabilidad

Versiones PHP/Laravel tomadas de [technology/versions.md](../../../../technology/versions.md), sujetas a composer.lock/extensiones. Pest 5 + plugin Laravel 5 y PHPUnit 13 **solo si se utiliza PHP 8.4+ y las dependencias instaladas lo admiten** (PHP 8.3: comprobar la rama Pest 4 compatible en lockfiles), Larastan 3 + PHPStan 2, Pint 1. Scalar, Sanctum, Horizon, Reverb y OTel son capacidades opcionales, no dependencias base universales.

```bash
composer validate --strict
composer audit --locked
vendor/bin/pint --test
vendor/bin/phpstan analyse
vendor/bin/pest --testsuite=Unit,Feature
```

Ajustar `testsuite` a estructura real del consumidor. Para contenedores: `composer install --no-dev --prefer-dist --classmap-authoritative` después de pruebas y lock; integrar SBOM, SCA, imágenes pinneadas por digest, secret scanning y provenance. Ejecutar integración PostgreSQL y Redis/Valkey para codepaths afectados; `php -l` no certifica Symfony/Laravel DI.

Para formato PSR-12 y código tipado, `declare(strict_types=1);`, `readonly` cuando aplique, `enum` nativo y excepciones explicitas. Larastan nivel acordado por repo; no fijar niveles imposibles sin validar el código real.

Fuentes y fecha en [baseline](../../../../technology/baselines/backend-laravel.yaml). Ningún package.json/npm actual de Vigilio se cambia por este baseline PHP.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Refactorizar por comportamiento y evidencia; `map` para transformación, `for...of`/`foreach` para efectos, `for` indexado cuando aporta.
- ❌ **Incorrecto:** Prohibir todo `for` sin contexto o migrar código existente sin tests de caracterización.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

## Gates de pull request y release

```bash
composer validate --strict
composer audit --locked
vendor/bin/pint --test
vendor/bin/phpstan analyse
vendor/bin/pest
# Además: PostgreSQL real, Redis, contrato OpenAPI, seguridad y cobertura de errores.
```

`composer.lock` es obligatorio en aplicación; comprobar extensiones PHP y versión runtime del runner. Definir una baseline de Larastan aprobada y no regenerarla sin revisión.

✅ Fallar PR ante problemas nuevos; ❌ dejar que warnings de PHPStan o migraciones de schema sean "informativos" cuando afectan seguridad. Gate: adjuntar nombre de commit, runtime, dependencias, tests y errores no ejecutados.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).

## Pipeline Laravel dedicado: secuencia de jobs y gates

El workflow vive **en el repositorio Laravel consumidor** (`.github/workflows/laravel-ci.yml`); Vigilio conserva el estándar. La fuente única de versiones es [technology/versions.md](../../../../technology/versions.md) y la compatibilidad real depende de `composer.lock`, PHP extensions y la matriz oficial. No copiar jobs de NestJS/Node ni instalar paquetes npm en un proyecto PHP puro.

| Job | Herramienta | Gate / razón |
| --- | --- | --- |
| Dependencias | `composer validate --strict`, `composer install` con lock | No resolver versiones dinámicas en cada CI |
| Seguridad dependencias | `composer audit --locked` | Bloquear vulnerabilidades según política |
| Estilo | `vendor/bin/pint --test` | Detectar formato sin reescribir PR |
| Tipos | Larastan/PHPStan (`vendor/bin/phpstan analyse`) | Detectar errores de tipos/repository ports |
| Tests unitarios | Pest o PHPUnit instalado en proyecto | Probar dominio y application aislada |
| Tests Feature | `php artisan test` / Pest | Controladores, validación, 401/403, tenant |
| Integración | PostgreSQL de versión baseline; Valkey/Redis si se usa | Índices, locks, transacciones, caché y workers |
| Contrato | OpenAPI diff y consumer contract tests | No publicar cambios incompatibles inadvertidos |
| Release | Imagen escaneada, digest, SBOM/attestation, OIDC | Artifact inmutable y promoción controlada |

## Workflow de ejemplo para PR (adaptar y fijar SHA)

```yaml
name: Laravel CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  php-quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:18 # producción: fijar digest aprobado
        env:
          POSTGRES_DB: vigilio_test
          POSTGRES_USER: vigilio
          POSTGRES_PASSWORD: test-only-password
        ports: ['5432:5432']
        options: >-
          --health-cmd 'pg_isready -U vigilio -d vigilio_test'
          --health-interval 10s --health-timeout 5s --health-retries 8
    env:
      APP_ENV: testing
      DB_CONNECTION: pgsql
      DB_HOST: 127.0.0.1
      DB_PORT: '5432'
      DB_DATABASE: vigilio_test
      DB_USERNAME: vigilio
      DB_PASSWORD: test-only-password
    steps:
      - uses: actions/checkout@<SHA_VERIFICADO>
      - name: PHP runtime + extensions
        uses: shivammathur/setup-php@<SHA_VERIFICADO>
        with:
          php-version: '8.4' # ejemplo: resolver desde baseline y composer.json
          extensions: pdo_pgsql, mbstring, xml, curl, dom, zip
          coverage: none
      - name: Install locked dependencies
        run: composer install --no-interaction --prefer-dist --no-progress
      - name: Composer lock + vulnerability gate
        run: |
          composer validate --strict
          composer audit --locked
      - name: Pint (sin auto-fix)
        run: vendor/bin/pint --test
      - name: PHPStan / Larastan
        run: vendor/bin/phpstan analyse --no-progress
      - name: Feature tests on PostgreSQL
        run: |
          php artisan migrate --force
          php artisan test
```

**Aviso:** `<SHA_VERIFICADO>` es intencionalmente un placeholder no ejecutable; copiar el workflow tal cual no constituye un pipeline funcional. Requiere claves de app de test, `.env.testing` u otras variables del consumidor, `APP_KEY` seguro de CI si el framework lo necesita, extensiones efectivas y un `composer.lock` real. El ejemplo no incluye Valkey porque no todas las aplicaciones tienen caché o colas; añadir ese servicio solo cuando las pruebas lo requieran.

## Merge, despliegue y rollback Laravel

1. PR protegido: formato, auditoría, estática, unit + Feature/integración y contrato OpenAPI; fallos bloquean merge.
2. Crear artifact con `composer install --no-dev` desde lock en una fase de build inmutable; no ejecutar un `composer update` dentro de deploy.
3. Migraciones *expand/contract*, backups y pruebas de compatibilidad con workers antiguos. No usar `migrate:fresh` en producción.
4. En deployment, resolver secretos por gestor de secretos; ejecutar `php artisan optimize` con variables finales, health check `/up` si está configurado, colas `queue:restart` y verificación de `schedule:run`/workers según runtime.
5. Promover por digest a staging/canary, medir tasa de error, p95, jobs y DLQ; rollback de código solo si el schema sigue siendo compatible.
6. Archivar evidencia de SHA/digest, pruebas, aprobación y métricas; no declarar PASS por existir YAML.

## ✅ Correcto / ❌ Incorrecto — casos de fallo

✅ **Correcto:** usar PostgreSQL real para comportamiento dependiente de locks/índices; condicionar CI a los permisos del repositorio, con secrets aislados, lockfiles, auditoría y smoke.

❌ **Incorrecto:** probar con SQLite y afirmar paridad con PostgreSQL; `composer update` en deploy; introducir tokens cloud permanentes; `continue-on-error` en seguridad; subir `.env` o crear imágenes con secretos embebidos.

Fuentes oficiales: [Laravel testing](https://laravel.com/docs/13.x/testing), [deployment](https://laravel.com/docs/13.x/deployment), [Pint](https://laravel.com/docs/13.x/pint), [Composer audit](https://getcomposer.org/doc/03-cli.md#audit). CI transversal y GitOps se definen en [pipeline de plataforma](../../../../platform/cicd/github-actions-stages.md); no copiar pasos GitOps aquí.

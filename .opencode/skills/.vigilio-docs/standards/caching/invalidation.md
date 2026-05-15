# Invalidación de caché: contrato compartido

## Opciones permitidas

- **Clave exacta:** `delete(tenant:42:product:123)` tras confirmar escritura, con TTL.
- **Generación por namespace:** lectura añade versión `tenant:42:products:list:v17`; invalidación incrementa atómicamente el contador; entradas viejas expiran.
- **Eventos fiables:** Outbox, entrega/reintentos e idempotencia cuando la modificación afecta otros servicios.

Un `DEL('products:*')` no expande el comodín; operaciones SCAN pueden ser útiles para mantenimiento controlado, nunca invocarlas por defecto en cada PATCH. Las versiones/TTL deben persistir y protegerse contra evicción selectiva (si se pierde la generación mientras sobreviven valores viejos, hay riesgo de reutilización).

## Carreras y consistencia

1. Escritor confirma transacción en BD.
2. Invalida entrada de detalle y generación de listas con la política de consistencia aprobada.
3. Proteger contra cache stampede y repoblación de datos anteriores; cuando importa read-after-write, considerar bloqueo, token de versión o bypass temporal.
4. Si Redis falla, definir fallback seguro, métricas y reintentos de reparación.
5. Filtrar por tenant, permisos, filtros y versión de schema en la key; evitar altas cardinalidades no controladas.

✅ Correcto: tests hit/miss/ttl/invalidate y ensayo de dos requests concurrentes.

❌ Incorrecto: asumir que `DEL('prefix:*')` borra todas las entradas; invalidar antes de commit como única garantía.

[Cache-aside](cache-aside.md) · [NestJS](../../stacks/backend/nestjs/persistence/cache-valkey.md) · [Laravel](../../stacks/backend/laravel/persistence/cache-invalidation.md).

## Procedencia documental preservada

- [Capítulo heredado: 9-cache.md](../../stacks/backend/nestjs/persistence/references/9-cache.md) — contenido íntegro conservado.

## Mejoras técnicas verificables — 2026

**6. Invalidación transaccional.** ✅ Invalidar después del commit, TTL acotado y reintentos/eventos cuando sea necesario. ❌ `DEL('products:*')` esperando coincidencia por patrón o afirmar atomicidad Redis/PostgreSQL.

**7. Control de stampede.** ✅ Aplicar single-flight/locks solo con medición y duración acotada; tolerar fallos de caché si la política permite fallback. ❌ Multiplicar queries en cada miss bajo carga y bloquear indefinidamente.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


# Caché compartido: cache-aside e invalidación

- Leer cache → si falta obtener de fuente autoritativa → almacenar con TTL/expiración. No cachear si no existe necesidad/SLO.
- La key debe incluir versión de esquema, tenant, permisos relevantes, filtros, orden, offset/cursor e idioma si afectan el resultado.
- `DEL('products:*')` NO elimina por patrón. Para detalle, `forget(exact-key)`; para listados usar generación versionada atómica o índices controlados más TTL.
- Invalidar **después de commit**; para fiabilidad estricta coordinar via outbox, reintentos e idempotencia. Cache stampede: single-flight/locks sólo si se mide.
- Fallo del cache debe degradar a DB cuando aceptable; poner timeout, métricas `hit/miss/error`, no filtrar datos sensibles. Evitar errores de concurrencia al repoblar claves antiguas.

**Ejemplo de generación:** `tenant:{id}:products:list:g{version}:{sha256(filters)}`. Redis `INCR` es atómico; inicialización y key no evictable requieren estrategia explícita (un contador evictado puede revivir generaciones antiguas). TTL de datos cacheados limita retención.

[Cache Laravel](../../stacks/backend/laravel/persistence/cache-invalidation.md) · [Cache NestJS existente](../../stacks/backend/nestjs/persistence/references/9-cache.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Keys con tenant, filtros, versiones y TTL; invalidación exacta o por generaciones después de commit; probar hit/miss/stampede.
- ❌ **Incorrecto:** `DEL("products:*")` o `Cache::forget("products:*")`, key sin tenant o Redis dentro de falsa transacción SQL.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../engineering/refactoring-existing-code.md).

## Política compartida: caché como proyección no autoritativa

La base de datos sigue siendo la fuente de verdad. Los adaptadores de NestJS/Valkey y Laravel/Redis implementan los mismos principios: TTL basado en sensibilidad/frescura, claves por identidad autorizada y filtros, estrategia de miss/hit y fallos de caché **degradables** si el caso de uso lo permite.

**Checklist previo a cachear:** ¿existen datos personales, políticas por recurso, cambios frecuentes, transacciones simultáneas o revocación de permisos? ¿Cuál es el máximo staleness tolerable? ¿Qué pasa si Redis no responde?

**Invalidación:** cambiar una fila no equivale a eliminar una key con comodín; usar invalidación por ID o generaciones atómicas después de confirmar DB. Documentar carreras de repoblación y reintentos después de un commit exitoso.

**Pruebas obligatorias:** hit/miss, expiración TTL, error de Redis, scope de tenant/permissions, escritura concurrente e invalidación al cambiar el estado.

✅ Correcto: caché observada con `hit_rate` y errores de fallback y tests de tenant.

❌ Incorrecto: cache global de respuestas privadas, `DEL('prefix:*')` o agregar TTL arbitrario sin presupuesto de frescura.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Clave estable:** Incluir tenant, permisos/versiones de política, filtros, orden, locale y contrato cuando alteran el resultado.
2. **Invalidación real:** Seleccionar versionado por generación, conjuntos de claves o eventos post-commit; no asumir patrones de borrado no soportados.
3. **Modo de fallo:** Decidir comportamiento ante Redis caído, stampede y stale data; observar hit/miss y latencia.
4. **Aislamiento:** Probar que la caché nunca comparte respuesta entre usuarios o tenants con diferentes ACL.
5. **Verificación:** Ejecutar miss → hit → escritura → lectura y expiración/refresh con reloj controlado.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

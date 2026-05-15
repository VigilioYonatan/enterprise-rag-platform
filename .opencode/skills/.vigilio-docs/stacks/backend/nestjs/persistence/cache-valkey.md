# NestJS: CachePort, Valkey/Redis y TTL

La caché es infraestructura; no debe penetrar en el dominio. El caso de uso o servicio de lectura utiliza `CachePort` cuando beneficio de latencia/costo supera coherencia y complejidad.

```typescript
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  // Generación atómica: implementar y probar en adapter real
  incrementNamespaceVersion(namespace: string): Promise<number>;
}
```

**Cache-aside:** construir key con tenant, filtros normalizados, versión de datos/schema y, si influye, permisos. Leer cache → DB en miss → cache.set TTL. En comandos, confirmar BD → invalidar detalle y avanzar versión de listado; si invalidación falla, retry/outbox/reparación según criticidad. Controlar carreras de repoblado. Usar TTL y límites de memoria; no usar datos confidenciales como fragmento literal de keys.

✅ Correcto: `cache.del('tenant:42:product:8')` para detalle, `incrementNamespaceVersion` para listados, pruebas de carreras.

❌ Incorrecto: `cache.del('products:*')` como wildcard, cache global multi-tenant, TTL infinito o asumir transacción distribuida Redis+PostgreSQL.

El incremento no existe en `CachePort` viejo por defecto: extender con control de compatibilidad o inyectar otro port para versión. [Invalidación común](../../../../standards/caching/invalidation.md).

## Procedencia documental preservada

- [Capítulo heredado: 9-cache.md](references/9-cache.md) — contenido íntegro conservado.

## Cache-aside seguro para `listProducts()`

El caché de lectura pertenece a infraestructura/application, nunca al agregado del dominio. El fingerprint de la clave incluye **tenant autorizado**, filtros, orden, límite, offset/cursor y alcance de permisos; datos de diferentes usuarios no deben compartir la clave si sus autorizaciones producen vistas distintas.

```typescript
// Fragmento de un application service: ports provistos por el consumidor.
async listProducts(query: ListProductsQueryDto, context: AuthorizedContext): Promise<ListProductsResponseDto> {
  const namespace = `tenant:${context.tenant_id}:products:list`;
  const generation = await this.cache.version(namespace);
  const fingerprint = this.hashQuery({ ...query, scope: context.readScope });
  const key = `${namespace}:g${generation}:${fingerprint}`;
  const hit = await this.cache.get<ListProductsResponseDto>(key);
  if (hit !== null) return hit;
  const page = await this.repository.searchProducts(query, context);
  const result = this.presenter.presentProductsPage(page);
  await this.cache.set(key, result, 60);
  return result;
}
```

`AuthorizedContext`, `version`, `hashQuery`, `presenter` son abstracciones del proyecto. Deben implementarse y probarse; no están incorporadas automáticamente a NestJS/Valkey.

### Escritura e invalidación

1. Ejecutar caso de uso de negocio, comprobar invariantes y transacción SQL.
2. **Tras commit**, eliminar clave exacta de detalle o incrementar de forma atómica la generación del listado afectado.
3. Si falla la invalidación tras confirmar DB, registrar retry fiable (Outbox cuando corresponda), no afirmar que la escritura se revirtió.
4. Para evitar repoblación obsoleta por lectores concurrentes, verificar la generación antes de publicar el resultado; considerar tombstones/versionado o menor TTL según SLA.
5. No usar `cache.del('products:*')`: `DEL` no interpreta patrones.

**Pruebas:** miss/hit, cambios en filtros, aislamiento por tenant, revocación de permisos, TTL, fallos de Redis, invalidación tras commit y carrera entre lector lento y escritura.

✅ Correcto: claves derivadas de contexto autorizado y invalidación versionada.

❌ Incorrecto: cachear respuesta HTTP privada en una clave global o usar `KEYS *` en el path de escritura.

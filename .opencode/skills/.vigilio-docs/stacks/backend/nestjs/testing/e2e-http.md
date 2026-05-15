# NestJS — E2E HTTP con autorización, contratos y persistencia

**Propietario:** solo implementación NestJS. Las [56 prácticas E2E transversales](../../../../standards/testing/e2e-quality-gates.md) pertenecen al estándar; aquí se materializan con `@nestjs/testing`, Vitest/Supertest y adaptadores reales. Consultar [versiones](../../../../technology/versions.md) en vez de fijarlas aquí.

## Preparación de app aislada

```typescript
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../src/app.module';
import type { INestApplication } from '@nestjs/common';

let app: INestApplication;
beforeAll(async () => {
  const module_ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module_ref.createNestApplication();
  await app.init();
});
afterAll(async () => { await app?.close(); });

describe('products E2E', () => {
  it('rechaza peticiones anónimas', async () => {
    await request(app.getHttpServer()).get('/api/products').expect(401);
  });
});
```

*Ejemplo ilustrativo:* `AppModule` y la ruta deben existir en el consumidor. No implica que este test se haya ejecutado. **No sustituir repositorios ni guards por mocks** al afirmar que se está probando seguridad end-to-end; usar infraestructura efímera donde importe el SQL real.

## Checklist específico verificable

1. Probar `listProducts()` con usuario autorizado y `tenant_id` derivado de sesión, nunca del query.
2. Solicitar producto perteneciente a otro tenant y esperar denegación sin fuga de PII.
3. Verificar dueño vs lector vs operador con permisos diferenciados y revocación.
4. Enviar `?limit=25` y comprobar número validado por `z.coerce.number()`; rechazar `limit=abc`, `limit=0`, `limit=101`.
5. Comparar el JSON con `ListProductsResponseDto` y contrato OpenAPI publicado; no exponer propiedades internas.
6. Probar orden estable y paginación con filas suficientes para generar `next` y `previous`.
7. Ejecutar con PostgreSQL real migrado y comprobar filtros/índices del adaptador Drizzle.
8. Probar conflicto de concurrencia: dos solicitudes sobre misma transición; solo una operación válida.
9. Validar que fallo de BD revierte transacción y no publica outbox prematuro.
10. Probar `cache miss → hit → mutate → miss` después del commit; no invalidar con `DEL('prefix:*')`.
11. Reiniciar worker y reenviar mensaje; comprobar idempotencia y correlación de trace.
12. Comprobar 401, 403, 404, errores de negocio y 5xx sin exponer stacktrace.
13. Desactivar servicio externo en un test etiquetado; comprobar timeout/backoff y degradación.
14. Limpiar fixtures por suite/worker para no contaminar tests paralelos.
15. Adjuntar logs y trazas saneadas a fallos, con `request-id` y `trace-id`.
16. Comparar implementación HTTP con Swagger/Scalar generado desde schema fuente Zod.
17. Verificar readiness antes de suite y liberar app, DB connections y subscriptions al terminar.
18. Ejecutar con las mismas variables no secretas que producción y clasificar diferencias.

✅ **Correcto:** pruebas con guards reales, tenant negativo, PostgreSQL y contratos verificables; PASS solo si runner real lo confirma. ❌ **Incorrecto:** reemplazar el guard por `allowAll`, mockear el SQL y declarar seguridad/Drizzle E2E verificada.

**Gate:** guardar comando, entorno, resumen de assertions y estados `PASS|FAIL|BLOCKED|NOT_RUN` por grupo. La ausencia de un banco PostgreSQL marca los controles 7–10 como `NOT_RUN`.

## Receta completa por capacidad: `listProducts()`

**Precondiciones del consumidor:** `AppModule` listo, usuario autorizado, segundo usuario en otro tenant, tabla Product, migraciones PostgreSQL aplicadas, Valkey opcional según cache y política definida. No inventar endpoints ni credenciales de un proyecto que no se adjuntó.

### Fase A — contrato y errores

```typescript
// Ilustrativo: sustituir rutas y helpers de auth por los del consumidor.
it('la query incorrecta no llega a persistencia', async () => {
  await request(app.getHttpServer())
    .get('/api/products?limit=101')
    .set('Authorization', `Bearer ${await tokenFor('tenantA', 'reader')}`)
    .expect(400); // 400 o 422 según contrato HTTP vigente
});
```

1. Probar sin auth y documentar 401.
2. Probar con lector autorizado y validar proyección de campos, `count`, `results`, `next`, `previous`.
3. Probar usuario válido con recurso de tenant ajeno y documentar decisión 403/404.
4. Probar valores `limit=`, `limit=-1`, `limit=abc`, `limit=101` y defaults.
5. Comparar estructura emitida en runtime con el schema Zod fuente y OpenAPI generado.

### Fase B — persistencia, concurrencia y eventos

```typescript
// Boceto de secuencia: auth helpers, DB y repo deben implementarse en el proyecto.
const first = await listProductsAs('tenantA', { limit: 25 });
await approvePolicyAs('tenantA', policy_id);
const second = await listProductsAs('tenantA', { limit: 25 });
expect(second.results).toContainEqual(expect.objectContaining({ id: policy_id }));
// El ejemplo solo es válido si approvePolicy afecta al listado: adaptar al caso de uso real.
```

6. Preparar dataset de dos tenants y comprobar que count no incluye filas ajenas.
7. Probar límite concurrente con dos transiciones sobre el mismo agregado.
8. Simular rollback y verificar tabla outbox sin evento prematuro.
9. Forzar duplicate event y verificar un solo efecto observable.
10. Probar caché con miss/hit, cambio de permiso, invalidación y revocación.

### Fase C — ejecución y cierre

- Crear DB/test fixtures idempotentes y limpiarlos por suite, sin tocar datos de terceros.
- Ejecutar E2E secuencial y en paralelo para detectar carreras.
- Adjuntar `stderr` saneado, trace/request-id, versión de lockfile y commit.
- Etiquetar cada bloque `PASS`, `FAIL`, `NOT_RUN` o `BLOCKED`; no inferir PASS por presencia del snippet.
- Bloquear release por fallo de autorización, invariante, contrato o SQL en operación crítica.

✅ **Correcto:** fixture cross-tenant real, OpenAPI y repositorio Drizzle comprobados. ❌ **Incorrecto:** reemplazar el puerto por mock y afirmar integración con Postgres.

# NestJS: PostgreSQL, caché, API E2E y contratos OpenAPI

## Matriz de pruebas

| Capacidad | Ensayos mínimos |
| --- | --- |
| Repository/Drizzle | constraints, migraciones, filtros, paginación, orden y RLS/tenant |
| Redis/Valkey | hit/miss, TTL, invalidación, fallo, concurrencia |
| HTTP | guards 401/403, Zod query, error mapping, DTO público |
| OpenAPI | operación documentada, fechas ISO, seguridad y compatibilidad de respuestas |
| Workers | duplicados, reintentos, DLQ, outbox idempotente |

**Usar PostgreSQL real** para evaluar SQL, índices y transacciones; tests con mocks no bastan. Contenedores efímeros deben tener versionado y cleanup; no apuntar a una DB compartida de producción.

✅ Correcto: dos tenants y permisos cruzados, peticiones HTTP con `limit='10'`, comparación del JSON real contra OpenAPI, comprobación de cache invalidation post-commit.

❌ Incorrecto: `COUNT(*)` sustituido por `rows.length`, ignorar workers al probar un cambio outbox, declarar E2E sin iniciar aplicación.

Documentar entorno, lockfile, comandos y tiempos/errores; preferir tests deterministas, tiempos simulados y aislar fixtures. [Guía compartida](../../../../standards/testing/contract-and-bdd.md).

## Procedencia documental preservada

- [Capítulo heredado: 7-pruebas-vitest-playwright.md](references/7-pruebas-vitest-playwright.md) — contenido íntegro conservado.
- [Capítulo heredado: 38-estrategia-testing-2026.md](references/38-estrategia-testing-2026.md) — contenido íntegro conservado.

## Suite de integración: DB y contrato HTTP reales

Una prueba de repositorio mockeado **no** demuestra que Drizzle genera SQL correcto. Levantar PostgreSQL de la versión compatible del proyecto con migraciones reales; ejecutar lectura filtrada por tenant, paginación con orden estable, operaciones concurrentes y rollback tras error. Aplicar cleanup transaccional o datos aislados por caso.

```typescript
// Esqueleto Vitest: fixtures/setup de DB provistos por el proyecto.
describe('listProducts integration', () => {
  it('enforces tenant isolation and pagination', async () => {
    await fixtures.insertProduct({ tenant_id: 'A', nro_poliza: 'A-1' });
    await fixtures.insertProduct({ tenant_id: 'B', nro_poliza: 'B-1' });
    const page = await repository.searchProducts(
      { limit: 25, offset: 0 },
      fixtures.principalForTenant('A'),
    );
    expect(page.items.every(item => item.nro_poliza !== 'B-1')).toBe(true);
    expect(page.total).toBe(1);
  });
});
```

`fixtures`/`repository` representan el setup del consumidor; **no** declarar ese fragmento como prueba ejecutada sin enlazarlo a una suite real. El test HTTP debe validar Zod query en borde, guards, status y shape JSON del contrato OpenAPI, incluyendo `400`, `401`, `403` y errores de negocio.

**Evidencia mínima:** versión Postgres, hash de migraciones, runtime Node, tests ejecutados, OpenAPI diff y prueba de caché real cuando interviene Valkey.

✅ Correcto: probar la query con PostgreSQL real y datos cruzados por tenant.

❌ Incorrecto: conformarse con un `repositoryMock.searchProducts` y declarar que la paginación o RLS funciona.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **DB real:** Levantar PostgreSQL con migrations y fixtures por tenant; probar schema contra queries Drizzle.
2. **Contrato HTTP:** Comparar status, cuerpo y OpenAPI generado con respuesta real.
3. **ACL:** Consultar identificador real de otro tenant y exigir denegación.
4. **Concurrencia:** Probar unique constraints e idempotencia al duplicar requests.
5. **Caché:** Probar invalidación y revocación en Redis real.
6. **Evidencia:** Separar PASS de tests HTTP y NOT_RUN de infraestructura ausente.

**Matriz de escenarios vinculada:** [e2e-http](e2e-http.md).

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

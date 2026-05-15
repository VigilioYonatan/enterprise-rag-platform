# Laravel — E2E HTTP con Pest, Policies y PostgreSQL

**Propietario:** integración Laravel/PHP. La estrategia de cobertura común está en [E2E transversal](../../../../standards/testing/e2e-quality-gates.md) y las versiones únicamente en [technology/versions.md](../../../../technology/versions.md).

## Prueba de frontera HTTP

```php
<?php
// tests/Feature/ProductsAccessTest.php — ejemplo ilustrativo adaptado al consumidor
it('rechaza el listado sin sesión', function (): void {
    $this->getJson('/api/products')->assertUnauthorized();
});
```

No confundir Feature con integración completa: para certificar SQL real, sesiones y colas, levantar infraestructura equivalente; no usar SQLite/mocks como sustituto invisible de PostgreSQL.

## Controles Laravel específicos

1. Aplicar Form Request a paginación y filtros; rechazar `limit` mal tipado y valores fuera de rango.
2. Exigir Policy por acción semántica (`approvePolicy`, `cancelOrder`) y recurso, no solo auth middleware.
3. Probar 401 sin sesión, 403 con usuario sin permiso y 404 según política de no divulgación.
4. Usar `actingAs()` únicamente para escenarios autenticados; probar Sanctum/cookies según mecanismo real.
5. Verificar que Eloquent filtra tenant y documento antes de `paginate()` y de hidratar modelos.
6. Comparar API Resource contra esquema OpenAPI y lista autorizada de campos.
7. Probar transacciones reales; una excepción deja la DB y outbox en estado consistente.
8. Probar `dispatchAfterCommit` o patrón outbox elegido para no publicar antes del commit.
9. Verificar idempotencia al recibir el mismo job dos veces.
10. Forzar fallo/reintento de cola y confirmar política de backoff y destino de fallidos.
11. Invalidar caché por tag/generación/keyset tras mutación; no confiar en comodines `DEL`.
12. Comprobar que consultas principales no exhiben N+1 en datasets realistas.
13. Generar fixtures por tenant y documento sin contaminar otra suite.
14. Ejecutar pruebas con storage/queue fakes solo cuando el objetivo sea controller; separarlas de E2E real.
15. Verificar expiración de sesión, refresh/revocación y rotación según autenticación seleccionada.
16. Asegurar logs sin tokens, campos PII ni credenciales.
17. Confirmar traducción de DomainExceptions a errores HTTP estables y sin stacktrace.
18. Registrar runner, base de datos, versión instalada y resultados de CI antes de indicar PASS.

✅ **Correcto:** `getJson` más Policies reales, base migrada, escenarios cross-tenant y assertions del contrato. ❌ **Incorrecto:** declarar cobertura E2E por una sola prueba anónima y tres mocks; asumir que un cambio de modelo no afecta Resources ni Policies.

**Gate:** `PASS`, `FAIL`, `NOT_RUN` o `BLOCKED` por requisito; las pruebas requieren proyecto consumidor, esquema y dependencias realmente instalados.

## Receta completa con Feature + infraestructura real

**Precondiciones:** aplicación Laravel consumidora y rutas reales, factories por actor/tenant, PostgreSQL migrado, políticas y sesión configuradas. `actingAs()` solo modela auth durante el test; un E2E completo de sesión real puede requerir otra capa.

### A. Contrato y autorización

```php
<?php
// Adaptar Product::factory(), User::factory() y rutas al dominio real.
it('rechaza lectura de otro tenant', function (): void {
    $member = User::factory()->forTenant('org-a')->create();
    $foreignProduct = Product::factory()->forTenant('org-b')->create();

    $this->actingAs($member)
        ->getJson('/api/products/'.$foreignProduct->id)
        ->assertForbidden(); // O 404 cuando la política protege existencia
});
```

**Por qué:** authentication middleware no prueba autorización por objeto; esta aserción fuerza el límite de recursos. **Cómo comprobar:** mirar además que el body no contiene nombre, tenant o campos sensibles del recurso ajeno.

### B. Validación y read model

```php
it('rechaza límites fuera de política', function (): void {
    $reader = User::factory()->forTenant('org-a')->create();

    $this->actingAs($reader)
        ->getJson('/api/products?limit=101')
        ->assertUnprocessable(); // Elegir status según contrato aprobado
});
```

- Crear al menos 26 registros para `limit=25` y verificar `count`, `next`, `previous`, orden estable y lista filtrada.
- Hacer assert de claves permitidas del Resource, no serializar Eloquent completo.
- Probar las mismas condiciones negativas por API y por Policy invocada internamente.
- Confirmar SQL con conexión PostgreSQL **real**; SQLite solo vale para suite etiquetada como simulación, no equivalencia garantizada.

### C. Consistencia operativa

1. Forzar exception antes de commit y comprobar que mutación y outbox se revierten.
2. Publicar outbox después de commit; simular reentrega y asegurar deduplicación.
3. Medir queries para prevenir N+1 y select sin filtro tenant.
4. Probar Redis disponible, caído y respuesta después de revocar permiso.
5. Verificar jobs fallidos, backoff, DLQ o mecanismo real de colas.
6. Probar sesiones revocadas, CSRF cuando procede y respuesta anónima.

### D. Evidencia de aceptación

| Gate | Evidencia exigida |
|---|---|
| Auth y ACL | Feature test real con usuario y recurso ajeno |
| Resources/OpenAPI | Payload comparado con definición pública |
| SQL transaccional | PostgreSQL migrado + rollback probado |
| Caché y colas | Infraestructura real o `NOT_RUN` justificado |
| CI | Comando, versión resuelta por Composer, estado de suites |

✅ **Correcto:** decisión de autorización, proyección y transacción respaldadas por asserts reproducibles. ❌ **Incorrecto:** usar `Queue::fake()` y declarar que los retries reales de workers están probados.

# Comentarios de código y documentación técnica — estándar Senior/Staff Vigilio 2026

**Estado:** norma canónica transversal para comentarios y docstrings de código nuevo/modificado. **Propietario:** `standards/engineering/`. **Revisión:** 2026-10-25. Complementa, **sin sustituir**, [calidad y revisión de código](../../software-factory/code-review-quality.md), [naming](naming-and-boundaries.md) y [DRY documental](../../governance/documentation-dry-and-ownership.md).

> Regla central: **el código expresa qué hace; los comentarios preservan el porqué, el contrato, las restricciones y los riesgos que no son evidentes**. No imponer porcentajes de comentarios o cabeceras indiscriminadas.

## 1. Política aplicable y ownership

| Información | Ubicación propietaria | Cuándo usarla |
|---|---|---|
| Motivo de una decisión local | comentario `//`, `#`, `/* */` cercano a la decisión | si no es evidente en el código |
| Contrato de API de código, efectos, invariantes | JSDoc/TSDoc o PHPDoc | si consumidores/mantenedores necesitan el contrato |
| Contrato de endpoint HTTP público | DTO/OpenAPI/Scalar | siempre que exista el endpoint, **sin duplicar** toda la spec en controllers |
| Decisión de arquitectura persistente | ADR enlazado | tradeoff/impacto transversal duradero |
| Trabajo diferido / deuda conocida | issue/ticket y TODO/FIXME trazable | solo si hay acción real y dueño/proceso |
| Historial de cambios y autores | Git/PR/issue | no poner autor/fecha por defecto |
| SP/función SQL sujeta a checklist IC | cabecera corporativa autorizada | solo bajo autoridad explícita; ver [SQL](../../software-factory/backend-data-sql.md) |

El lenguaje de comentarios **DEBERÍA** seguir el idioma y convenciones del repositorio; no traducir masivamente comentarios existentes. Mantener spelling, concisión, tono técnico y proximidad a la decisión. Código público puede requerir inglés si el producto lo adopta; es decisión de equipo.

## 2. Casos en que DEBE documentarse el motivo

Si no existe otra fuente propietaria suficientemente cercana:

- **Invariante no trivial**: estados permitidos, montos, precisión de dinero, orden de eventos, límites temporales o auditoría.
- **Seguridad**: aislamiento por tenant, razones de una excepción a permisos, sanitización, firmas, secretos, retención y uso de datos sensibles.
- **Concurrencia/idempotencia**: versión optimista, locks, replay, ventanas de deduplicación, consistencia eventual y ordering.
- **Compatibilidad**: workaround de proveedor o runtime, migración con retrocompatibilidad, feature flag, restricción de versión y fecha de retiro *si está aprobada*.
- **I/O complejo**: reintentos, rate limits, fallbacks, timeouts, recuperación o compensaciones con efecto en negocio.
- **APIs públicas de biblioteca**: supuestos, efectos laterales, contrato y restricciones no inferibles desde tipos, cuando TypeDoc/PHPDoc sea parte del soporte del producto.

✅ **Correcto — comentario con razón y referencia verificable**

```typescript
// El proveedor reintenta eventos fuera de orden: deduplicamos antes de liquidar.
// ADR-014 define la ventana de replay y la retención de idempotency keys.
await ledger.applyOnce(event.external_id, event.amount);
```

✅ **Correcto — comentario de seguridad no redundante**

```typescript
// El tenant viene del principal autenticado, nunca del body del cliente;
// el filtro SQL evita lecturas cruzadas incluso si se reutiliza este port desde un worker.
const page = await productRepository.findByCriteria({ tenant_id: principal.tenant_id });
```

❌ **Incorrecto — ruido, secreto y documentación obsoleta**

```typescript
// Incrementa el contador.
attempts += 1;
// TODO: arreglar luego.
// Token real del proveedor: sk_live_...
// Fue cambiado por Juan el 11/10/2026.
```

**NO DEBE** escribir secretos, PII, payloads sensibles o claves operativas en comentarios, tests de ejemplo o evidencias. No usar comentarios para justificar un fallo sin gate ni dejar bloques de código muerto comentado.

## 3. JSDoc/TSDoc — TypeScript/NestJS/frontend

**DEBERÍA** utilizar un `/** ... */` cuando existe contrato no evidente y el IDE/TypeDoc se beneficia: exported interfaces extensibles, APIs de paquete, utilidades con pre/postcondiciones, callbacks complejos, comportamiento async, invariantes o deprecaciones. **NO DEBE** obligarse JSDoc en todos los controllers, servicios, getters o funciones obvias.

Tipos TS nativos, Zod y OpenAPI son fuentes primarias del esquema: un JSDoc no debe duplicar cada `@param`, `@returns`, unión o propiedad ya expresada por tipos, salvo que agregue semántica.

✅ **Correcto**

```typescript
/**
 * Aprueba una póliza únicamente desde el estado pendiente.
 *
 * Esta transición emite un evento de dominio que el outbox publica
 * después del commit para evitar notificaciones de aprobaciones revertidas.
 *
 * @throws PolicyStateConflictError Si ya fue anulada o aprobada.
 * @see ADR-021
 */
async approvePolicy(policy_id: string): Promise<Policy> {
  // Implementación resumida: invariantes y persistencia van en sus capas.
  return this.approvePolicyUseCase.execute(policy_id);
}
```

❌ **Incorrecto**

```typescript
/**
 * Obtiene productos.
 * @param id El id.
 * @returns El producto.
 */
getProduct(id: string): Promise<Product> {
  return this.repository.findById(id);
}
```

**Notas:** `@throws` documenta condiciones, pero TypeScript no verifica excepciones con su sistema de tipos. `@deprecated` **DEBE** mencionar alternativa y plan de retiro aprobado cuando exista; nunca inventar fechas. Si una API pública se genera desde TSDoc, escoger tags soportados por la herramienta instalada y validarlos.

## 4. PHPDoc — Laravel/PHP

Tipos nativos (`: Collection`, union types, `readonly`, enums) siguen siendo la fuente ejecutable. **DEBERÍA** añadirse PHPDoc para **genéricos**, `array-shape`, plantillas, contratos semánticos, excepciones importantes, colecciones cuyo tipo de elemento no sea expresable de forma nativa y reglas de análisis PHPStan/Larastan.

✅ **Correcto**

```php
/**
 * Devuelve solamente pólizas visibles para el tenant autorizado.
 *
 * @return \Illuminate\Support\Collection<int, Policy>
 */
public function findActivePolicies(string $tenant_id): Collection
{
    return $this->repository->findActiveForTenant($tenant_id);
}
```

✅ **Correcto — template útil para el analizador**

```php
/**
 * @template T of Policy
 * @param iterable<T> $policies
 * @return list<T>
 */
function approvedOnly(iterable $policies): array
{
    return array_values(array_filter(
        iterator_to_array($policies),
        static fn (Policy $policy): bool => $policy->isApproved(),
    ));
}
```

❌ **Incorrecto**

```php
/** @param string $id @return bool */
public function exists(string $id): bool { /* ... */ }
```

No introducir docblocks que se contradigan con firmas, FormRequests, Resources o Spatie Data. `@throws` para condiciones relevantes que el consumidor puede manejar; no listar de memoria todas las excepciones internas de infraestructura.

## 5. Comentarios en infraestructura, SQL, tests y migraciones

- **SQL/migraciones:** explicar locks, backfill, transiciones de schema, limitaciones de índices y rollback irreversible cuando no resulte evidente; no documentar un `SELECT` trivial línea por línea. La **cabecera IC** solo corresponde a objetos SQL donde el [checklist IC](../../software-factory/backend-data-sql.md) es autoridad.
- **Testing:** los nombres de prueba describen el comportamiento. Un comentario es útil para un fixture raro, una carrera reproducible o el motivo de un mock; no narrar `expect(...)`.
- **Terraform/Kubernetes/workflows:** documentar restricciones del proveedor, fallos observados y excepciones de seguridad, sin copiar de nuevo la configuración HCL/YAML.
- **Generated code:** no editar ni comentar manualmente archivos generados; cambiar la fuente del generador y volver a ejecutar el pipeline aprobado.
- **RegExp, bitwise y matemáticas de precisión:** registrar intención, ejemplo límite o fuente cuando no sean autoexplicativos.

## 6. TODO, FIXME, NOTE, deprecaciones y supresiones

No usar comentarios como sistema de tickets paralelo. La política de proyecto define el tracker y la obligatoriedad de referencias. Para deuda **real** diferida en código de producción, aplicar por defecto:

```typescript
// TODO(API-123): retirar el mapper legacy tras migrar los consumidores de v1.
// FIXME(DB-42): corregir la condición de carrera al reintentar la reserva.
// NOTE: esta API externa entrega fechas sin zona; el contrato requiere UTC.
```

- **TODO:** acción futura concreta, condición/owner trazable mediante issue cuando exista. No bloquear por tickets inexistentes en un snippet puramente ilustrativo.
- **FIXME:** comportamiento incorrecto conocido, impacto y tracker; si es riesgo crítico en el diff, **bloquear merge** en vez de esconderlo en comentario.
- **NOTE:** motivo estable que no implica tarea pendiente; priorizar comentario normal si basta.
- **HACK:** excepcional, con explicación, límite y seguimiento. No fomentar su uso rutinario.
- **`@deprecated`:** alternativa disponible o plan de reemplazo; no eliminar export público hasta aprobar compatibilidad/versionado.
- **Supresiones (`// @ts-expect-error`, `biome-ignore`, `phpstan-ignore`, `phpcs:ignore`, `noqa`)**: minimizar alcance, explicar motivo e issue cuando persista; preferir la anotación que falle si la supresión deja de ser necesaria. Nunca usar `@ts-ignore` general para ocultar defectos de tipos sin revisión.

✅ **Correcto**

```typescript
// SDK-187: definición externa incompleta; retirar tras actualizar dependencia.
// @ts-expect-error La versión instalada del SDK omite legacyAccepted.
const accepted = thirdPartySdk.legacyAccepted;
```

❌ **Incorrecto**

```typescript
// @ts-ignore
const value = untypedCall();
// FIXME: esto está mal
```

## 7. Documentación de endpoints: no mezclar código con el contrato HTTP

| Tema | Fuente propietaria |
|---|---|
| Rutas, métodos, auth, body/query/params, responses, errores | [REST endpoint design](../api/rest-endpoint-design.md) + OpenAPI/Scalar |
| Contract Zod y tipos de entrada/salida NestJS | [DTO HTTP](../api/http-dtos-and-contracts.md) en `*.dto.ts` |
| Casos de uso e invariantes de dominio | código Domain/Application; JSDoc **si agrega contexto** |
| Por qué se requiere idempotencia, lock o workaround | comentario local + ADR si es decisión amplia |
| PHP Laravel request/response | FormRequest/Spatie Data/Resource + OpenAPI propio |

✅ **Correcto:** `@ApiOkResponse(...)` documenta JSON y status; en el código, un comentario breve justifica una regla no obvia de autorización.

❌ **Incorrecto:** copiar en cada controller varias pantallas de descripciones de `200/400/401/403/422` que ya son fuente OpenAPI o escribir `/** @returns list of products */` sobre `listProducts()` sin aportar semántica.

## 8. Perfil corporativo IC — excepción explícita, no default

La regla transversal antigua admite una **cabecera con usuario/proyecto/fecha/detalle** cuando un checklist corporativo vigente la exige. **Esta norma conserva esa excepción sin volverla universal**. La cabecera de SQL tiene su propio formato y dueño en [backend-data-sql](../../software-factory/backend-data-sql.md). No inventar usuario, ticket, fecha ni identidad a modo de placeholder en código entregado.

✅ **Correcto:** si el proyecto declara `IC` como requisito, mantener su plantilla exacta en los archivos/objetos exigidos por esa política y verificarla.

❌ **Incorrecto:** introducir `Nombre usuario`, `Fecha`, `Cod Proyecto` en cada controller nuevo sin autoridad corporativa o sustituir la historia Git por comentarios manuales.

## 9. Quality gates y checklist de review

| Verificación | Resultado esperado | Automatización posible |
|---|---|---|
| Linter/formatter + types | sin código comentado muerto o supresión injustificada | Biome/ESLint solo si está adoptado; Pint + PHPStan/Larastan |
| Formato de docblocks que sí existen | tags soportados, contratos coherentes con firmas | TypeDoc/TSDoc, PHPStan/Larastan, doctest si aplica |
| TODO/FIXME en diffs | accionables, tracers donde corresponda | script de grep en líneas añadidas, **sin** migrar todos los comentarios legacy |
| Seguridad de comentarios | ausencia de secretos/PII/stacktrace sensibles | secret scanning más revisión humana |
| Comentarios IC | plantilla y datos **reales** solo donde aplica | regla por perfil corporativo |
| Contrato HTTP | especificación generada, sin duplicación de JSDoc | OpenAPI lint/diff y contract tests |
| Veracidad semántica | comentario corresponde a implementación actual | code review con trazabilidad a tests/ADR |

**NO DEBE** imponerse una cuota de cobertura de comentarios o un umbral fijo de JSDoc. El análisis automático **no** certifica que las explicaciones sean verdaderas. Marcar `PASS`, `FAIL`, `NOT_RUN` o `BLOCKED` con evidencia por gate.

### Checklist de un PR

- [ ] Todo comentario nuevo explica un motivo, contrato o riesgo que los tipos/código no explican.
- [ ] No hay secretos, PII, autor/fecha improvisados ni código muerto comentado.
- [ ] JSDoc/PHPDoc documenta comportamiento útil y mantiene coherencia con firma/contrato.
- [ ] TODO/FIXME tienen acción y seguimiento proporcionado al riesgo.
- [ ] Las excepciones IC, TypeScript y PHP están justificadas por política y verificación real.
- [ ] OpenAPI sigue siendo la documentación propietaria del endpoint público.
- [ ] No se duplican reglas desde stacks y skills: enlazan aquí.

## 10. Fuentes externas y aplicación

- [TSDoc Handbook](https://tsdoc.org/pages/intro/overview/) — estilo de doc comments TS.
- [PHPDoc / PHPStan PHPDocs Basics](https://phpstan.org/writing-php-code/phpdocs-basics) — anotaciones de tipo y análisis estático.
- [OpenAPI 3.2.1](https://spec.openapis.org/oas/v3.2.1.html) — contrato externo; adoptar según compatibilidad real.
- [OWASP API Security](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) — no filtrar información sensible.

**Referencias de implementación:** [NestJS controllers](../../stacks/backend/nestjs/http/controllers.md) · [Laravel controllers](../../stacks/backend/laravel/http/controllers.md) · [revisión de código](../../software-factory/code-review-quality.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Comentario "incrementa i" repite código evidente
- **❌ Incorrecto**: Comentario "incrementa i" repite código evidente.
- **✅ Correcto**: Documentar porqué del invariant, riesgo o compatibilidad.

### 02. JSDoc @returns Promise<any> contradice tipo real
- **❌ Incorrecto**: JSDoc @returns Promise<any> contradice tipo real.
- **✅ Correcto**: Documentar contratos reales, errores y efectos observables.

### 03. Pegar tutorial entero en cada método
- **❌ Incorrecto**: Pegar tutorial entero en cada método.
- **✅ Correcto**: Referencia canónica; ejemplos específicos junto al API cuando necesarios.

### 04. Describir TODO sin issue/owner ni condición de salida
- **❌ Incorrecto**: Describir TODO sin issue/owner ni condición de salida.
- **✅ Correcto**: TODO accionable con criterio y enlace, o resolverlo.

### 05. Usar comentario como sustituto de test de autorización
- **❌ Incorrecto**: Usar comentario como sustituto de test de autorización.
- **✅ Correcto**: Tests y validaciones verificables; comentario solo explica motivo.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

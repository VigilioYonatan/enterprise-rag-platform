# Gobierno de datos: clasificación, retención y auditoría

Definir propietarios, legalidad de tratamiento, categorías de datos, periodos de retención, ámbito tenant y trazabilidad. Los backups y réplicas siguen siendo datos sensibles; redacción de logs no sustituye controles de acceso.

✅ Correcto: campos mínimos en DTO público `schema.pick(...)`, authz antes de leer, auditoría de acciones críticas y expiración verificable por entorno.

❌ Incorrecto: exponer toda una fila SQL, guardar PII en trazas o usar producción sin anonimizar en ambientes de desarrollo.

## Revisión de un cambio

- Cambios de schema implican inventario de campos y decisiones de retención.
- Money usa decimal/enteros de menor unidad según dominio; nunca floats para saldos financieros sin reglas explícitas.
- Eventos y búsquedas vectoriales requieren ACL por objeto y borrado coherente con la retención.
- Definir pruebas de filtrado por tenant, de exportación/borrado y de masking en logs.

[Seguridad transversal](../security/tenant-isolation.md).

## Procedencia documental preservada

- [Capítulo heredado: 13-data-governance.md](references/13-data-governance.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Consistencia:** Declarar límites de transacción e invariantes respaldadas por constraints de DB.
2. **Reversión:** Probar migración forward, rollback operativo, restauración y schema drift.
3. **Aislamiento:** Verificar filtros por tenant/ACL tanto en lectura como en escritura y jobs.
4. **Rendimiento:** Probar índices, planes, cursores estables y N+1 con dataset representativo.
5. **Trazabilidad:** Conservar auditoría de mutaciones, borrados y retención sin exponer información sensible.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

# Migraciones PostgreSQL y Drizzle - `bus-impl` 2026

Este documento define como migrar base de datos sin romper produccion.

La baseline transversal de SQL, cambios de datos y documentacion IC vive en
[Calidad backend de datos y SQL](../../../../../software-factory/backend-data-sql.md). Este documento conserva la
especializacion PostgreSQL/Drizzle.

Regla madre:

- en produccion, rollback de aplicacion debe ser posible sin rollback manual de datos

---

## 1. Expand-contract

Para cambios no triviales:

1. Expand: agregar columnas, tablas o indices compatibles.
2. Deploy app compatible con viejo y nuevo schema.
3. Backfill controlado.
4. Cambiar lecturas/escrituras.
5. Contract: retirar columnas viejas en otra release.

Regla:

- cambios destructivos nunca van en la misma release que empieza a depender del nuevo schema

---

## 2. Cambios peligrosos

Requieren review extra:

- drop column
- rename column
- change type
- not null sin default/backfill
- indices grandes sin estrategia
- migraciones con locks largos
- updates masivos

---

## 3. Backfills

Reglas:

- por lotes
- idempotentes
- con checkpoint
- con metricas de progreso
- con pausa/reanudacion

No hacer:

- `UPDATE tabla SET ...` gigante en horario productivo

---

## 4. Indices

Buenas practicas:

- crear indices grandes con estrategia compatible con PostgreSQL
- medir query plans
- validar impacto en writes
- remover indices muertos solo tras observar uso

---

## 5. Drizzle

Reglas:

- migrations versionadas
- no editar migrations ya aplicadas
- generar migration y revisarla manualmente
- `drizzle-kit` no reemplaza revision humana

Pipeline:

```text
generate -> review SQL -> test local -> test integration -> staging -> production
```

---

## 6. Rollback

Regla:

- rollback normal debe ser de aplicacion, no de datos

Por eso:

- app version N y N-1 deben convivir temporalmente con el schema
- migraciones destructivas se separan
- backfills deben ser reentrantes

---

## 7. Testing

Minimo:

- migration forward en PostgreSQL real
- smoke despues de migration
- test de compatibilidad app N-1 con schema expandido
- validar timezone, decimal, collation, constraints e indices

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Filtros y orden determinista, parámetros vinculados, transacciones con control de concurrencia e integración real.
- ❌ **Incorrecto:** N+1, SQL construido con interpolación de entrada externa, `count` de página presentado como total sin especificar semántica.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.

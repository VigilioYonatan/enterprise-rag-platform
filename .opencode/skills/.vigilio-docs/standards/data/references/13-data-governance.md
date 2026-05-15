# Data Governance - `bus-impl` 2026

Este documento define como tratar datos de negocio, PII, auditoria, retencion y aislamiento.

Los datos de seguros de la tabla son ejemplos de clasificacion; cada proyecto debe reemplazarlos por
sus datos y owners reales.

Regla madre:

- todo dato tiene dueno, clasificacion, retencion y politica de acceso

---

## 1. Clasificacion

| Clase | Ejemplos | Regla |
|---|---|---|
| Public | health status, version publica | puede exponerse |
| Internal | metricas tecnicas, config no sensible | solo equipo interno |
| Confidential | contratos, catalogo interno, brokers | acceso autenticado y auditado |
| Restricted | documentos, identidad, pagos, tokens | cifrado, minimo acceso, retencion estricta |

Regla:

- si no esta clasificado, tratarlo como `Confidential`

---

## 2. PII

PII no debe aparecer en:

- logs
- cache keys
- metric labels
- nombres de archivos
- errores HTTP
- traces sin redaction

Si se necesita:

- justificar campo
- TTL corto si entra a cache
- masking en lower environments
- auditoria de acceso

---

## 3. Tenant isolation

Reglas:

- todo aggregate sensible debe tener `tenant_id` si el sistema es multi-tenant
- queries deben filtrar por `tenant_id` desde application
- repositorios pueden reforzar el filtro, pero no reemplazan policy
- tests deben probar acceso cross-tenant denegado

Opcional fuerte:

- evaluar PostgreSQL RLS si el riesgo multi-tenant es alto

---

## 4. Retencion

Cada tipo de dato debe tener:

- tiempo de retencion
- razon legal o operativa
- mecanismo de borrado o archivo
- owner

Ejemplo:

| Dato | Retencion | Accion |
|---|---|---|
| logs app | `30d` a `90d` | expirar CloudWatch |
| auditoria | segun compliance | S3 cifrado + retencion |
| documentos temporales | `24h` a `7d` | lifecycle S3 |
| archivos de importacion | definido por negocio | archive o delete |

---

## 5. Masking y lower environments

Reglas:

- no usar snapshots productivos crudos en `development` o `test`
- datos productivos restaurados fuera de prod deben anonimizarse
- emails, documentos, telefonos e identificadores personales deben maskearse
- secrets nunca se copian entre ambientes

---

## 6. Auditoria de datos

Auditar:

- lectura masiva
- exportacion
- acceso administrativo
- cambio de estado
- correccion manual
- borrado logico o fisico

Regla:

- auditoria debe ser append-only desde la perspectiva de la aplicacion

---

## 7. Decimal y dinero

Regla fuerte:

- no usar `number` para dinero, primas, saldos, tasas regulatorias o calculos financieros

Opciones:

- string decimal exacto
- libreria decimal
- enteros menores si el dominio lo permite

`number` solo queda permitido para:

- metricas tecnicas
- porcentajes no regulatorios
- valores aproximados aceptados por negocio

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Versiones basadas en lockfiles, escaneo dependencias, CI con gates reales, rollback y aprobaciones.
- ❌ **Incorrecto:** Declarar `PASS` sin ejecutar gates, instalar dependencias latest sin compatibilidad o subir secretos a pipelines.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.

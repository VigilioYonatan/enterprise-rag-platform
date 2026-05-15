# Backup, Restore y Disaster Recovery - `bus-impl` 2026

Este documento define como recuperar el sistema cuando algo falla de verdad.

Regla madre:

- backup no probado es esperanza, no estrategia

---

## 1. RTO y RPO

Cada bounded context real debe declarar. La siguiente tabla es solo un ejemplo:

| Contexto | RTO | RPO |
|---|---:|---:|
| operacion critica A | por definir con negocio | por definir con negocio |
| operacion critica B | por definir con negocio | por definir con negocio |
| reporting | por definir con negocio | por definir con negocio |

Definiciones:

- RTO: cuanto tiempo puede estar caido
- RPO: cuanta data se puede perder

---

## 2. Backups

Cubrir:

- Aurora/RDS PITR
- snapshots manuales antes de cambios riesgosos
- S3 versioning/lifecycle segun bucket
- secrets y parametros recreables por IaC
- OpenAPI y artefactos de release

---

## 3. Restore drills

Frecuencia recomendada:

- development: mensual
- staging: por release mayor
- production: simulado o controlado segun politica

Validar:

- restore de DB
- app conecta al restore
- smoke tests pasan
- datos esperados existen
- tiempo real vs RTO

---

## 4. Region y cuenta

Reglas:

- production debe tener estrategia de recuperacion documentada
- backups criticos pueden requerir copia cross-account o cross-region
- KMS y permisos de restore deben probarse

---

## 5. Runbook de desastre

Debe incluir:

- quien declara incidente
- quien aprueba restore
- pasos tecnicos
- comunicacion
- validacion de negocio
- cierre postmortem

---

## 6. Postmortem

Todo incidente serio debe producir:

- timeline
- impacto
- causa contribuyente
- que funciono
- que fallo
- acciones con owner y fecha

Regla:

- no usar postmortem para culpar; usarlo para mejorar el sistema

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.

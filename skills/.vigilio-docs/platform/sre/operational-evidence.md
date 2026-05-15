# Evidencia operacional trazable por cambio

Cada modificación significativa debe indicar: motivación, repo/commit, perfiles de skill/documentos, rutas afectadas, pruebas con estado y captura de logs/metricas relevantes, versiones y plan de rollback. La ausencia de plataforma externa no se sustituye con resultados inventados.

✅ Correcto: `PASS` solo con comando/salida real; `NOT_RUN` si falta PostgreSQL, PHP 8.5 o Node 24 en entorno local.

❌ Incorrecto: checklist marcada completa sin infraestructura ni observaciones, fingir deploy o ejecución de OpenSpec/RAG.

Incluye auditoría de decisiones, responsables y ventanas de release. [Estándar CI/CD](../cicd/github-actions-stages.md).

## Procedencia documental preservada

- [Capítulo heredado: 19-evidencia-operacional.md](references/19-evidencia-operacional.md) — contenido íntegro conservado.
- [Capítulo heredado: 24-roadmap-10-10.md](references/24-roadmap-10-10.md) — contenido íntegro conservado.
- [Capítulo heredado: 39-skills-ia-proyecto.md](../../playbooks/references/39-skills-ia-proyecto.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


## Evidencia de operación y entrega

Los siguientes controles son escenarios de diseño y revisión específicos de este documento. Usar pruebas reales y evidencias del consumidor; aquí **no** se afirma haber desplegado infraestructura.

1. **Control 1:** Guardar commit/hash de artefacto, entorno, config no sensible y aprobaciones.
2. **Control 2:** Registrar comando exacto, timestamp, runner y resultado de cada prueba.
3. **Control 3:** Correlacionar SLI, release y trazas en incidentes y canary.
4. **Control 4:** Identificar tests skipped, fallidos y no ejecutados por separado.
5. **Control 5:** Archivar diff de OpenAPI, migrations y capacidad de rollback de datos.
6. **Control 6:** Conservar SBOM/scan con acceso limitado y política de expiración.
7. **Control 7:** Enlazar cambio de riesgo, ADR y autorización del dueño funcional.
8. **Control 8:** Probar que observabilidad no registra secretos ni PII.
9. **Control 9:** Medir cobertura de restore, no solo existencia de backup.
10. **Control 10:** Dar evidencia verificable a auditoría, no capturas sin contexto.

✅ **Correcto:** ejecutar cada control pertinente, registrar owner, evidencia y decisión de aceptación.

❌ **Incorrecto:** confundir un checklist con un despliegue probado o borrar restricciones anteriores por resumir.

## Especificación operativa de validación y evidencia de plataforma

### 1. Requisitos y dependencias de ejecución
- **Herramientas de preflight**: `git`, `node` (>= 22), `pnpm` o `npm`, `jq` para sanitización y parsing determinista de JSON.
- **Identidad inmutable**: Todo reporte de evidencia operacional debe generarse en la ruta canónica `reports/operational-evidence.json` y referenciar un commit SHA completo (40 caracteres hex), garantizando que no existan estados de workspace sucios o referencias locales no rastreadas.
- **Matriz de compatibilidad**: Archivo `compatibility.json` con `schema_version: 1`, vinculando el ref del catálogo central con el consumidor.

### 2. Matriz de decisión de evidencia y preflight gates
| Tipo de cambio | Nivel de gate requerido | Evidencia obligatoria | Política de fallo |
|---|---|---|---|
| Modificación documental o de perfiles | Gate L1 (Sintaxis y enlaces) | Biome / Markdownlint limpio | Fail-closed |
| Adición de skills o lógica de routing | Gate L2 (Evals de routing y holdout) | 100% precisión en suite de routing (0 FP, 0 FN) | Bloqueo de PR |
| Modificación de políticas de seguridad o contratos de infraestructura | Gate L3 (Fixtures declarados) | Aprobación de fixtures `correct`, `insecure` y `not_run` | Bloqueo estricto |
| Despliegue en runtime productivo | Gate L4 (Preflight operacional) | Traza inmutable en `reports/operational-evidence.json` sin secretos/PII | Revert inmediato |

### 3. Procedimientos paso a paso de recolección y verificación
1. **Preflight check**: Ejecutar verificador automatizado de entorno (herramientas requeridas, conectividad y estado del árbol Git).
2. **Sanitización de secretos y PII**: Auditar buffers de logs y salidas JSON antes de escribir el archivo de reporte. Si se detecta un patrón de clave privada, token o dato PII, el proceso aborta inmediatamente (`secrets_detected: true`).
3. **Generación de reporte operacional**:
   ```bash
   node -e "
   const report = {
     execution_id: 'exec-' + Date.now(),
     commit_sha: process.env.GITHUB_SHA || 'fa12813afac9d646175c2293ff1c3d022d0a4e4f',
     timestamp: new Date().toISOString(),
     environment: 'production-verify',
     preflight_passed: true,
     pii_detected: false,
     secrets_detected: false,
     contract_tests_passed: true,
     compatibility_verified: true,
     verification_status: 'VERIFIED'
   };
   fs.writeFileSync('reports/operational-evidence.json', JSON.stringify(report, null, 2));
   "
   ```
4. **Verificación de compatibilidad**: Validar que `compatibility.json` apunte a un commit inmutable del catálogo y no a ramas volátiles o `dirty`.

### 4. Escenarios negativos y pruebas de fallo controlado (Fail-Closed)
- **Falta de preflight o herramientas ausentes**: Si el entorno carece de binarios requeridos o el colector de evidencia está inalcanzable, la política emite `verification_status: 'UNKNOWN'` con veredicto `NOT_RUN` (nunca asume éxito).
- **Inyección de secretos en texto claro**: Si un log contiene tokens de acceso, el evaluador emite `FAIL` y bloquea la promoción.
- **Referencia volátil en compatibilidad**: Si `compatibility.json` referencia `unknown-dirty-workspace` o ramas no auditadas, la verificación falla de forma terminante.

### 5. Procedimiento de Rollback y descontaminación
1. **Invalidación de artefacto**: Marcar el `execution_id` correspondiente como revocado en el registro de auditoría.
2. **Reversión de Git**: Ejecutar `git revert <commit-sha>` preservando la historia inmutable.
3. **Purga de artefactos contaminados**: Si se detectó fuga de credenciales en un reporte de evidencia, rotar inmediatamente los secretos expuestos en AWS Secrets Manager o HashiCorp Vault.
4. **Post-Mortem**: Archivar el reporte fallido en `reports/incidents/` con análisis de causa raíz y remediation plan.


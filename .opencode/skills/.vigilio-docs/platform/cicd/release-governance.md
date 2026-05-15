# Releases, Jira, commits y evidencia de despliegue

Distinguir versionado de aplicaciones, librerías npm/Composer y baselines documentales. Releases se trazan a commit, ticket, change set, artefacto y despliegue. Trunk-based con ramas cortas y entornos protegidos; excepciones se documentan por ADR.

✅ Correcto: freeze de contrato, diff OpenAPI, tags inmutables, notas de release y evidencia de smoke.

❌ Incorrecto: afirmar «release final» con pruebas sin ejecutar, cambiar locks sin una matriz de compatibilidad o confundir nombre de rama con versión desplegada.

Verificar propietarios de policy, accesos, Dependabot y gates operativos. [CI/CD](github-actions-stages.md).

## Procedencia documental preservada

- [Capítulo heredado: 33-guia-github-jira-aws-cicd-2026.md](references/33-guia-github-jira-aws-cicd-2026.md) — contenido íntegro conservado.
- [Capítulo heredado: 35-versionamiento-basado-en-commits-2026.md](../../standards/engineering/references/35-versionamiento-basado-en-commits-2026.md) — contenido íntegro conservado.
- [Capítulo heredado: 42-branching-release-flow-2026.md](references/42-branching-release-flow-2026.md) — contenido íntegro conservado.
- [Capítulo heredado: 41-dependabot-repository-policy.md](references/41-dependabot-repository-policy.md) — contenido íntegro conservado.

## Evidencia mínima de una release

El release debe enlazar el commit de código, el baseline de dependencias (`technology/versions.md`), hashes de assets y documentación, digest de contenedor, SBOM, OpenAPI y resultados de smoke. Una aprobación humana no sustituye automatismos ni permite saltar quality gates sin excepción trazable.

**Procedimiento reproducible:**

1. Congelar lockfiles y revisar resultados de pruebas en el mismo commit de la imagen.
2. Obtener artifact por digest y verificar provenance/firma antes de promover.
3. Aplicar migraciones backward-compatible; verificar endpoints de salud y consumidores.
4. Promover a staging, registrar smoke/errores/p95 y ensayar rollback.
5. Aprobar el despliegue productivo con responsable y política de environment; monitorizar burn-rate y revertir según runbook.
6. Publicar notas de cambios y riesgos conocidos, y fechar cuándo se aprobó cada baseline.

✅ Correcto: bloquear promoción si faltan smoke o compatibilidad OpenAPI.

❌ Incorrecto: publicar una release que cambió contratos sin actualizar frontend y workers, o declarar aprobación porque el ZIP pasa CRC.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Promoción:** Vincular artefacto inmutable, aprobación y evidencia de tests antes de pasar entornos.
2. **Credenciales:** Usar OIDC/roles mínimos y separar deploy de pruebas sin compartir secretos.
3. **Rollback:** Probar reversión compatible con DB y clientes anteriores.
4. **Evidencia:** Publicar SBOM, firmas, procedencia, hashes y estado PASS|FAIL|BLOCKED|NOT_RUN.
5. **Monitoreo posrelease:** Correlacionar nuevo release con SLI y decidir rollback usando umbral medido.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

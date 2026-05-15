# Evaluación, Roadmap Y Operación Frontend

## Evaluar con evidencia

Una puntuación arquitectónica no se obtiene por cantidad de herramientas. Evaluar evidencia en:

- arquitectura y boundaries;
- calidad y testing;
- DevSecOps/supply chain;
- seguridad de sesión y datos;
- rendimiento y accesibilidad;
- SEO según perfil del producto;
- observabilidad;
- infraestructura y entrega;
- operación y resiliencia.

Recomendaciones futuras no suman hasta estar implementadas y verificadas.

## Base de ingeniería

Una base senior puede demostrar localmente:

- TypeScript estricto y boundaries claros;
- contratos Zod publicados sin NestJS en browser;
- lint, typecheck y tests;
- E2E, accesibilidad y visual según riesgo;
- build y bundle budget;
- CDK, cdk-nag y policies CI;
- skills versionadas y sin drift;
- documentación canónica enlazada.

Esto no prueba por sí solo operación productiva.

## P0 — antes de datos sensibles o usuarios externos

1. Sesión con cookies `HttpOnly`, `Secure`, `SameSite` y CSRF coordinado.
2. CSP/headers probados contra dominios reales.
3. Clasificación/redaction de datos y telemetría.
4. Deploy real y rollback de artifact conocido.
5. Threat model de auth, uploads e IA.

## P1 — operación enterprise

1. RUM/error tracking con release, stage, route y correlation ID.
2. Web Vitals p75 por dispositivo.
3. Synthetic monitoring recurrente.
4. SLO, alertas y responsables.
5. Required gate y environments protegidos.
6. Auditoría manual WCAG 2.2 AA.
7. Runbooks ensayados.

## P2 — optimización continua

- Budgets por ruta/chunk/dispositivo.
- Red lenta, CPU limitada, offline y chunk-load failure.
- i18n, privacidad y legal según alcance.
- FinOps por stage y feature.
- ADR de MFE real cuando exista un segundo frontend independiente.

## Deuda técnica explícita

Cada deuda incluye:

- riesgo e impacto;
- owner;
- evidencia actual;
- criterio de cierre;
- prioridad/fecha objetivo;
- excepción temporal cuando aplica.

No usar “futuro” o “pendiente” sin responsable y condición verificable.

## Evidencia operacional

- URL/stage desplegado.
- Artifact, commit y workflow.
- Smoke y headers.
- Dashboard y alertas.
- Prueba de rollback.
- Resultado de synthetic.
- Evidencia WCAG manual.
- Auditoría de branch protection/environments.
- Incidentes y acciones correctivas.

## Criterios para defender 10/10

- Deploy reproducible y probado.
- Auth sin tokens legibles por JavaScript.
- RUM/error tracking sin PII.
- SLO y alertas operativas.
- Rollback ensayado.
- Synthetic activo.
- WCAG 2.2 AA validado en journeys críticos.
- Core Web Vitals de campo.
- Gobierno GitHub/AWS comprobado.
- Contratos bloqueando breaking changes.
- Threat model y runbooks actualizados.

Hasta entonces, reportar la madurez real. “10/10” significa riesgos relevantes controlados con evidencia, no documentación extensa ni ausencia de deuda.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Evaluación, Roadmap Y Operación Frontend

✅ **Correcto:** Para **Evaluación, Roadmap Y Operación Frontend**, mantener una norma propietaria y evidencia trazable por cambio.

❌ **Incorrecto:** En **Evaluación, Roadmap Y Operación Frontend**, repetir políticas transversales en cada skill y afirmar aprobaciones no verificadas.

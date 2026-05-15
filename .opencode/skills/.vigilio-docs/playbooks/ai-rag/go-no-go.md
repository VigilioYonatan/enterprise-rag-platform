# Checklist de release · Go / No-Go

**SEGURIDAD (bloquean release)**
- [ ] Tenant A nunca puede recuperar texto/vector/documento de tenant B; test automatizado.
- [ ] ACL de documentos y roles de herramientas aplicados server-side; cuenta SQL sin BYPASSRLS.
- [ ] Prompt injection, poisoning, exfiltración y exceso de agencia probados.
- [ ] Secrets fuera del repositorio; redactar PII en logs y traces; TLS y red restringida.

**CALIDAD (bloquean si cae respecto de baseline aprobado)**
- [ ] Golden set versionado, `Recall@K`, faithfulness y citas comprobadas.
- [ ] 'No tengo evidencia' funciona; no hay citas inventadas.
- [ ] Índice y embedding compatibles; plan de rollback de modelo/índice/prompt.
- [ ] Documentos eliminados/expirados dejan de aparecer en búsquedas y cachés.

**OPERACIÓN / ECONOMÍA**
- [ ] Observabilidad: trace_id end-to-end, p95, errores, tokens y costo.
- [ ] FinOps: reserva presupuestaria, cuota por tenant, hard stop y alertas.
- [ ] Ingesta idempotente, DLQ, reintentos acotados y backlog observable.
- [ ] Backup y restore probados, capacidad planificada, runbook de incidentes.
- [ ] Versiones fijadas, dependencias auditadas, monitoreo de costos externos.

**Decisión:** si una casilla crítica falla, **NO-GO**, incluso con demos convincentes.

## Evidencia antes de aprobar

- Adjuntar reportes reproducibles de ACL entre **usuarios distintos dentro del mismo tenant**, además del aislamiento entre tenants.
- Confirmar que los ejemplos SQL/FinOps/JSONL siguen siendo **no ejecutables como sistema integrado** hasta proporcionar tests y adaptadores.
- Requerir aprobación trazable para umbrales de precisión, latencia, costo y retención.

**Estado del playbook importado:** `NOT_RUN` para PostgreSQL/RLS, API NestJS/Laravel, Redis/queues, e2e de contratos y test de presupuesto real.

## Ejemplo de veredicto verificable

✅ **Correcto:** usar `NO-GO` si una consulta puede devolver documentos que el usuario no posee, incluso cuando el aislamiento entre tenants y las métricas de recuperación pasan. Conservar trace y consulta de prueba redactados para auditoría.

❌ **Incorrecto:** aprobar por mayoría de casillas y compensar con buena precisión una fuga por ACL, una reserva de presupuesto no atómica o la ausencia de rollback del índice.

**Formato:** `control | evidencia/URL de CI | estado PASS/FAIL/NOT_RUN | aprobador | fecha`. `NOT_RUN` jamás equivale a `PASS`.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Entrada explícita:** Definir precondiciones, autoridades y acceso antes de ejecutar el procedimiento.
2. **Secuencia segura:** Enumerar pasos verificables, señales de parada y responsables de aprobación.
3. **Rollback:** Documentar cómo volver al estado anterior y qué datos no deben revertirse.
4. **Evidencia de salida:** Registrar artefactos, enlaces, comandos y estados PASS|FAIL|NOT_RUN|BLOCKED.
5. **Casos límite:** Incluir recuperación de servicio ausente, contratos incompatibles y permisos insuficientes.

**Matriz de escenarios vinculada:** [matriz-calidad-rag](../../standards/ai/matriz-calidad-rag.md).

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Gates específicos para Hybrid RAG + reranking (2026)

- **Bloqueante:** pruebas ejecutadas cross-tenant y **cross-user del mismo tenant**, incluidos documentos revocados/borrados y cachés.
- **Bloqueante:** citas que resuelven chunk/documento/versión autorizados, abstención cuando no hay evidencia; defensa contra inyección de contenido recuperado.
- **Comparativo:** lexical vs dense exacto vs HNSW vs RRF vs RRF+reranker en corpus y dataset *idénticos*, más p95 y costo/consulta útil.
- **Migración:** cambios de embedding requieren índice/versionado separado, rollout canary y rollback ensayado.
- **Operación:** presupuestos por tenant aplicados en runtime, evidencia de trace sin PII, SLO, alertas y runbook de índice.

✅ **Correcto:** declarar `NOT_RUN` si faltan tests consumidores. ❌ **Incorrecto:** hacer GO porque el markdown tiene checklist o las métricas en un ejemplo parecen buenas.

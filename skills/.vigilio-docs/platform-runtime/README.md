# Plataforma Runtime

Esta sección define contratos compartidos de operación.

- [Contrato de observabilidad](1-observability-contract.md)
- [Operación EKS y GitOps](2-eks-gitops-operations.md)
- [Trazabilidad de capacidades](3-capability-traceability.md)
- [Eficiencia de contexto para IA](4-ai-context-efficiency.md)

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Plataforma Runtime

✅ **Correcto:** Para **Plataforma Runtime**, separar configuración y secretos por ambiente, probar arranque y healthchecks.

❌ **Incorrecto:** En **Plataforma Runtime**, hardcodear secretos o prometer despliegue sin pruebas en runtime.

## Integración del Master histórico modernizado

- [Planes de ejecución y locks de contexto — diseño TARGET](5-execution-plans-and-context-locks.md): DAG, procedencia SHA-256, detección STALE, reanudación, evidencias y límites de paralelismo; **no** se declara un runner productivo por existir el estándar.

✅ Correcto: distinguir capacidad implementada, objetivo y hueco verificable. ❌ Incorrecto: declarar «ejecución autónoma 10/10» sin adapters ni gates observados.

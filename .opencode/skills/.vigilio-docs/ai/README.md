# Playbook Senior · IA, RAG y LLMOps (octubre de 2026)

**Objetivo:** buenas prácticas resumidas, aplicables a **NestJS o Laravel**, con prioridad a componentes gratuitos y self-hosted. Es una guía de ingeniería, **no** un proyecto ejecutable ni un certificado de seguridad.

## Regla matriz
**Calidad + seguridad + costo + latencia + operabilidad > cantidad de frameworks.**

## Ruta de lectura (15–25 minutos)

| Orden | Documento | Para qué sirve |
|---|---|---|
| 1 | `foundations/ai/decisiones-rag-agentes.md` | Elegir RAG, tools, contexto directo o agentes |
| 2 | `standards/ai/embeddings-ingesta.md` | Extraer, dividir, versionar y vectorizar |
| 3 | `standards/ai/pgvector-postgresql.md` | Guardar vectores y hacer retrieval con seguridad |
| 4 | `standards/ai/rag-recuperacion.md` | Mejorar búsqueda, evidencia y respuestas |
| 5 | `standards/ai/seguridad-ia.md` | Prompt injection, permisos y datos sensibles |
| 6 | `standards/ai/evaluacion-calidad.md` | Evals, datasets y puertas CI |
| 7 | `standards/ai/observabilidad-llm.md` | Trazas IA + métricas del backend |
| 8 | `standards/ai/finops-llm.md` | Tokens, costos, cuotas y presupuestos |
| 9 | `standards/ai/agentes-tools.md` | Cuándo incorporar agentes y aprobaciones |
| 10 | `standards/ai/operacion-produccion.md` | Jobs, despliegue, incidentes y backups |

También encontrarás un stack sugerido en `technology/baselines/ai-rag-stack-economico.md`, adaptaciones DDD para NestJS/Laravel, ejemplos SQL/JSON/YAML y un checklist Go/No-Go.

## El MVP más simple que sí usaría
- **1 backend:** NestJS **o** Laravel (no ambos por obligación).
- **1 base:** PostgreSQL + pgvector (datos relacionales y chunks).
- **Embeddings:** Ollama + `qwen3-embedding:0.6b` para probar localmente.
- **Generación:** modelo local que cumpla calidad/latencia **o** API con límites.
- **Evals/traces:** Phoenix local, y Promptfoo o tests propios para regresiones.
- **Jobs:** workers con colas cuando la ingesta deje de ser inmediata.
- **Métricas:** OpenTelemetry desde los límites de aplicación; Prometheus/Grafana cuando haya operación real.
- **FinOps:** registro de uso y presupuesto aplicado en backend, no solo dashboards.

## No añadir todavía
Multiagente, Kubernetes, una segunda base vectorial, ClickHouse, múltiples frameworks IA y siete dashboards **sin pruebas que justifiquen esa inversión**.

## Tres invariantes innegociables
1. **Autorización antes de recuperar contexto.** No deben existir filtraciones entre tenants ni documentos con ACL.
2. **Evidencia y abstención.** Citar fragmentos reales o decir que no hay información suficiente.
3. **Cambios reproducibles.** Versionar modelos, prompts, pipeline, índices y conjunto de evaluación.

## Uso de ejemplos
- `platform/ai/postgresql/schema-rag.sql`: **referencia** para adaptar con migraciones y usuarios no privilegiados; usa vectores de **1024 dimensiones**.
- `platform/ai/telemetry/evento-ejemplo.json`: metadatos ficticios; **sin texto privado**.
- `platform/ai/finops/politica-ejemplo.yaml`: reglas sugeridas, **no se ejecutan solas**.
- `playbooks/ai-rag/casos-evaluacion.jsonl`: datos de prueba ficticios, **no** una evaluación automática lista para integrar.

**Fuentes enlazadas:** `references/ai-rag/fuentes-2026.md`. No hay dependencias instaladas, secretos ni servicios cloud requeridos para leer esta guía.

## Estado de esta incorporación a Vigilio

✅ **Correcto:** guía de decisión y checklist técnico, con ejemplos de referencia por adaptar y validar.

❌ **Incorrecto:** interpretar este playbook como backend ejecutable, contrato normativo aprobado, prueba de seguridad superada o baseline de dependencias instalado. El SQL solo contiene RLS por tenant, no ACL de usuario/documento; los presupuestos YAML no ejecutan límites; los JSONL no son un runner de evaluación.

**Documento canónico transversal:** [estándares IA](../standards/ai/README.md), [operación AI](../platform/ai/README.md), [release AI](../playbooks/ai-rag/README.md). El resto de Vigilio y sus reglas humanas conservan precedencia; los proyectos consumidores validan versiones y pruebas. El archivo de origen se conserva intacto como ZIP adjunto al paquete de entrega.

## Cobertura completa y navegación por escenario

- [Matriz aplicable de prácticas, riesgos y aceptación](../standards/ai/matriz-calidad-rag.md) — seleccionar todas las pertinentes; una guía breve o un índice no equivalen a una implementación terminada.

✅ Correcto: seguir el estándar y registrar evidencia. ❌ Incorrecto: detenerse en los primeros tres ejemplos.

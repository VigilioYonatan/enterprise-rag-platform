# 01 · Decisiones arquitectónicas

| Necesidad | Primer enfoque | Evitar |
|---|---|---|
| Resumir 1–3 documentos pequeños | Contexto directo + LLM | Indexar por inercia |
| Consultar cientos de PDFs privados | Hybrid RAG FTS + vector con ACL y citas | Pegar toda la base al prompt |
| Consultar saldos/pedidos vivos | API/SQL autorizado | Convertir la BD transaccional en embeddings |
| Ejecutar cambios en sistemas | Tools con permisos y confirmación | LLM con acceso irrestricto |
| Flujo largo con decisiones y estado | Workflow explícito; agente si aporta valor | Multiagente como primer paso |
| Cambiar estilo o formato | Prompt + salida estructurada | Fine-tuning prematuro |

**Hacer**
- Definir SLO de calidad, p95, costo por respuesta y controles de seguridad **antes** de adoptar frameworks.
- Mantener puertos `EmbeddingProvider`, `Retriever`, `TextGenerator`, `UsageRecorder` y `DocumentStore`.
- Separar **ingesta asíncrona** de **consulta online**; mantener dominio independiente del SDK.
- Medir contra un baseline simple antes de añadir reranking, agentes o bases separadas.

**No hacer**
- Crear un reemplazo general de LangChain cuando solo necesitas integrar 2 APIs.
- Tratar RAG como solución a todos los datos, ni usar embeddings para números exactos.
- Confundir 'open source' con operación gratis: CPU/GPU, almacenamiento y backups cuestan.

## Ejemplo de decisión documentada

✅ **Correcto:** para búsquedas sobre pólizas privadas con fuentes auditables, utilizar recuperación con ACL en la aplicación y en SQL; exigir citas verificadas y evaluar contra un conjunto de preguntas con permisos diferentes.

❌ **Incorrecto:** convertir la API transaccional de pólizas en un índice vectorial y usar similitud semántica para responder importes, estados o permisos en tiempo real.

**Gate:** documentar en ADR la fuente autorizada, el propietario, el requisito de consistencia, las métricas y la alternativa sin IA. No declarar completado el control de acceso solo por incluir `tenant_id` en un prompt.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Capacidad y límite:** Clasificar tareas que requieren conocimiento recuperado frente a cálculos, herramientas o rechazo seguro.
2. **Evidencia y contexto:** Exigir procedencia, permisos y caducidad de la fuente antes de responder; abstenerse sin evidencia suficiente.
3. **Coste medible:** Comparar tokenización, retrieval, reranking y latencia con alternativa no generativa.
4. **Evaluación:** Registrar un conjunto de preguntas reproducible con escenarios incorrectos y sin respuesta.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

**Actualización:** [matriz de selección 2026](seleccion-arquitectura-2026.md); la decisión de técnicas/infraestructura se documenta allí sin repetir implementación.

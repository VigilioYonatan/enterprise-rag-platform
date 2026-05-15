# 05 · Seguridad y privacidad (OWASP LLM)

**Hacer**
- Autorización por **tenant + usuario + documento** antes de devolver chunks; defender también índices, cachés, backups y exportaciones.
- Tratar PDF, web, emails, respuestas de tools y chunks como **datos no confiables**; nunca como instrucciones de sistema.
- Permisos mínimos y allowlist para tools; validar parámetros, salida y recursos del servidor; humano en el circuito para acciones irreversibles.
- Aplicar límites de tamaño, tipo de archivo, tasa, concurrencia, tiempo, tokens y presupuesto.
- Minimizar PII en prompts, trazas y evaluaciones; considerar redacción, hashing de identificadores y retención corta.
- Encriptar transporte/almacenamiento, gestionar secretos fuera del repositorio, auditar accesos, borrado y reindexaciones.
- Hacer pruebas de prompt injection, data poisoning, fuga cross-tenant, extracción de secretos y abuso de tools.
- Escapar/validar salida del LLM antes de SQL, HTML, Markdown rico, shell o invocación de herramientas.
- Revisar licencias de modelos, datasets y permisos de uso del contenido.

**No hacer**
- Guardar secretos en system prompts pensando que el modelo nunca los revelará.
- Usar 'ignora instrucciones maliciosas' como **único** control contra prompt injection.
- Confiar en filtros de prompt para aislamiento de datos o confiar en nombres de archivo enviados por usuarios.
- Exponer Ollama, PostgreSQL, Phoenix, Langfuse o endpoints de observabilidad sin autenticación/red privada.

**Control obligatorio:** test automatizado que demuestre que tenant A no obtiene **ningún** chunk de tenant B, incluso con IDs y prompts maliciosos.

## Gate obligatorio adicional

✅ **Correcto:** validar **usuario → tenant → documentos autorizados → chunks citables** en una ruta server-side comprobable, también cuando cambian ACL y documentos. Segregar cachés y telemetría por permisos.

❌ **Incorrecto:** usar únicamente prompt, similitud semántica o un filtro de `tenant_id` como mecanismo de permisos de documentos. Ver [esquema SQL incompleto para producción](../../platform/ai/postgresql/schema-rag.sql) y [checklist](../../playbooks/ai-rag/go-no-go.md).

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Amenazas específicas de Hybrid/Agentic RAG (2026)

- El documento recuperado es **dato de menor confianza**, incluso si aparece primero en RRF o recibe mayor score de reranker.
- Autorización en retrieval y revalidación al obtener chunk por `tenant_id`, `user_id`, `document_id`, versión/estado; RLS solo tenant no equivale a ACL documental.
- Filtros de autorización y caches incluyen identidad/roles efectivos. Revocación y borrado invalidan texto, vectores, caches y referencias; el indexer usa permisos propios restringidos.
- Tools con efectos laterales necesitan backend policy, esquemas de argumentos, rate limit, presupuesto, idempotencia y aprobación humana si procede. Nunca convertir instrucción de un PDF en una llamada a `executeSql()`.
- Amenazas a probar: prompt injection directa e indirecta, exfiltración vía citas/tool outputs, poisoning de índice, documentos borrados, mezcla de versiones, abuso de presupuesto y retrieval cross-user en mismo tenant.

✅ **Correcto:** tratar el documento como cita/evidencia, delimitarlo y validar cada acceso a fuente con actor confiable.

❌ **Incorrecto:** pedir al modelo que «ignore documentos prohibidos» en vez de filtrarlos en la base de datos.

[OWASP RAG Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html) · [SQL híbrido con ACL conceptual](hybrid-rag-postgresql.md).

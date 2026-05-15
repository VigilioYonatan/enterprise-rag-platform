# IA/RAG — cobertura de calidad por riesgo, sin listas recortadas

**Propietario:** estándares de evaluación de IA; aplica a cualquier implementación, sin atar la regla a un lenguaje. Versiones y modelos de referencia se gestionan en [versiones](../../technology/versions.md), y los criterios de indexación/retrieval en [evaluación](evaluacion-calidad.md).

## Diseño experimental y corpus (10)

1. Definir tareas autorizadas y criterios de abstención antes de generar respuestas; revisar casos de borde.
2. Registrar procedencia, fecha, licencia y versión del corpus; evaluar obsolescencia.
3. Separar splits de desarrollo, regresión y holdout sin filtración de respuestas.
4. Incluir preguntas respondibles, ambiguas, sin evidencia y maliciosas.
5. Incluir consultas con términos técnicos, sinónimos, errores de escritura y variantes de idioma.
6. Asegurar ejemplos multitenant con documentos similares entre organizaciones.
7. Incluir permisos por usuario/documento revocados después de cachear resultados.
8. Etiquetar documentos relevantes, parcialmente relevantes y contradictorios.
9. Detectar duplicados y near-duplicates entre chunks para evitar sobreponderación.
10. Documentar criterios de expertos y desacuerdos en anotaciones, no declarar gold arbitrario.

## Retrieval y grounding (10)

11. Medir `recall@k` y `precision@k` con etiquetas independientes del reranker.
12. Comparar dense vs híbrido y filtros estructurales antes de aumentar k indiscriminadamente.
13. Comprobar que filtros tenant/ACL se aplican antes de entregar contexto al LLM.
14. Medir latencia p50/p95/p99 de embedding, query, rerank y generación por separado.
15. Verificar chunk boundaries, solapamiento y citas que apuntan al documento correcto.
16. Evaluar cambios de modelo/dimensión con reindexación controlada y rollback.
17. Detectar fallos de extracción de PDF/tablas sin asumir texto perfecto.
18. Comprobar consistencia de resultados tras actualización/borrado de documentos.
19. Evaluar consultas sin match, baja confianza y contenidos contradictorios.
20. Revisar que búsqueda no devuelve fragmentos de documentos eliminados o inaccesibles.

## Respuesta, seguridad, operación y FinOps (12)

21. Medir factualidad y soporte de cada afirmación frente a pasajes citados.
22. Rechazar respuestas seguras sin evidencia cuando la tarea exige procedencia.
23. Probar prompt injection dentro de chunks sin elevar instrucciones de documentos a sistema.
24. Probar exfiltración y filtración entre tenants en preguntas aparentemente inocuas.
25. Comprobar que no se registran prompts completos ni PII sin política explícita.
26. Evaluar salida estructurada/JSON y errores de parseo con esquema formal.
27. Medir costes reales por consulta y por tenant, incluyendo retries y caching.
28. Probar límite de tokens y presupuesto concurrente, no solo presupuesto declarativo.
29. Controlar rate limits del proveedor y degradación/timeout sin cascadas.
30. Medir drift y fallas de proveedor, con canary y rollback evaluados.
31. Versionar dataset, prompts y pipelines para comparar regresiones reproducibles.
32. Publicar gate go/no-go con dueños, umbrales y ejecución real; `NOT_RUN` no es `PASS`.

✅ **Correcto:** cada cambio de embeddings, chunking, reranking o guardrail compara resultados y autorización contra dataset estable. ❌ **Incorrecto:** presentar 3 preguntas de ejemplo como certificación RAG completa, o reportar precisión sin etiquetado fiable.

# Playbook de incidentes IA

1. **Fuga de datos/tenant:** deshabilitar retrieval afectado, revocar acceso, conservar evidencia segura, investigar RLS/ACL/cache, cumplir proceso de notificación aplicable.
2. **Gasto anómalo:** activar límites/hard-stop, identificar modelo/tenant/feature, revisar reintentos, caché y precios, reconciliar factura.
3. **Alucinaciones masivas:** revertir prompt/modelo/índice, aislar conjunto de casos, inspeccionar retrieval/citas y reinstaurar baseline.
4. **Índice inconsistente:** detener publicación, mantener versión activa previa, reindexar en staging, medir recall, swap atómico.
5. **Embeddings/modelo caído:** usar cola + DLQ, detener reintentos ilimitados, ofrecer respuesta de degradación / disponibilidad reducida.
6. **Observabilidad fuera de servicio:** no bloquear solicitudes de negocio automáticamente por un collector caído; aplicar buffer/timeout y proteger privacidad.

Al cerrar: línea de tiempo con trace IDs, impacto por tenant, causa raíz, cambios en tests/alertas y responsable.

## Ejemplo de contención y cierre

✅ **Correcto:** ante fuga por retrieval, deshabilitar la ruta o versión de índice afectada, revocar acceso, preservar evidencias minimizadas, verificar usuarios y documentos impactados, corregir ACL en la consulta SQL y crear una regresión adversarial antes de reabrir.

❌ **Incorrecto:** cambiar únicamente el system prompt, borrar logs antes de investigar o reactivar retrieval basándose en una sola consulta manual exitosa.

**Criterio de recuperación:** owner designado, línea de tiempo, métricas de impacto, prueba negativa reproducible, control implementado y monitoreo temporalmente reforzado. Cumplir los procedimientos legales de notificación aplicables sin publicar secretos en el reporte.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


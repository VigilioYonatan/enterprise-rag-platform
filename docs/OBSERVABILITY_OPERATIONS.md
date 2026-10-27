# Observabilidad — contrato operativo v6

- Métricas `rag_http_requests_total` (success/client_error/server_error) y `rag_http_duration_seconds` (sin etiquetas de usuario, tenant, ruta con parámetros, documentos ni texto de prompts).
- Traces Node HTTP/Nest bajo `OTEL_TRACING_ENABLED=true`, preloaded antes del bootstrap. `pg`, Redis y fs desactivados por privacidad; el exportador OTLP no transmite cuerpos ni tokens deliberadamente.
- Pipeline: OTLP HTTP → Collector con `memory_limiter` + `batch` → Tempo (retención local 48 h). Grafana permite explorar trazas. No se permite Internet ingress a 4318/4317.
- Activación: `docker compose --profile observability up -d`; configurar `OTEL_TRACING_ENABLED=true` para API/worker, recrear los procesos y verificar una traza sintética en Tempo.
- Prometheus tiene reglas y dashboard, pero un yaml presente no acredita que exista tráfico, que se despache una alerta ni que se cumpla un SLO.
- **Gate de privacidad:** crear una consulta sintética con marcador privado, inspeccionar el payload OTLP e impedir tokens, texto documental y PII. **NOT_RUN** mientras no exista stack real.
- **Gate operacional:** pruebas sintéticas de latencia, caída de API, cola saturada, error 5xx, disparo y entrega de alertas; medir RPO/RTO mediante drills de restauración. **NOT_RUN** aquí.
- Runbook: ante errores altos, comprobar `/api/v1/health/ready`, correlación `X-Request-Id`, trazas, uso de conexiones PG y estados de ingesta. No copiar bodies de chat a incidentes.

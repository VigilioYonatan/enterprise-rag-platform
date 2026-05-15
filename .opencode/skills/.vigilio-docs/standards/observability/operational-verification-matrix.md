# Observabilidad operativa — señales, diagnósticos y gates

Esta referencia es compartida por los stacks. **No** reemplaza autorizadores, interceptores ni código específico de cada framework. Baseline: [versiones](../../technology/versions.md). Las prácticas se seleccionan por amenaza y no se aplican de manera ciega.

## SLI y SLO

1. **Disponibilidad percibida:** Medir porcentaje de operaciones útiles completadas, no solo HTTP 200. **Evidencia:** caso negativo o medición reproducible vinculada al control.
2. **Latencia por percentil:** Medir p50/p95/p99 por ruta crítica; verificar presupuestos de timeout. **Evidencia:** caso negativo o medición reproducible vinculada al control.
3. **Errores de dominio:** Separar errores del usuario, authz y 5xx para evitar alertas engañosas. **Evidencia:** caso negativo o medición reproducible vinculada al control.
4. **Burn rate:** Definir alerta de consumo acelerado del error budget, no umbral fijo de CPU. **Evidencia:** caso negativo o medición reproducible vinculada al control.
5. **Dependencias:** Separar fallas DB/cola/proveedor para localizar causantes. **Evidencia:** caso negativo o medición reproducible vinculada al control.
6. **Región y tenant:** Segmentar métricas solo donde cardinalidad/privacidad sean aceptables. **Evidencia:** caso negativo o medición reproducible vinculada al control.
7. **Salud:** Verificar liveness/readiness sin false-positive por caché accidental. **Evidencia:** caso negativo o medición reproducible vinculada al control.

## Trazas y logs

8. **Correlación extremo a extremo:** Propagar trace id entre HTTP, workers, DB y terceros cuando esté disponible. **Evidencia:** caso negativo o medición reproducible vinculada al control.
9. **Contexto mínimo:** Loggear request id, operación, duración y outcome sin payload sensible. **Evidencia:** caso negativo o medición reproducible vinculada al control.
10. **Sampling:** Usar sampling razonado por riesgo y volumen; no afirmar que ausencia de trace prueba ausencia de falla. **Evidencia:** caso negativo o medición reproducible vinculada al control.
11. **Spans de negocio:** Instrumentar transiciones semánticas sin exponer PII ni IDs como etiquetas ilimitadas. **Evidencia:** caso negativo o medición reproducible vinculada al control.
12. **Excepciones:** Registrar stacktrace solo en backend seguro y devolver error estable al cliente. **Evidencia:** caso negativo o medición reproducible vinculada al control.
13. **Retries y DLQ:** Registrar reentregas y poison messages para que no queden invisibles. **Evidencia:** caso negativo o medición reproducible vinculada al control.
14. **Métricas de caché:** Observar hit/miss, evictions y stale reads sin confundir aumento de hit con corrección. **Evidencia:** caso negativo o medición reproducible vinculada al control.

## Operación, costes y privacidad

15. **Cardinalidad:** Revisar labels generados por user-id o documento, limitar dimensiones. **Evidencia:** caso negativo o medición reproducible vinculada al control.
16. **Retención:** Ajustar TTL de logs y trazas por clasificación de datos, cumplimiento y coste. **Evidencia:** caso negativo o medición reproducible vinculada al control.
17. **Acceso:** Separar roles de dashboards y auditoría de lectura/exportación. **Evidencia:** caso negativo o medición reproducible vinculada al control.
18. **Runbook:** Asociar alerta a diagnóstico, mitigación, escalamiento y dueño. **Evidencia:** caso negativo o medición reproducible vinculada al control.
19. **Prueba de alertas:** Inyectar fallo controlado en ambiente de prueba y verificar notificación útil. **Evidencia:** caso negativo o medición reproducible vinculada al control.
20. **Postmortem:** Registrar causas sistemáticas y acciones verificables con responsables. **Evidencia:** caso negativo o medición reproducible vinculada al control.
21. **FinOps:** Controlar presupuesto de ingestión, almacenamiento y sampling por señal. **Evidencia:** caso negativo o medición reproducible vinculada al control.

## Calidad y entrega

22. **Instrumentación antes del release:** Probar logs y propagación de trace en staging con flujo representativo. **Evidencia:** caso negativo o medición reproducible vinculada al control.
23. **Dashboards versionados:** Guardar consultas/umbrales revisables, no solo screenshots. **Evidencia:** caso negativo o medición reproducible vinculada al control.
24. **Calidad del dato:** Evitar timestamps inconsistentes, labels no documentados y eventos duplicados. **Evidencia:** caso negativo o medición reproducible vinculada al control.
25. **Degradación del collector:** Probar fallo de exporter sin interrumpir negocio en servicios no críticos. **Evidencia:** caso negativo o medición reproducible vinculada al control.
26. **Canary:** Comparar release actual vs candidato por SLI, costo y errores antes de completar rollout. **Evidencia:** caso negativo o medición reproducible vinculada al control.
27. **Evidencia honesta:** Guardar sample de señal, comando y resultado; NOT_RUN cuando no haya collector. **Evidencia:** caso negativo o medición reproducible vinculada al control.

## Gate de salida

Aplicar las **27 comprobaciones** pertinentes al riesgo, y justificar las no aplicables.

✅ **Correcto:** pruebas y métricas respaldan el estado reportado.

❌ **Incorrecto:** reutilizar la misma lista sin evaluar el modelo de amenazas o presentar un checklist sin ejecución como certificación.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **SLI por usuario:** Medir éxito, latencia y disponibilidad desde el punto de vista del consumidor.
2. **Correlación:** Propagar request-id/trace-id de API a worker y DB sin aumentar cardinalidad PII.
3. **Runbook accionable:** Definir síntoma, hipótesis, query/dashboards, owner y acciones seguras de mitigación.
4. **Presupuesto de error:** Establecer política de despliegue cuando se agota y comprobar alertas sin fatiga.
5. **Retención y costes:** Controlar sampling, cardinalidad y almacenamiento de señales con presupuesto definido.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

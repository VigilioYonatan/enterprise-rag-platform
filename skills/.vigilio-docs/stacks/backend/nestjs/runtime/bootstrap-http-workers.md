# NestJS: bootstrap HTTP y workers por entrada

Diferenciar bootstrap del servidor HTTP y de cada worker/event consumer. Ambos usan servicios de aplicación comunes sin acoplar handler de colas a decoradores/controllers HTTP. Validar configuración antes de aceptar tráfico o eventos.

## HTTP

- Helmet/CORS/compresión/rate-limit según entorno y threat model.
- Guards globales/private-by-default, error filter, requestId y Zod boundary.
- Swagger/OpenAPI/Scalar registrado una sola vez por bootstrap; rutas protegidas.
- Health readiness verifica dependencias críticas; liveness no bloquea por dependencias lentas.

## Worker

- Carga configuración independiente, DI para caso de uso, idempotencia, presupuesto de reintentos y shutdown.
- Procesamiento parcial y visibilidad SQS, DLQ y limpieza de trazas.
- En Lambda evaluar ciclos de vida y warm starts; en EKS workers separados, HPA/KEDA y señales.

✅ Correcto: tests smoke de arranque por entrada y graceful shutdown.

❌ Incorrecto: iniciar servidor HTTP completo dentro de cada worker o duplicar reglas de negocio en handlers.

[Workers](../messaging/outbox-sqs.md), [runbooks](../../../../platform/sre/operations.md).

## Procedencia documental preservada

- [Capítulo heredado: 8-bootstrap-http-workers.md](references/8-bootstrap-http-workers.md) — contenido íntegro conservado.
- [Capítulo heredado: 40-operacion-produccion.md](references/40-operacion-produccion.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Separación runtime:** Levantar contextos HTTP y workers según ciclo de vida y autorización de cada uno.
2. **Shutdown:** Manejar SIGTERM, stop de consumo y flush de outbox/trazas antes del exit.
3. **Health:** Publicar readiness con dependencias esenciales y liveness sin queries costosas.
4. **Config:** Validar entorno y claves antes de abrir sockets.
5. **Perfiles:** Definir límites de memoria y concurrencia por tipo de proceso.
6. **Test:** Probar restart del worker y graceful shutdown sin trabajo duplicado.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

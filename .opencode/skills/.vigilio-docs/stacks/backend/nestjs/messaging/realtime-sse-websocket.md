# NestJS: SSE, WebSocket/Socket.IO y límites del transporte

Elegir SSE para eventos unidireccionales compatibles HTTP y reconexión sencilla; WebSocket para bidireccional con estado de conexión; HTTP polling para pocos cambios. Los clientes no se autentican por el simple hecho de abrir una conexión: autorización de canal, token/expiración y filtrado tenant siguen obligatorios.

- Contrato Zod de mensajes con versión/operationId y formato JSON explícito.
- En EKS con varias réplicas, decidir adaptador pub/sub y sticky sessions donde aplique.
- Límite por conexión, backpressure, heartbeat, reintentos con jitter y dedupe tras reconexión.
- Observabilidad: conexiones activas, desconexiones, latencia y errores; no usar IDs de usuario como etiqueta.

✅ Correcto: `Policy.canSubscribe(actor, room)` antes del join, eventos con ID y pruebas de revocación.

❌ Incorrecto: broadcast global con payload de otro tenant, confiar solo en frontend para ACL o mantener secretos en query string.

[Seguridad](../security/guards-authorization.md), [mensajería compartida](../../../../standards/messaging/reliability.md).

## Procedencia documental preservada

- [Capítulo heredado: 44-realtime-websocket-sse.md](references/44-realtime-websocket-sse.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Autorización:** Autenticar el handshake y cada suscripción por recurso/tenant.
2. **Revocación:** Desuscribir conexión activa tras revocación de permiso.
3. **Reconexión:** Definir Last-Event-ID o cursor equivalente para no perder orden crítico.
4. **Backpressure:** Controlar buffers, límites de conexión y política drop/retry.
5. **Corazón:** Aplicar heartbeat, timeout e idle cleanup.
6. **Test:** Probar desconexión/reintento, tenant cruzado y carga de subscriptores.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

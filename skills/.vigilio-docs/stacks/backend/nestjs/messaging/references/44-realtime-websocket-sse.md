# Tiempo Real: WebSocket, Socket.IO Y SSE

## Objetivo

Elegir el transporte mínimo que cumpla el caso de uso.

| Necesidad | Transporte recomendado |
|---|---|
| Actualizaciones unidireccionales del servidor | SSE |
| Comunicación bidireccional simple | WebSocket |
| Rooms, acknowledgements y reconexión administrada | Socket.IO |
| Operación asíncrona durable | SQS, no WebSocket |

No uses tiempo real para reemplazar HTTP, colas o persistencia durable.

## Contrato Compartido

- Define eventos versionados en el paquete contractual.
- Valida cada payload con Zod en ambos extremos.
- Mantén nombres, tipos y constantes fuera de gateways y services.
- Coloca tipos propios en `types/` dentro de su feature.
- Coloca eventos y límites en `constants/` dentro de su feature.
- Mantén DTOs inferidos junto al schema que los define.
- Evita barrels globales para tipos o constantes.

```text
src/chat/
|-- application/
|   |-- constants/chat-events.constant.ts
|   |-- schemas/chat-message.schema.ts
|   `-- types/chat-session.type.ts
|-- infrastructure/realtime/chat.gateway.ts
`-- chat.module.ts
```

## Seguridad

- Autentica durante el handshake.
- Autoriza cada room y evento.
- Rechaza tokens en query strings.
- Limita conexiones, eventos y tamaño de payload.
- Restringe `Origin` mediante configuración validada.
- Redacta tokens, mensajes sensibles y PII.
- Desconecta sesiones revocadas.

## Escalamiento

- Usa un adapter compartido con múltiples réplicas.
- Valida el PostgreSQL adapter antes de adoptarlo.
- Configura afinidad solamente cuando el adapter la requiera.
- Implementa `readiness` y drenado de conexiones.
- Define timeouts del ALB para conexiones largas.
- Mide conexiones, errores, latencia y eventos rechazados.

## SSE

- Envía `id`, `event` y `data` válidos.
- Reanuda mediante `Last-Event-ID` cuando exista historial.
- Envía heartbeats para evitar cierres intermedios.
- Cancela productores cuando el cliente desconecte.
- Deshabilita buffering en proxies compatibles.

## Ejemplos

### ✅ Correcto: contrato separado

```ts
// application/constants/chat-events.constant.ts
export const CHAT_EVENTS = {
  messageCreated: 'chat.message.created.v1',
} as const;

// application/types/chat-session.type.ts
export type ChatSession = { userId: string; roomId: string };
```

### ❌ Incorrecto: declaraciones dentro del gateway

```ts
type ChatSession = { userId: string; roomId: string };
const MESSAGE_CREATED = 'message';

export class ChatGateway {}
```

### ✅ Correcto: validar y autorizar

```ts
const payload = chatMessageSchema.parse(input);
await authorizer.assertRoomAccess(session.userId, payload.roomId);
```

### ❌ Incorrecto: confiar en el cliente

```ts
socket.join(input.roomId);
server.emit('message', input);
```

### ✅ Correcto: SSE cancelable

```ts
request.signal.addEventListener('abort', () => subscription.close());
```

### ❌ Incorrecto: productor huérfano

```ts
setInterval(() => response.write(data), 1000);
```

## Pruebas Mínimas

- Prueba schemas y autorización sin red.
- Prueba handshake inválido y room prohibida.
- Prueba reconexión, duplicados y orden esperado.
- Prueba múltiples réplicas con el adapter real.
- Prueba desconexión SSE y liberación de recursos.
- Prueba drenado durante rollout.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).


# AI Chat con Amazon Bedrock

Este modulo implementa un chatbot HTTP normal, sin WebSockets, usando Amazon Bedrock Runtime y la API `Converse`. Es la opcion recomendada cuando el frontend solo necesita enviar un mensaje y recibir una respuesta completa.

## Estructura DDD

```text
src/ai-chat/
|-- application/
|   |-- dtos/
|   |   |-- ai-chat-ask.request.dto.ts
|   |   `-- ai-chat-ask.response.dto.ts
|   |-- providers/
|   |   |-- ai-chat-model.provider.interface.ts
|   |   `-- ai-chat-model.provider.token.ts
|   |-- schemas/
|   |   `-- ai-chat.schema.ts
|   `-- service/
|       `-- ai-chat.application-service.ts
|-- infrastructure/
|   |-- bedrock/
|   |   `-- bedrock-ai-chat-model.provider.ts
|   `-- http/
|       `-- controllers/
|           `-- ai-chat.controller.ts
`-- ai-chat.module.ts
```

Regla:

- `application/schemas`: contratos Zod reutilizables.
- `application/dtos`: request/response DTOs para controller, Swagger/Scalar y tipos.
- `application/providers`: puerto del modelo IA, sin dependencia AWS.
- `application/service`: caso de uso `ask`, sin SDK AWS ni HTTP.
- `infrastructure/bedrock`: adaptador AWS Bedrock Runtime.
- `infrastructure/http`: controller NestJS.

## Endpoint

```http
POST /ai-chat/messages
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "conversation_id": "conv-123",
  "system": "Responde como arquitecto AWS senior, corto y practico.",
  "messages": [
    {
      "role": "user",
      "content": "Como ahorro costos en S3?"
    }
  ],
  "max_tokens": 512,
  "temperature": 0.2,
  "top_p": 0.9
}
```

Response:

```json
{
  "success": true,
  "conversation_id": "conv-123",
  "answer": "Usa lifecycle policies, Intelligent-Tiering cuando aplique...",
  "message": {
    "role": "assistant",
    "content": "Usa lifecycle policies, Intelligent-Tiering cuando aplique..."
  },
  "usage": {
    "input_tokens": 80,
    "output_tokens": 120,
    "total_tokens": 200
  },
  "provider": {
    "model_id": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "stop_reason": "end_turn",
    "latency_ms": 850
  }
}
```

## Variables

```bash
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0 # modelo o inference profile habilitado en Bedrock
BEDROCK_MAX_TOKENS=1024 # limite default de salida para controlar costo
BEDROCK_TEMPERATURE=0.2 # respuestas mas deterministicas
BEDROCK_TOP_P=0.9 # sampling nucleus default
AWS_REGION=us-east-1 # region donde esta habilitado Bedrock
```

`BEDROCK_MODEL_ID` es opcional al arrancar para permitir desarrollo local sin Bedrock. Si llamas el endpoint sin configurarlo, responde `503 Service Unavailable` con mensaje claro.

## Seguridad

- El endpoint no usa `@Public`; requiere JWT.
- Zod limita cantidad de mensajes, longitud del prompt y parametros de inferencia.
- No se loguea prompt ni respuesta del usuario/modelo.
- El adaptador solo registra `conversation_id`, `user_id`, `model_id` y error tecnico.
- IAM debe usar minimo privilegio: `bedrock:InvokeModel` sobre el modelo o inference profile requerido.
- Para entornos productivos, agregar WAF/rate limit/API Gateway usage plan si el endpoint queda expuesto publicamente.

Ejemplo IAM minimo:

```json
{
  "Effect": "Allow",
  "Action": ["bedrock:InvokeModel"],
  "Resource": [
    "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
  ]
}
```

## Costo y performance

- Mantener `max_tokens` bajo por defecto.
- Enviar solo el historial reciente necesario; no mandar toda la conversacion eterna.
- Persistir conversaciones solo si negocio lo necesita; este modulo es stateless por defecto.
- Para RAG, separar retrieval en otro provider y controlar numero de documentos/contexto.
- Para respuestas largas en tiempo real, no cambiar este endpoint a WebSocket por reflejo: primero evaluar SSE o `ConverseStream`.
- Medir `usage.total_tokens` y enviarlo a metricas para presupuesto y alertas FinOps.

## Por que no WebSocket

WebSocket sirve si necesitas streaming bidireccional, escritura colaborativa o UX token-by-token. Para un chat normal corporativo, HTTP request/response es mas simple, barato, testeable y facil de proteger con JWT, WAF, logs y OpenAPI.

Si luego se pide streaming:

- Backend: `ConverseStreamCommand`.
- Transporte: SSE para una sola respuesta streaming, WebSocket si hay sesiones interactivas persistentes.
- IAM: agregar `bedrock:InvokeModelWithResponseStream`.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Mantener invariantes en el agregado cuando existan; nombre semántico y ports desacoplados de framework/ORM.
- ❌ **Incorrecto:** DDD ceremonial para CRUD trivial, lógica de dominio en controller, repositorio retornando mensajes HTTP del negocio sin necesidad.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.

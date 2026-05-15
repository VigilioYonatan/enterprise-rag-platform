# Bootstrap HTTP y Workers - `bus-impl` 2026

Este documento actualiza el modelo de arranque del backend.

En el `bus-impl` original habia mucho valor en el bootstrap con Nest + middlewares, pero el enrutamiento dinamico por `action` era costoso de mantener. La version 2026 separa claramente:

- HTTP controllers
- workers async

---

## 1. Bootstrap HTTP

Para peticiones REST se recomienda una Lambda dedicada para HTTP.

```typescript
// src/product/infrastructure/bootstrap/http.lambda.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import awsLambdaFastify from '@fastify/aws-lambda';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProductHttpModule } from './http.module';
import { setupSwagger } from '../../../../shared/infrastructure/docs/swagger.config';

let proxy: ReturnType<typeof awsLambdaFastify>;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    ProductHttpModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ZodValidationPipe());
  setupSwagger(app);

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return awsLambdaFastify(app.getHttpAdapter().getInstance());
}

export const handler = async (event: unknown, context: unknown) => {
  proxy ??= await bootstrap();
  return proxy(event, context);
};
```

Ventajas:

- controllers REST reales
- Swagger natural
- Scalar como referencia visual moderna
- validacion Zod directa
- logging estructurado real con `pino`
- mejor compatibilidad con Playwright y smoke tests

---

## 2. Bootstrap worker

Los eventos async no necesitan levantar un servidor HTTP.

```typescript
// src/product/infrastructure/bootstrap/worker.lambda.ts
import { NestFactory } from '@nestjs/core';
import middy from '@middy/core';
import { Logger } from 'nestjs-pino';
import { ProductWorkerModule } from './worker.module';
import { buildWorkerHandler } from './worker.router';

let appContext: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;

async function getAppContext() {
  appContext ??= await NestFactory.createApplicationContext(ProductWorkerModule, {
    bufferLogs: true,
  });

  appContext.useLogger(appContext.get(Logger));
  appContext.flushLogs();

  return appContext;
}

const baseHandler = async (event: unknown) => {
  const context = await getAppContext();
  const handler = buildWorkerHandler(context);
  return handler(event);
};

export const handler = middy(baseHandler);
```

---

## 3. Router explicito para eventos

En vez de `controller[action]`, se recomienda un router tipado:

```typescript
// src/product/infrastructure/bootstrap/worker.router.ts
import type { INestApplicationContext } from '@nestjs/common';
import { ValidarTramaConsumer } from '../events/consumers/validar-trama.consumer';
import { ProcesarMovimientoConsumer } from '../events/consumers/procesar-movimiento.consumer';

export function buildWorkerHandler(appContext: INestApplicationContext) {
  const validarTramaConsumer = appContext.get(ValidarTramaConsumer);
  const procesarMovimientoConsumer = appContext.get(ProcesarMovimientoConsumer);

  return async (event: any) => {
    if (event.source === 'aws.events' && event['detail-type'] === 'ValidarTrama') {
      return validarTramaConsumer.handle(event.detail);
    }

    if (event.Records?.[0]?.eventSource === 'aws:sqs') {
      return procesarMovimientoConsumer.handle(event.Records);
    }

    throw new Error('Unsupported event source');
  };
}
```

Beneficios:

- menos reflexion dinamica
- mejor cobertura
- menos errores silenciosos

---

## 4. Middy si, pero con objetivos claros

`@middy/core@7.6.7` sigue siendo util si se usa para concerns transversales reales:

- correlation-id
- metricas
- parseo de eventos
- manejo uniforme de errores
- idempotencia

No debe usarse para ocultar el flujo funcional completo.

---

## 5. Manejo de errores

Separar dos capas:

### HTTP

- `BadRequestException`
- `ConflictException`
- `UnprocessableEntityException`
- filtros Nest para serializar respuestas

### Workers

- errores reintentables vs no reintentables
- DLQ para fallos permanentes
- logs estructurados con `requestId` y `correlationId`

---

## 6. OpenAPI y bootstrap

La generacion de OpenAPI debe vivir en el bootstrap HTTP o en un script dedicado de export.

`setupSwagger(app)` debe crear el documento con `SwaggerModule.createDocument(...)` y procesarlo con
`cleanupOpenApiDoc(...)` antes de servir Swagger/Scalar o exportar el artefacto.

Regla recomendada:

- el runtime HTTP sirve `/reference` como UI principal en local y development
- `/docs` puede mantenerse como fallback interno
- CI exporta `openapi.json`
- production publica el artefacto o protege la UI

---

## 7. Observabilidad

Cada bootstrap debe inyectar:

- logger estructurado
- `requestId`
- `correlationId`
- spans si se usa OpenTelemetry

Tambien debe diferenciar:

- nombre de servicio HTTP
- nombre de worker o consumer

Regla recomendada:

- HTTP y workers deben compartir la misma politica de `pino` en niveles, redaction y campos base
- local puede usar `pino-pretty`; cloud debe salir en JSON limpio

---

## 8. Paso desde el modelo anterior

Antes:

- handler generico
- action dinamica
- todo mezclado en el mismo flujo

Ahora:

- una Lambda HTTP por modulo o grupo de rutas
- workers async explicitos
- routers de evento tipados
- bootstrap mas simple para cada caso

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Bootstrap HTTP y Workers - `bus-impl` 2026

✅ **Correcto:** Para **Bootstrap HTTP y Workers - `bus-impl` 2026**, validar en el borde HTTP, preservar errores tipados y autorización.

❌ **Incorrecto:** En **Bootstrap HTTP y Workers - `bus-impl` 2026**, mezclar reglas de dominio con transporte HTTP o confiar solo en TypeScript.

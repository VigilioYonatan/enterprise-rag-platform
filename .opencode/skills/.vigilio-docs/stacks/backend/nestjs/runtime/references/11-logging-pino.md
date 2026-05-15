# Logging con Pino - `bus-impl` 2026

Este documento aterriza la implementacion recomendada de logging estructurado para esta arquitectura.

La recomendacion base es:

- `pino`
- `nestjs-pino`
- salida JSON a `stdout`
- `pino-pretty` solo en local

---

## 1. Decision recomendada en 2026

Para este backend Nest + Lambda + CloudWatch, mi recomendacion sigue siendo:

- usar `pino` como logger base
- usar `nestjs-pino` como integracion principal con Nest

Por que:

- Nest documenta que Pino es una opcion popular por rendimiento y flexibilidad
- `pino` sigue enfocado en logging JSON de bajo overhead
- `nestjs-pino` te da integracion limpia con request context y `app.useLogger(...)`

Regla:

- si tu backend ya es JSON-first, CloudWatch-first y event-driven, `pino` encaja mejor que un logger centrado en formato humano por defecto

---

## 2. Cuando no complicarte

No todos los servicios necesitan el mismo nivel de sofisticacion.

Puedes usar el logger JSON de Nest si:

- el servicio es muy pequeno
- no necesitas request context fuerte
- no tienes mucha observabilidad distribuida

Pero para este `bus-impl`, la recomendacion sigue siendo `pino` porque:

- hay HTTP
- hay workers
- hay Lambda
- hay correlation entre request, eventos y trazas

---

## 3. Salida recomendada por ambiente

### Local

- `pino-pretty`
- nivel `debug`
- una sola linea si ayuda a leer rapido

### Development y test

- JSON real
- nivel `debug` o `info` segun ruido

### Staging y production

- JSON real
- nivel `info`
- `debug` solo bajo flag temporal

Regla:

- pretty logs en cloud suelen empeorar parsing, costo y consistencia

---

## 4. Que campos debe tener cada log

Campos base recomendados:

- `service`
- `stage`
- `request_id`
- `correlation_id`
- `context`
- `action`
- `event_name`
- `tenant_id` si aplica
- `user_id` si aplica

Campos utiles para workers:

- `message_id`
- `queue`
- `retry_count`
- `consumer`

Campos utiles para errores:

- `err.type`
- `err.message`
- `err.stack`

Regla:

- si un log no ayuda a buscar un request o seguir una ejecucion, probablemente le falta contexto

---

## 5. Redaction obligatoria

Nunca mandar esto a logs por defecto:

- `authorization`
- `cookie`
- `set-cookie`
- `password`
- `token`
- `secret`
- payloads con PII no justificada

Patron recomendado:

```typescript
redact: {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.headers["set-cookie"]',
    'req.body.password',
    'req.body.token',
    'req.body.secret',
  ],
  remove: true,
}
```

Regla:

- en seguridad real, es mejor quitar el dato que confiar en que alguien no lo usara despues

---

## 6. Integracion recomendada con Nest

### 6.1 Modulo de logger

```typescript
// src/shared/infrastructure/observability/logger/logger.module.ts
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { environments } from '@/shared/infrastructure/config/environments';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      useFactory: () => ({
        pinoHttp: {
          level: environments.app_stage === 'production' ? 'info' : 'debug',
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["set-cookie"]',
              'req.body.password',
              'req.body.token',
              'req.body.secret',
            ],
            remove: true,
          },
          customProps: (req) => ({
            service: 'bus-impl',
            stage: environments.app_stage,
            request_id: req.id,
            correlation_id: req.headers['x-correlation-id'],
          }),
          transport:
            environments.app_stage === 'local'
              ? {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true },
                }
              : undefined,
        },
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
```

### 6.2 Bootstrap HTTP

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  await app.listen(3000);
}

void bootstrap();
```

### 6.3 Bootstrap worker

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.flushLogs();

  return app;
}
```

Regla:

- `bufferLogs: true` evita que Nest arranque mezclando el logger por defecto y el custom

---

## 7. Como loguear dentro del codigo

Recomendacion:

- en servicios y controllers usar `Logger` de `@nestjs/common`
- dejar que Nest lo enrute al logger real configurado

Ejemplo:

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProductApplicationService {
  private readonly logger = new Logger(ProductApplicationService.name);

  async registerProduct(body: RegisterProductRequestDto) {
    this.logger.log({ broker_id: body.broker_id }, 'registerProduct completed');
  }
}
```

Si necesitas API especifica de Pino:

- usar `PinoLogger` en casos puntuales
- no acoplar todo el dominio y application a eso

---

## 8. HTTP logs

Buenas practicas:

- log de entrada HTTP con metodo, ruta, status y latencia
- no loggear body completo salvo necesidad controlada
- no loggear archivos ni binarios
- excluir healthchecks demasiado ruidosos si ya tienen monitoreo aparte

Regla:

- `/health` y `/ready` pueden inundar CloudWatch si se dejan con el mismo nivel y detalle que el resto

---

## 9. Worker logs

Buenas practicas:

- loguear `event_name`, `message_id`, `queue`, `retry_count`
- incluir `bounded_context`
- separar errores reintentables de permanentes
- si usas DLQ, dejar evidencia del motivo de descarte

Ejemplo:

```typescript
this.logger.warn(
  {
    event_name: 'ProcesarMovimiento',
    queue: 'product-movimientos',
    message_id,
    retry_count,
  },
  'worker retrying message',
);
```

---

## 10. CloudWatch y costo

`pino` ayuda a estructurar, pero igual puedes gastar demasiado si logueas sin control.

Buenas practicas:

- nivel `info` en `production`
- `debug` solo temporal o en lower envs
- no duplicar logs de excepcion en interceptor, filter y service al mismo tiempo
- retencion finita de log groups

Regla:

- un logger bueno con higiene mala sigue costando caro

---

## 11. Testing del logger

Unit:

- mockear `Logger` o `PinoLogger` cuando el test no valida observabilidad
- si validas log estructurado, assert solo en campos utiles

Integration:

- verificar que el app bootstrap use el logger custom
- verificar que los headers sensibles no salgan en el output

No hacer:

- tests fragiles sobre timestamp exacto o formato completo de toda la linea JSON

---

## 12. Mi recomendacion brutalmente honesta

Para tu arquitectura 2026:

- **si, usar `pino`**
- **si, usar `nestjs-pino`**
- **si, JSON en cloud**
- **no, pretty logs en production**
- **si, redaction obligatoria**
- **si, request/correlation context desde el inicio**

Si no haces eso, vas a terminar con logs menos consistentes, mas caros y mas dificiles de buscar.

---

## 13. Fuentes recomendadas

- Nest logger techniques: [docs](https://docs.nestjs.com/techniques/logger)
- Pino: [GitHub](https://github.com/pinojs/pino)
- nestjs-pino: [GitHub](https://github.com/iamolegga/nestjs-pino)

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Instrumentar logs estructurados con correlación OTel, métricas de baja cardinalidad, SLO y privacidad verificable.
- ❌ **Incorrecto:** Loguear tokens/PII/payloads completos, usar ID de usuario como etiqueta Prometheus o declarar trazas sin exportador.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.

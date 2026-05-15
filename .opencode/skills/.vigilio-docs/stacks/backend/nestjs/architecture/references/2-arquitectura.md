# Arquitectura de Ejecucion - `bus-impl` 2026

Este documento describe la arquitectura actualizada del backend de negocio manteniendo la misma filosofia DDD del `bus-impl` original, pero con herramientas y practicas alineadas a 2026.

---

## 1. Modelo DDD por bounded context

Cada modulo conserva tres capas principales:

```text
Infrastructure  -> controllers, handlers, repositorios, adapters AWS
Application     -> casos de uso, schemas Zod, dtos Zod, comandos, queries
Domain          -> reglas/eventos solo cuando hay negocio real
```

Regla de dependencia:

- `domain/` no importa de `application/` ni de `infrastructure/`
- `application/` no importa de Nest HTTP ni de Drizzle
- `infrastructure/` adapta todo hacia adentro

---

## 2. Separacion de entradas: HTTP y eventos

El `bus-impl` actualizado deja de tener un unico punto de entrada dinamico basado en `controller[action]`. En su lugar, divide la ejecucion en dos rutas explicitas:

### A. HTTP

- API Gateway HTTP API o REST API
- Lambda `nodejs24.x`
- NestJS 11 con controllers REST
- Swagger/OpenAPI generado desde los controllers
- Scalar como UI principal de referencia para developers

### B. Async workers

- SQS
- SNS
- EventBridge
- Step Functions
- consumidores dedicados por evento

Esto mejora:

- trazabilidad
- testing
- observabilidad
- seguridad de tipos

---

## 3. Persistencia: Drizzle + PostgreSQL

La capa de persistencia cambia de Oracle/MySQL como baseline a PostgreSQL con Drizzle.

### Stack canonico

- motor: PostgreSQL administrado en AWS
- acceso: `pg`
- ORM tipado: `drizzle-orm`
- migraciones: `drizzle-kit`
- schemas puente: `drizzle-zod`

### Ventajas

- SQL explicito pero tipado
- inferencia de tipos sin magia excesiva
- mejor experiencia para Lambda y scripts
- migraciones versionadas y auditables

---

## 4. Validacion: Zod en vez de Joi

La validacion de requests ya no usa Joi. Ahora se usa Zod en dos niveles:

### A. Contrato de entrada/salida del caso de uso

- `application/schemas/*.schema.ts` define el schema base del modulo
- `application/dtos/*.request.dto.ts` agrupa body, query y params derivados con `pick`, `omit`, `extend` o `partial`
- `application/dtos/*.response.dto.ts` agrupa responses exitosos, errores esperados y tipos inferidos sin dependencias NestJS
- `application/dtos/*.request.doc.ts` y `*.response.doc.ts` contienen adaptadores `createZodDto` backend-only cuando Swagger los necesita
- usado por services, commands y queries
- expone tipos con `z.infer`

### B. Contrato HTTP

- `createZodDto(...)` via `nestjs-zod`
- `ZodValidationPipe` global o por ruta
- `@nestjs/swagger` para documentar
- vive en el archivo hermano `*.request.doc.ts` o `*.response.doc.ts`, nunca en el contrato público

Esto unifica:

- validacion
- inferencia de tipos
- documentacion OpenAPI

---

## 5. Documentacion API: Swagger + Zod + Scalar

La recomendacion para este `bus-impl` es:

- `@nestjs/swagger` como generador OpenAPI
- `nestjs-zod` para conectar DTOs Zod con Nest
- `@scalar/nestjs-api-reference` como UI moderna sobre el mismo spec
- `cleanupOpenApiDoc(...)` despues de `SwaggerModule.createDocument(...)`
- export de `openapi.json` y `openapi.yaml` como artefactos de CI

Patron recomendado:

```text
application/schemas Zod -> DTO público -> adaptador *.doc.ts -> Controller Nest -> Swagger document -> Scalar/OpenAPI
```

Uso recomendado:

- `/openapi.json` o artefacto OpenAPI como source of truth
- `/reference` con Scalar como UI primaria
- `/docs` con Swagger UI solo para compatibilidad interna si el equipo la necesita

Reglas de produccion:

- bundle de Scalar, logo, favicon y fuentes servidos desde el mismo origen; ningun CDN externo
- CSP especifica para `/reference`, con nonce criptografico por respuesta
- telemetria, agente remoto, fuentes por defecto y persistencia de credenciales deshabilitados
- UI deshabilitada por defecto en produccion y habilitada solo mediante flag explicito + acceso protegido

Personalizacion verificada de Scalar embebido en Nest:

- temas predefinidos
- `customCss`
- variables CSS para paleta y tipografia
- layout `modern` o `classic`

Limite importante:

- en la integracion embebida `@scalar/nestjs-api-reference` no se documenta una opcion runtime oficial `logo`
- el branding se implementa con `favicon` y `customCss`, usando SVG locales sin scripts ni URLs externas
- la receta completa vive en [Scalar y OpenAPI seguros en produccion](../../http/references/47-scalar-openapi-produccion.md)

---

## 6. AWS 2026: infraestructura de backend

Este backend sigue siendo AWS-first, pero actualizado a CDK y runtime moderno:

- AWS CDK v2 para IaC
- Lambda `nodejs24.x`
- API Gateway
- SQS FIFO o standard segun flujo
- SNS para fan-out
- EventBridge para scheduling e integracion
- Step Functions para procesos largos
- CloudWatch + OpenTelemetry + X-Ray
- Secrets Manager y SSM para configuracion

---

## 6.1 Logging y observabilidad

La recomendacion para este backend es:

- `pino` como logger estructurado base
- `nestjs-pino` como integracion principal con Nest
- `stdout` JSON como salida canonica
- `pino-pretty` solo en local
- redaction de secretos, cookies y headers sensibles

Patron recomendado:

```text
Nest Logger API -> nestjs-pino -> pino JSON -> stdout -> CloudWatch / agregador
```

Reglas:

- usar `bufferLogs: true` y luego `app.useLogger(app.get(Logger))`
- no dejar el `ConsoleLogger` por defecto en produccion si ya decidiste usar JSON estructurado
- no mezclar varios formatos de log en el mismo servicio

---

## 7. Diagrama conceptual actualizado

```text
                HTTP
Frontend/BFF ----------> API Gateway ----------> Lambda HTTP (NestJS)
                                                    |
                                                    v
                                             Controllers
                                                    |
                                                    v
                                             Application
                                                    |
                                                    v
                                               Domain
                                                    |
                                                    v
                                           Drizzle + PostgreSQL

SQS/SNS/EventBridge/Step Functions -----> Lambda Worker -----> Application/Domain
```

---

## 8. Bootstrap recomendado

### HTTP bootstrap

- `NestFactory.create(...)`
- adapter Fastify
- `SwaggerModule.createDocument(...)`
- `cleanupOpenApiDoc(...)`
- `apiReference(...)` de Scalar en `/reference`

### Worker bootstrap

- `NestFactory.createApplicationContext(...)`
- handler explicito por evento
- Middy solo para concerns transversales reales

---

## 9. Versiones verificadas al 2026-06-08

Las siguientes versiones fueron verificadas el `2026-06-08` usando el registro npm o documentacion oficial:

| Componente | Version verificada |
|---|---|
| Node.js | `24.16.0` local / runtime `nodejs24.x` |
| TypeScript | `6.0.3` |
| NestJS Core | `11.1.24` |
| `@nestjs/swagger` | `11.4.4` |
| `@scalar/nestjs-api-reference` | `1.1.20` |
| `nestjs-zod` | `5.4.0` |
| `zod` | `4.4.3` |
| `drizzle-orm` | `0.45.2` |
| `drizzle-kit` | `0.31.10` |
| `drizzle-zod` | `0.8.3` |
| `pg` | `8.21.0` |
| `postgres` | `3.4.9` |
| `vitest` | `4.1.9` |
| `@vitest/coverage-v8` | `4.1.9` |
| `@playwright/test` | `1.60.0` |
| `@biomejs/biome` | `2.5.0` |
| `aws-cdk-lib` | `2.258.0` |
| `@aws-sdk/client-sqs` | `3.1063.0` |
| `@aws-sdk/client-secrets-manager` | `3.1063.0` |
| `@middy/core` | `7.6.7` |
| `pino` | `10.3.1` |
| `nestjs-pino` | `4.6.1` |
| `pnpm` | `11.7.0` |

---

## 10. Decisiones de arquitectura

### Mantener

- DDD pragmatico por modulo
- NestJS
- event-driven con AWS
- separation of concerns por capa

### Reemplazar

- Joi -> Zod
- Jest + Cucumber -> Vitest + Playwright
- Serverless Framework -> AWS CDK
- ESLint + Prettier -> Biome
- Azure DevOps -> GitHub Actions

### Mejorar

- handlers tipados en vez de `controller[action]`
- OpenAPI generado desde implementacion
- persistencia con Drizzle y PostgreSQL
- calidad y seguridad con pipelines mas fuertes

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Arquitectura de Ejecucion - `bus-impl` 2026

✅ **Correcto:** Para **Arquitectura de Ejecucion - `bus-impl` 2026**, usar componentes accesibles y tokens reutilizables con pruebas visuales.

❌ **Incorrecto:** En **Arquitectura de Ejecucion - `bus-impl` 2026**, copiar configuraciones de diseño de otra plataforma sin medir sus restricciones.

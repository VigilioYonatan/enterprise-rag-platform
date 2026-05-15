# ADR 0001 - Contratos generados desde el backend en vez de escritos a mano

## Estado

Aceptado

## Contexto

`bus-impl` expone una API HTTP que consumen `web-mfe`, `mobile-mfe` y `tauri-mfe`. Cada consumidor
necesita los tipos de request y response, y necesita validarlos en runtime porque un backend puede
cambiar sin que el frontend se entere.

La practica habitual es que cada frontend declare sus propios DTOs. Eso garantiza divergencia: el
backend anade un campo obligatorio, los cuatro repos siguen compilando, y el fallo aparece en
produccion como un `undefined` en pantalla.

Restricciones del contexto:

- Los schemas del backend ya estan en Zod (`nestjs-zod`), no en `class-validator`.
- Los DTOs del backend importan NestJS, que no puede llegar a un bundle de navegador.
- Los frontends despliegan de forma independiente del backend.

## Decision

`bus-impl` es el unico owner del contrato y lo publica como paquete npm
`@vigilioyonatan/bus-contracts`, generado automaticamente por
`vigilio-node generate-contracts` desde las carpetas `dtos/`, `schemas/`, `responses/` y `types/`.

El generador rechaza cualquier archivo publico que importe NestJS, `nestjs-zod` o modulos nativos de
Node. Los adaptadores de OpenAPI (`createZodDto`) viven en archivos hermanos `*.doc.ts` que quedan
fuera del paquete.

Los consumidores fijan una **version exacta** del paquete y validan las respuestas en runtime con
esos schemas.

## Consecuencias

Beneficios:

- Un solo sitio define la forma de los datos. No hay DTOs duplicados que mantener sincronizados.
- Un cambio incompatible rompe el `pnpm install` o el typecheck del consumidor, no la produccion.
- La validacion runtime con Zod detecta drift aunque los tipos compilen.

Costos y deuda aceptada:

- El backend gana una responsabilidad de publicacion: cada cambio de contrato exige publicar el paquete.
- Los consumidores quedan acoplados al ciclo de release del backend. Se mitiga con `pnpm link` durante
  desarrollo, restaurando la version exacta antes de commit.
- El paquete usa versionado por calendario (`2026.6.0`), que **no comunica ruptura**. Un consumidor no
  puede saber por el numero si una actualizacion rompe algo. Es la debilidad conocida de esta decision
  y la razon de que exista el gate de compatibilidad OpenAPI en CI.

## Alternativas consideradas

- **DTOs escritos a mano en cada frontend.** Descartada: garantiza divergencia silenciosa y multiplica
  el trabajo por el numero de consumidores.
- **Generar clientes desde el OpenAPI exportado.** Descartada como fuente primaria: el OpenAPI se genera
  *desde* los schemas Zod, asi que seria una traduccion de una traduccion, y se pierde la validacion
  runtime que da Zod. Si se usa como control secundario en `validate-openapi`.
- **Monorepo unico con backend y frontends.** Descartada: los ciclos de despliegue y los equipos son
  distintos, y obligaria a versionar juntos artefactos que se entregan por separado.

## Fecha

2026-07-26

## Owners

- Equipo: Plataforma
- Responsable: owner de `bus-impl`

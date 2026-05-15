# Contratos API y Limites Backend

Esta guia es la fuente canonica transversal para APIs, BFFs y OpenAPI. Las skills y las guias de cada
stack la consumen; no deben copiarla. El codigo, los contratos ejecutables y las pruebas del consumidor
siguen siendo la evidencia final de implementacion.

## Fidelidad del contrato al runtime

Antes de cambiar un endpoint, construir una matriz breve con evidencia real:

| Superficie | Debe coincidir con |
| --- | --- |
| metodo y path publicos | router/controller y OpenAPI exportado |
| `operationId` | convencion estable del handler propietario cuando el ecosistema lo use |
| path/query/header/body | parser, schema runtime, DTO y controller |
| required, optional y nullable | contrato runtime y tipos efectivos |
| response y errores | contrato de salida, errores publicos y status observables |
| auth y permisos | guards/policies, security scheme y pruebas |
| consumidor | package o contrato exacto y pruebas de compatibilidad |

Un mismatch es un defecto contractual aunque cada repositorio compile por separado. No cambiar una
operacion publica aprobada sin versionado y migracion coordinada.

## BFF o canal

- Orquestar y adaptar el contrato del cliente sin absorber persistencia ni reglas del backend owner.
- No acceder directamente a su base de datos salvo autoridad explicita del proyecto.
- Mantener trazabilidad de metodo, path, operacion, DTO, headers y errores entre canal y servicio.
- Simular el limite externo mas cercano en unit tests y cubrir compatibilidad real con contract o
  integration tests segun riesgo.

## OpenAPI ejecutable

- Mantener `operationId` camelCase, unico, estable y alineado con la convencion ejecutable del owner.
- Documentar tipos, formatos, constraints, required/nullability, ejemplos sanitizados, auth y errores
  que el runtime realmente expone.
- Reutilizar components solo cuando la semantica sea igual. No editar bundles generados como fuente.
- Incluir status por comportamiento y riesgo; no imponer `200/400/500` si el contrato real es otro.
- Ejecutar lint, export/bundle y diff breaking con las herramientas del repositorio.
- Swagger o Scalar representan el contrato; no prueban por si solos el comportamiento del servicio.

## Perfil corporativo RRLL

Aplicar este formato solo cuando el repositorio consumidor adopte la convencion `bus-dsg`/`ch-dsg`.
No trasladar automaticamente emojis, carpetas, `sigv4` o status a otro perfil.

```yaml
# openapi/paths/endoso/registrar-endoso.yaml
post:
  tags:
    - Endosos RRLL
  summary: Registrar Endoso RRLL
  operationId: store
  description: |
    📦 Proceso: Registrar Endoso

    🔧 Funcionalidad: Servicio que permite registrar endosos RRLL.
  parameters:
    - $ref: ../../components/parameters/TraceId.yaml
  requestBody:
    $ref: ../../components/requestBodies/endoso/RegistrarEndosoReq.yaml
  responses:
    '200':
      $ref: ../../components/responses/endoso/RegistrarEndosoRes.yaml
    '400':
      $ref: ../../components/responses/common/BadRequest.yaml
    '500':
      $ref: ../../components/responses/common/InternalServerError.yaml
  security:
    - sigv4: []
```

`📦 Proceso` identifica el caso de uso de negocio. `🔧 Funcionalidad` explica el resultado observable,
no la implementacion tecnica. El texto funcional no altera el contrato publicado: en CRUD simple Node/Nest puede utilizar
`index/show/store/update/destroy`; los comandos con semantica de negocio utilizan nombres
expresivos como `approvePolicy`, `cancelOrder`, `activateSubscription` y `calculatePremium`.
El `operationId` se mantiene estable y un renombrado publicado pasa por OpenAPI diff.

Los atributos reutilizables documentan significado, ejemplo y restricciones:

```yaml
# openapi/components/schemas/attributes/Fecha.yaml
type: string
format: date
description: Fecha de vigencia con formato YYYY-MM-DD.
minLength: 10
maxLength: 10
example: '2026-10-11'
```

El request body agrega proposito y un caso sanitizado, reutilizando el modelo owner:

```yaml
# openapi/components/requestBodies/endoso/RegistrarEndosoReq.yaml
description: Entidad para registrar un endoso RRLL.
required: true
content:
  application/json:
    schema:
      title: Registrar Endoso RRLL
      allOf:
        - description: Entidad de entrada para registrar el endoso.
          title: Registrar Endoso Request
        - $ref: ../../schemas/model_request/RegistrarEndosoReq.yaml
    examples:
      Caso-Prueba-01:
        summary: Registro valido de endoso
        value:
          numeroPoliza: '0001234567'
          fechaVigencia: '2026-10-11'
```

Comprobar `tags`, ortografia, `operationId`, descripcion, constraints, referencias resolubles, status
observables, security scheme real y ausencia de secretos/PII. El runtime debe implementar exactamente
metodo, path, auth, required/nullability, status y schemas.

En code-first, expresar la misma informacion con los adaptadores del stack y validar el OpenAPI
exportado. En contract-first, el YAML y sus components son el owner. La implementacion NestJS/Zod se
documenta en
[Ejemplos de codigo Node/Nest](../stacks/backend/nestjs/http/references/6-ejemplos-codigo.md#51-caso-de-uso-rrll-con-decoradores-nestjs-y-zod).

## Errores, validacion y observabilidad

- Validar todo input no confiable al entrar y trabajar despues con datos parseados y tipados.
- Capturar errores solo para traducir, enriquecer, compensar o liberar recursos; no agregar
  `try/catch` ceremonial.
- Preservar errores conocidos y traducir fallos desconocidos a una respuesta publica estable, sin stack
  traces ni detalles internos.
- Loguear accion, resultado, latencia y correlacion sin bodies completos, tokens, secretos o PII.
- Mantener controller/handler delgado, aplicacion como orquestador y adapters como owners de I/O.

## Evidencia minima

- Matriz contrato-runtime sin drift entre owner, implementacion y consumidor.
- Validacion y diff breaking del contrato cuando existan en el repositorio.
- Pruebas de comportamientos, auth y errores publicos afectados.
- Autorizacion y plan de migracion para cualquier breaking change intencional.


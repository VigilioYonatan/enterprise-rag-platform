# Clean Architecture en Vigilio: reglas compartidas

## Objetivo y fronteras

Aplicable a NestJS, Laravel y futuros stacks. Las dependencias de código apuntan hacia las reglas de negocio; la infraestructura implementa contratos definidos por aplicación/dominio. **No confundir carpetas con separación real**: un controller puede vivir en `infrastructure/` y seguir violando arquitectura si realiza consultas SQL directamente.

| Capa | Permitido | Prohibido |
| --- | --- | --- |
| Domain | invariantes, value objects, eventos, políticas | HTTP, ORM, contenedor DI, caché externo |
| Application | casos de uso, coordinación transaccional por puerto, ports | decoradores HTTP, filas ORM como salida contractual |
| Infrastructure | controllers, repositorios concretos, SDKs, instrumentación | decidir reglas de negocio en vez del dominio |
| Contracts | schemas de entrada/salida, OpenAPI y tipos públicos | transportar entidades ORM con campos internos |

## Reglas operativas

1. Identificar primero caso de uso, actores, permisos, invariantes y excepciones. Si es CRUD trivial, omitir ceremonias DDD.
2. Crear contratos de entrada y salida explícitos; en TypeScript se derivan de Zod y en PHP se comprueba conformidad con OpenAPI.
3. Inyectar repository ports cuando desacoplar persistencia aporte pruebas, independencia o invariantes.
4. Las transacciones protegen estados/invariantes: `SELECT FOR UPDATE` o versión optimista para conflictos reales.
5. El controller no decide TTL, no ejecuta queries ni define reglas de negocio.
6. Revisar importaciones reales, no únicamente el diagrama de carpetas.

## Ejemplo de límite

✅ Correcto: `CancelOrderUseCase.execute` recupera agregado por `OrderRepository`, ejecuta `order.cancel()` y persiste; controller convierte resultado a HTTP.

❌ Incorrecto: `OrderController.cancel` hace `db.update(...).set({status:'cancelled'})` saltándose invariantes y autorización.

## Cómo verificar

- Test unitario del dominio sin NestJS ni Laravel.
- Test del caso de uso con ports falsos.
- Test de integración del adapter en DB real.
- Test HTTP con validación y roles, incluidos 401, 403 y conflictos.

Lecturas relacionadas: [DDD](ddd.md), [SOLID](solid.md), [hexagonal](hexagonal.md).

## Procedencia documental preservada

- [Capítulo heredado: 2-arquitectura.md](../../stacks/backend/nestjs/architecture/references/2-arquitectura.md) — contenido íntegro conservado.
- [Capítulo heredado: 5-buenas-practicas.md](../../stacks/backend/nestjs/quality/references/5-buenas-practicas.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Regla de decisión:** Explicar cuándo esta separación reduce acoplamiento y cuándo sería ceremonia innecesaria; comprobarlo con un caso de negocio del dominio.
2. **Invariante observable:** Identificar invariantes y dueño de transición; probar aceptación y rechazo con un escenario de negocio, no solo carpetas.
3. **Dependencias:** Documentar dirección de dependencias y puertos; inspeccionar imports para impedir que dominio importe HTTP o ORM.
4. **Costes y alternativas:** Registrar por qué se eligió el patrón frente a una solución simple y qué deuda operacional introduce.
5. **Refactor seguro:** Antes de mover capas, caracterizar el comportamiento y preservar contratos, eventos y autorización con pruebas repetibles.
6. **Gate:** Comprobar mediante un caso de uso semántico que puede probarse sin framework ni base de datos.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Verificación de la regla de dependencia (no solo carpetas)

```text
Transport / CLI / Worker ---> Application ---> Domain
            |                   |   (port)       ^
            v                   v                |
       Presenter           Adapter concreto -----+
       (solo HTTP)         (infraestructura; NO importado por Domain)
```

La dirección de dependencia en tiempo de compilación apunta al interior. La **invocación** sí puede ir de Application hacia un adapter mediante una interfaz inyectada: no confundir las flechas de llamadas con imports.

✅ **Correcto:** `OrderService` pide `OrderRepository`, resuelve `OrderEntity.cancel()` y delega `save()` sin saber si usa Drizzle o Eloquent.

❌ **Incorrecto:** `OrderEntity` importa `Request`, `Cache::` o `HttpException`, o un controller decide una transición inválida saltándose el agregado.

**Prueba de arquitectura:** test de imports prohibidos + contrato del adapter y prueba HTTP; un diagrama no certifica dependencia real. En features simples se permiten menos capas si mantienen la frontera de negocio. El ejemplo de organización concreta es propio de [NestJS](../../stacks/backend/nestjs/README.md) o [Laravel](../../stacks/backend/laravel/README.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Domain importa @nestjs/common, Qt Widgets o Godot Node
- **❌ Incorrecto**: Domain importa @nestjs/common, Qt Widgets o Godot Node.
- **✅ Correcto**: Mantener reglas puras y adapters de UI/framework externos.

### 02. Caso de uso recibe QueryBuilder del ORM como entrada
- **❌ Incorrecto**: Caso de uso recibe QueryBuilder del ORM como entrada.
- **✅ Correcto**: Contrato de aplicación semántico y port de repositorio.

### 03. Controller transforma JSON y aplica regla de comisión
- **❌ Incorrecto**: Controller transforma JSON y aplica regla de comisión.
- **✅ Correcto**: Presenter/controller adapta; domain decide comisión.

### 04. Crear cinco capas para función CLI que renombra archivo
- **❌ Incorrecto**: Crear cinco capas para función CLI que renombra archivo.
- **✅ Correcto**: Empezar simple y extraer fronteras cuando existan riesgos/consumidores.

### 05. Transacción repartida entre dos servicios que se ejecutan secuencialmente
- **❌ Incorrecto**: Transacción repartida entre dos servicios que se ejecutan secuencialmente.
- **✅ Correcto**: Una frontera transaccional explícita en application.

### 06. Exponer entities ORM como response pública
- **❌ Incorrecto**: Exponer entities ORM como response pública.
- **✅ Correcto**: DTO/proyección mínima, control de PII y versionado.

### 07. Usar mock para afirmar persistencia real
- **❌ Incorrecto**: Usar mock para afirmar persistencia real.
- **✅ Correcto**: Unit tests con double y adapter integration con DB real.

### 08. Arquitectura se infiere por carpetas aunque imports se invierten
- **❌ Incorrecto**: Arquitectura se infiere por carpetas aunque imports se invierten.
- **✅ Correcto**: Validar grafo de dependencias y prohibir dependencias internas hacia UI.

### 09. Colocar adaptador de storage en domain porque comparte un tipo
- **❌ Incorrecto**: Colocar adaptador de storage en domain porque comparte un tipo.
- **✅ Correcto**: Declarar port en aplicación, implementación afuera.

### 10. Camuflar use-case en GenericService<any>
- **❌ Incorrecto**: Camuflar use-case en GenericService<any>.
- **✅ Correcto**: Casos semánticos con contratos y errores claros.


## Ejemplo implementable y revisión del riesgo
### Límite de compilación y cambio seguro

```text
❌ domain/order.ts -> imports @nestjs/common / drizzle / express
✅ domain/order.ts -> tipos puros
✅ application/ship-order.ts -> OrderRepository port
✅ adapters/http/ship-order.controller.ts -> caso de uso
✅ adapters/db/drizzle-order.repository.ts -> contrato de persistencia
```

**Prueba de arquitectura:** inspeccionar imports y ejecutar un test de `ShipOrder` sin cargar NestJS, DB ni interfaz. El diseño físico puede variar: las dependencias y las invariantes importan más que el nombre exacto de las carpetas.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

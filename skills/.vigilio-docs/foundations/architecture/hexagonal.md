# Arquitectura hexagonal y Clean: límites y dirección

```text
HTTP/Queue/CLI Adapter -> Application Use Case -> Domain
                       -> Ports <- SQL/Redis/AWS Adapters
```

Domain no importa Laravel/NestJS/HTTP/ORM. Application utiliza puertos cuando el comportamiento requiere sustituibilidad y pruebas. Infrastructure implementa adapters y configuración DI.

**Lecturas sencillas:** permitir read models desde el repository y DTO HTTP compuesto en use case/presenter; no forzar reconstruir agregados para una lista paginada. **Comandos con invariantes:** recuperar agregado, transición de negocio, persistencia transaccional y evento después de confirmar DB.

**Contrato común:** OpenAPI describe JSON público, no clases de ORM. Para frontend TypeScript reutilizar tipos Zod; Laravel implementa el mismo OpenAPI y lo verifica en CI.

[Implementación PHP](../../stacks/backend/laravel/architecture/project-structure.md) · [Antigua referencia NestJS](../../stacks/backend/nestjs/architecture/references/2-arquitectura.md).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../governance/documentation-dry-and-ownership.md).


## Mapa de dependencias

```text
HTTP controller / Worker / CLI  ---> Application Use Case ---> Domain
                                         | (port interface)
                                         v
                                    Repository Port
                                         ^
                                         | implementa
                                 Drizzle / Eloquent Adapter
```

- **Puertos de entrada:** casos de uso invocables sin Nest/Laravel. No son interfaces obligatorias por cada método.
- **Puertos de salida:** persistencia, caché, reloj, eventos cuando la independencia y los tests lo justifican.
- **Adaptadores primarios:** Controller NestJS, Laravel, job SQS. **Secundarios:** Drizzle, Eloquent, Redis/Valkey, HTTP externo.
- **Composición:** tokens/providers NestJS o bindings del Laravel Service Container conectan interfaces con adapters; Domain nunca importa el framework.

✅ Integrar un worker nuevo sin reescribir la regla de `cancelOrder()`; ❌ devolver `JsonResponse` desde un agregado o importar `Model` de Eloquent en `Domain/`.

## Verificación de límites

1. `rg "@nestjs|drizzle|Illuminate" src/**/domain` debe no encontrar dependencias de infraestructura, salvo documentos existente explícitos.
2. Tests unitarios usan implementación en memoria de los ports y cubren los errores.
3. Tests de integración verifican que el adapter respeta semántica y aislamiento del contrato.
4. No crear hexágonos ceremoniales para CRUD sin una razón comprobable.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Cómo identificar ports y adapters sin crear capas ceremoniales

| Pieza | Dueño y propósito | Ejemplo permitido |
| --- | --- | --- |
| Puerto de entrada | Aplicación, caso de uso | `cancelOrder(input)` |
| Puerto de salida | Application o Domain según dependencia | `OrderRepository.findByIdForUpdate()` |
| Adapter primario | Transporte o job externo | Controller HTTP, consumidor de cola, CLI |
| Adapter secundario | Implementación de I/O | PostgreSQL/Drizzle, Eloquent, Valkey, SDK externo |
| Composition root | Framework externo | Módulo de DI, Service Container |

**La prueba real es la dirección de imports**, no la existencia física de `ports/` y `adapters/`. Controller puede importar Application; Application conoce el puerto; el adaptador importa el puerto. Application no importa `EloquentProductRepository` o `DrizzleProductRepository`.

## Ejemplo de sustitución por contrato

```typescript
export interface PriceQuoteGateway {
  requestQuote(
    product_id: ProductSchema['id'],
  ): Promise<{ amount: number; currency: string }>;
}

export class CalculatePremiumService {
  constructor(private readonly priceQuoteGateway: PriceQuoteGateway) {}

  async calculatePremium(product_id: ProductSchema['id']) {
    return this.priceQuoteGateway.requestQuote(product_id);
  }
}
```

El ejemplo representa una dependencia externa real; **no** crear un port alrededor de una suma pura. `amount` y `currency` deben evolucionar a un tipo/contrato único si se comparten, y el gateway debe aplicar timeout y errores tipados en su adapter. El constructor usa `camelCase` para dependencias inyectadas.

## Reglas sobre transacciones, caché y terceros

- Transacciones: definir qué adapter inicia/cierra la transacción; el caso de uso expresa la necesidad de atomicidad sin abrir conexiones SQL desde Domain.
- Caché: no devolver `JsonResponse` ni asumir que es fuente de verdad; scopes, TTL e invalidación pertenecen al adapter/política correspondiente.
- Proveedor externo: aislar excepciones, timeouts y reintentos; no esconder un fallo persistente devolviendo valores fabricados.
- Observabilidad: instrumentar en boundaries sin acoplar la entidad a tracer/logger.

## ✅ Correcto / ❌ Incorrecto

✅ **Correcto:** cambiar el adapter de persistencia y conservar los tests del caso de uso sin reescribirlo; probar además el adapter contra PostgreSQL real.

❌ **Incorrecto:** usar interfaces por cada función privada; importar `HttpException` en Domain; hacer que el Controller seleccione SQL en tiempo de ejecución.

## Criterios para adoptarla

Usarla cuando haya integración externa, una invariante testeable, varias entradas (HTTP/worker) o infraestructura variable. Para endpoints de lectura triviales, un Query Service delgado puede ser suficiente. Consultar [DDD](ddd.md), [SOLID](solid.md) y [Clean Architecture](clean-architecture.md) para las decisiones compartidas; los códigos específicos están en las guías propietarias de stack.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Puerto IEverythingRepository expone SQL y HTTP juntos
- **❌ Incorrecto**: Puerto IEverythingRepository expone SQL y HTTP juntos.
- **✅ Correcto**: Puertos orientados a casos de uso con semántica de negocio.

### 02. Use case sabe que el evento se publica por AWS SDK concreto
- **❌ Incorrecto**: Use case sabe que el evento se publica por AWS SDK concreto.
- **✅ Correcto**: Salida mediante puerto y adapter de mensajería.

### 03. Adaptador de test retorna OK sin reproducir errores/casos frontera
- **❌ Incorrecto**: Adaptador de test retorna OK sin reproducir errores/casos frontera.
- **✅ Correcto**: Pruebas contractuales compartidas con implementaciones reales.

### 04. Un plugin tiene acceso a archivo fuera del workspace por simple path
- **❌ Incorrecto**: Un plugin tiene acceso a archivo fuera del workspace por simple path.
- **✅ Correcto**: Puerto filesystem limitado y política de acceso.

### 05. Cambiar SQLite por PostgreSQL rompe reglas de dominio
- **❌ Incorrecto**: Cambiar SQLite por PostgreSQL rompe reglas de dominio.
- **✅ Correcto**: Transacciones y límites de persistencia detrás de puertos estables.

### 06. Crear puerto para cada std::string::size
- **❌ Incorrecto**: Crear puerto para cada std::string::size.
- **✅ Correcto**: Abstraer externalidades y variaciones, no todos los helpers.

### 07. Exponer web DTO dentro de puerto de domain
- **❌ Incorrecto**: Exponer web DTO dentro de puerto de domain.
- **✅ Correcto**: Mapping en adaptador de entrada y DTO específico de aplicación.

### 08. Adaptador HTTP llama otros adapters directamente sin casos de uso
- **❌ Incorrecto**: Adaptador HTTP llama otros adapters directamente sin casos de uso.
- **✅ Correcto**: Entrada invoca aplicación; ésta coordina salidas.

### 09. Confundir puertos primarios y secundarios para invertir el flujo de control
- **❌ Incorrecto**: Confundir puertos primarios y secundarios para invertir el flujo de control.
- **✅ Correcto**: Definir dirección de dependencias, no necesariamente de llamadas runtime.

### 10. Probar solo happy path con fake
- **❌ Incorrecto**: Probar solo happy path con fake.
- **✅ Correcto**: Probar timeout, autorización, conflict y rollback en puertos/adapters.


## Ejemplo implementable y revisión del riesgo
### Ejemplo de puerto con semántica, no SQL genérico

```ts
// ✅ application/ports/payment-gateway.ts
export interface PaymentGateway {
  authorize(input: { orderId: string; amountMinor: bigint; currency: string; idempotencyKey: string }): Promise<{ authorizationId: string }>;
}
// ❌ interface AnythingGateway { execute(sqlOrUrl: string): Promise<any> }
```

Los adapters del gateway HTTP y los dobles de test deben ejecutar la misma batería de tests de contrato: timeout, autorización rechazada, idempotencia, moneda inválida y payload sensible. Una operación financiera no es segura solo por usar interfaces.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

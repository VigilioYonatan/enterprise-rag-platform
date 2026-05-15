# SOLID aplicado con juicio técnico

- **S (SRP):** un controller solo adapta HTTP; la aplicación orquesta; el agregado decide reglas; la persistencia accede a datos.
- **O (OCP):** usar estrategia/port si hay al menos variación real (Redis vs. cache local, proveedor externo alternativo), sin interfaces para cada función.
- **L (LSP):** adapters sustitutos deben cumplir contratos de errores, idempotencia, paginación y semántica de nulabilidad.
- **I (ISP):** separar puertos de lectura y escritura si sus consumidores necesitan capacidades distintas, no por dogma.
- **D (DIP):** el caso de uso conoce contratos, no `Eloquent`, `Drizzle` ni `Cache::` si necesita desacoplamiento verificable.

No forzar factories, mappers, handlers, CQRS, clases de resultado o repositorio por tabla sin necesidad. Evitar mover un método fuera del agregado si es el único sitio que protege la invariante.

Ejemplo PHP: `ApprovePolicy` depende de `PolicyRepository`; un `EloquentPolicyRepository` lo implementa y es vinculado en el Service Container. En NestJS, el service recibe un port mediante token DI. Tests usan dobles de ese port; integración usa DB real.

**Control de calidad:** revisar acoplamientos reales, nombres ubicuos, duplicación de reglas y cobertura de invariantes. Una clase pequeña no es automáticamente SOLID.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../governance/documentation-dry-and-ownership.md).


## Aplicación por principio (sin ceremonias)

- **SRP:** controller traduce HTTP, caso de uso orquesta, dominio decide, adapter persiste. SRP no significa una clase por método.
- **OCP:** ampliar una política mediante estrategias *cuando existe variación real*, no interfaces prematuras para todos los `if`.
- **LSP:** implementaciones de `RepositoryPort` respetan errores, nulos, orden y semántica de transacción; un mock permisivo que oculta errores viola el contrato observable.
- **ISP:** `ProductReadRepository` puede ser distinto de `ProductWriteRepository` si las necesidades divergen; no crear veinte interfaces de un método por costumbre.
- **DIP:** el caso de uso importa tipos puros de aplicación/dominio; adaptadores dependen de puertos. NestJS usa tokens de DI, Laravel bindings de container.

```typescript
// ✅ El caso de uso conoce un port
interface OrderReader { findById(id: string): Promise<Order | null> }
class CancelOrder {
  constructor(private readonly orders: OrderReader) {}
  async execute(id: string) {
    const order = await this.orders.findById(id);
    if (!order) throw new Error('OrderNotFound');
    order.cancel();
    return order;
  }
}
// ❌ new DrizzleDatabase(...) dentro del caso de uso
```

**Pruebas de diseño:** comprobar que tests del dominio no importen `@nestjs/*`, `Illuminate/*` ni conexión DB; verificar puertos con tests de contrato reales. **Anti-patrón:** declarar `SOLID` en el README y luego ocultar lógica de autorización en adapters no comprobados.

## Mejoras técnicas verificables — 2026

**2. SOLID proporcional.** ✅ Extraer un port solo cuando existen consumidores, test seam o cambio de infraestructura justificable. ❌ Una interfaz por clase y cinco wrappers sin comportamiento. Probar con cambio concreto de requisito, no por número de archivos.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Matriz de decisiones SRP/OCP/LSP/ISP/DIP

| Principio | Prueba de cambio real | Cuándo NO abstraer |
| --- | --- | --- |
| SRP | Cambiar transporte no altera la regla de cancelación | No crear una clase por línea o método |
| OCP | Agregar segundo proveedor modifica adapter, no use case | No implementar estrategia sin variación real |
| LSP | Adapter nuevo respeta mismas nulabilidades, errores, locks y orden | No aceptar mock que omite constraints del DB |
| ISP | Consulta de listado solo conoce capacidades de lectura | No fragmentar puertos arbitrariamente |
| DIP | Aplicación depende del puerto, Drizzle/Eloquent lo implementa | No ocultar todo detrás de wrappers que no aportan pruebas |

## Ejemplo DIP + ISP con frontera verificable

```typescript
export interface ProductReadRepository {
  findByCriteria(
    criteria: ProductCriteria,
  ): Promise<PageResult<ProductSummary>>;
}

export class ListProductsService {
  constructor(
    private readonly productReadRepository: ProductReadRepository,
  ) {}

  listProducts(criteria: ProductCriteria) {
    return this.productReadRepository.findByCriteria(criteria);
  }
}
```

`ProductSummary` deriva de `ProductSchema` con `Pick`, mientras `PageResult<T>` existe una sola vez como estructura genérica. La implementación concreta con Drizzle/Eloquent está en **su stack**; no repetir SQL en este fundamento. En un sistema donde leer y escribir comparten exactamente las mismas capacidades, separar ambos puertos puede no aportar nada.

## Cómo detectar violaciones en revisión

1. **SRP:** un controller decide permisos, crea transacciones y consulta la base; mover cada responsabilidad a su dueño, no repartir lógica sin criterio.
2. **OCP:** cada nuevo proveedor requiere modificar todas las ramas de una clase central; introducir estrategia solo cuando la variación sea real.
3. **LSP:** un adapter retorna `[]` cuando el contrato exige error por acceso denegado; usar pruebas de contrato idénticas para todos los adapters.
4. **ISP:** un read-only service depende de `register/remove/approve` sin utilizarlos; reducir puerto sin duplicar el read model.
5. **DIP:** application importa `@nestjs/common`, `Illuminate\\Database` o módulos Drizzle; probar imports con herramientas del stack.

## ✅ Correcto / ❌ Incorrecto en producción

✅ **Correcto:** aislar una API de tercero detrás de un port al tener timeouts, fallos, contract tests y reemplazo probable; mantener tipos fuertes de resultados y errores.

❌ **Incorrecto:** introducir 30 interfaces vacías para parecer SOLID, capturar todos los errores como `null`, mover invariantes a controladores o convertir repositorios en clases HTTP.

**Evaluación:** tiempo de cambio de requisito, dependencias cruzadas, testabilidad y contratos observables. Tener muchos archivos no demuestra SOLID. Para CQRS, seguir [guía específica](cqrs.md); para data access, [estrategias SQL](../../standards/engineering/solid-data-access.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. SRP: controller HTTP calcula tarifas, valida sesión, escribe SQL y envía email
- **❌ Incorrecto**: SRP: controller HTTP calcula tarifas, valida sesión, escribe SQL y envía email.
- **✅ Correcto**: Controller adapta request/response; caso de uso orquesta, dominio calcula, adapter persiste y notifica.

### 02. SRP: dividir una política de impuestos en 18 clases de una línea
- **❌ Incorrecto**: SRP: dividir una política de impuestos en 18 clases de una línea.
- **✅ Correcto**: Mantener un módulo cohesivo con una única razón de cambio, no un archivo por instrucción.

### 03. OCP: cada nuevo proveedor obliga a editar 20 if por nombre
- **❌ Incorrecto**: OCP: cada nuevo proveedor obliga a editar 20 if por nombre.
- **✅ Correcto**: Port/estrategia para variaciones reales y contract tests compartidos.

### 04. OCP: crear interfaces para cada helper de una sola implementación
- **❌ Incorrecto**: OCP: crear interfaces para cada helper de una sola implementación.
- **✅ Correcto**: Mantener función pura y extraer extensión solo si existe consumidor o variación.

### 05. LSP: repositorio fake retorna [] ante error de autorización mientras SQL lanza Fo…
- **❌ Incorrecto**: LSP: repositorio fake retorna [] ante error de autorización mientras SQL lanza Forbidden.
- **✅ Correcto**: Todos los adapters conservan nulabilidad, errores, orden y semántica observable.

### 06. LSP: subtipo de pago acepta moneda distinta sin validar
- **❌ Incorrecto**: LSP: subtipo de pago acepta moneda distinta sin validar.
- **✅ Correcto**: Implementaciones respetan invariantes de moneda, idempotencia y límites.

### 07. ISP: servicio de lectura depende de interface con delete/resetPassword
- **❌ Incorrecto**: ISP: servicio de lectura depende de interface con delete/resetPassword.
- **✅ Correcto**: Definir puerto pequeño para capacidades que usa, sin fragmentación artificial.

### 08. ISP: separar cada método público aunque los consumidores siempre los requieren ju…
- **❌ Incorrecto**: ISP: separar cada método público aunque los consumidores siempre los requieren juntos.
- **✅ Correcto**: Agrupar interfaces por roles reales y probar contratos.

### 09. DIP: use case instancia Prisma/Drizzle/Eloquent o Qt QWidget
- **❌ Incorrecto**: DIP: use case instancia Prisma/Drizzle/Eloquent o Qt QWidget.
- **✅ Correcto**: Application define puerto, adapter concreto se configura en composition root.

### 10. DIP: port genérico any execute(query) elimina tipos y permisos
- **❌ Incorrecto**: DIP: port genérico any execute(query) elimina tipos y permisos.
- **✅ Correcto**: Contratos tipados con semántica de negocio y tests de límite.


## Ejemplo implementable y revisión del riesgo
### Ejemplo compilable orientativo de DIP/ISP (TypeScript puro)

❌ Incorrecto: caso de uso ligado a un cliente de datos concreto.

```ts
class CheckBalanceBad {
  constructor(private readonly db: { raw(sql: string): Promise<unknown> }) {}
  execute(id: string) { return this.db.raw(`SELECT * FROM accounts WHERE id='${id}'`); }
}
```

✅ Correcto: el contrato semántico pertenece al caso de uso. El adapter parametriza SQL y la composición inyecta su implementación.

```ts
interface BalanceReader { getAvailableBalance(accountId: string): Promise<bigint> }
class CheckBalance {
  constructor(private readonly balanceReader: BalanceReader) {}
  execute(accountId: string): Promise<bigint> {
    return this.balanceReader.getAvailableBalance(accountId);
  }
}
```

**Comprobar:** el test de `CheckBalance` no necesita framework ni conexión; el adapter SQL tiene tests de integración y aislamiento por usuario. `bigint` representa la unidad menor de una divisa únicamente cuando el modelo monetario lo especifica. No tratar este snippet como una API HTTP completa.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

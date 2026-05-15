# Ownership de archivos y símbolos — constantes, tipos, contratos y utilidades

**Estado:** estándar canónico de ingeniería transversal. **Owner:** `standards/engineering/`. Aplicar a código nuevo, y a refactors existentes solo con análisis de consumidores. Complementa [naming-and-boundaries](naming-and-boundaries.md), [comentarios](code-comments-and-docstrings.md) y [review](change-impact-and-review-gates.md); no altera contratos publicados por estética.

## Decisión principal: cohesión y propietario antes de elegir carpeta

**Prohibido confundir `const` con una falta de arquitectura.** Un `const` local de una función o configuración inmutable pequeña pertenece normalmente a su uso. Una configuración de hashing compartida con login, registro y rehash tiene dueño de módulo y debe extraerse. El criterio no es la palabra clave; es **qué componente posee el conocimiento**.

| Símbolo | Propietario recomendado | No hacer |
|---|---|---|
| Temporal de cálculo, índice, guard, `const result` | Función que lo usa | Crear `const/` para una línea |
| Parámetro reutilizado de Argon2, retry, TTL de auth | `auth/constants/` o `auth/config/` con versión y propósito | Repetir valores en service/controller; exportar secreto |
| Tipo de puerto/contrato de repositorio | `auth/application/ports/` (TS `interfaces/`/`types/` solo si hay propósito) | Declararlo dentro del servicio; exportar clase de framework al dominio |
| Tipo derivable de un schema propietario | Mismo contrato, tipo inferido o indexado | Duplicar union/alias trivial |
| DTO HTTP validado | Frontera `http/dto/` o `presentation/` | Mezclar Zod, controlador y lógica dominio |
| Función pura reusable en un feature | `feature/lib/`/`utils/` específica, o `feature/domain/` si es regla | `shared/utils.ts` como cajón universal |
| Componente, escena o widget | Dentro de feature y assets/tests propios | Globalizarlo antes de existir un segundo consumidor |
| Constante realmente compartida por varios features | `shared/constants/` con API estable y ownership | Importar `auth/constants` desde facturación por conveniencia |
| Secretos y configuración por entorno | Provider/config validada y secret manager | `const SECRET = '...'` en Git |

## Árbol recomendado para un módulo NestJS de autenticación (ejemplo)

```text
apps/api/src/modules/auth/
├── auth.module.ts
├── application/
│   ├── services/auth.service.ts
│   ├── ports/auth-ports.ts
│   └── use-cases/
├── domain/
│   ├── auth-security.ts
│   └── errors/
├── config/
│   ├── password-hashing.config.ts
│   └── auth-rate-limit.config.ts
├── constants/
│   └── auth-timings.constants.ts    # SOLO si aporta semántica reutilizable
├── presentation/http/dto/
├── infrastructure/
│   ├── persistence/
│   └── argon2-password-hasher.ts
└── tests/
    ├── unit/
    └── integration/
```

`types/`, `interfaces/`, `libs/`, `shared/` **son convenciones opcionales, no checkboxes**. Preferir `ports/` cuando el tipo expresa una dependencia invertida; `lib/` cuando agrupa funciones puras con propietario; `shared/` solo después de un segundo consumidor real. No duplicar módulos en `lib/`, `helpers/` y `utils/`.

## Ejemplo concreto — `HASH_OPTIONS` fuera de `AuthService`

**Incorrecto si la política se reutiliza:**

```ts
// auth.service.ts
const HASH_OPTIONS = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 } as const;
@Injectable()
export class AuthService { /* registro, hash y login terminan acoplados */ }
```

**Correcto cuando auth es dueño de la política:**

```ts
// auth/config/password-hashing.config.ts
import * as argon2 from 'argon2';
export const passwordHashOptions = Object.freeze({
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
});
```

```ts
// auth/infrastructure/argon2-password-hasher.ts
import * as argon2 from 'argon2';
import { passwordHashOptions } from '../config/password-hashing.config.js';
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, passwordHashOptions);
}
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
```

**Matiz de seguridad:** estos parámetros son un *ejemplo* y deben calibrarse según hardware, latencia, DoS y política operativa. El hash ficticio en arranque **no puede tratarse como prueba de tiempo constante**; examinar rate limit, diferencia de rutas, error uniforme y eventos de timing. Los ajustes de hashing existentes pueden requerir migración gradual, nunca cambio ciego.

## Dependencias permitidas y pruebas

```text
presentation/http -> application -> domain
infrastructure ---> application/ports (+ domain types)
composition/module -> presenta + infraestructura + aplicación
shared/core <- varios features, sin dependencias de infraestructura ni del propio consumidor
```

- Definir `auth-ports.ts` en Application; la implementación en Infrastructure. Configuración runtime se inyecta desde composición. Importar interfaces con `import type` no ejecuta dependencias en TS; Nest necesita token en runtime con `@Inject`.
- Mover un símbolo interno requiere buscar imports, barrel exports, mocks, consumidores y tests; mover un export público exige migración/versionado.
- Test unitario comprueba `passwordHashOptions` y `PasswordHasher`; integración comprueba hash/verify con fixtures y rehash de versiones anteriores. Tests negativos protegen rate limits, mensajes indistinguibles y no exposición de tokens.
- El estándar de review debe detectar servicios enormes y propiedad incorrecta **por semántica**, no hacer fallar cualquier `const` en `service.ts` o exigir `const/` a ciegas.

## Decisión ADR abreviada y excepciones

**Promover a archivo propio** cuando hay dos consumidores, contrato público, invariantes de seguridad, configuración cambiante o tests aislables. **Colocalizar** cuando el símbolo es pequeño, privado, estable y no añade dependencia. **Rechazar extracción** si aumenta acoplamiento, crea `shared` cíclico o pierde seguridad/encapsulación. Evidencia: diff, imports afectados, tests ejecutados `PASS/FAIL/BLOCKED/NOT_RUN` y justificación.

## Clarificación operativa: ¿Cuándo crear `constants/` y cuándo NO?

Para evitar interpretaciones erróneas por parte de asistentes de IA y desarrolladores:

### 1. SÍ es obligatorio crear `constants/` (o `config/`):
Para **constantes de negocio, parámetros de configuración, números mágicos, límites y estados reutilizables**. Mantener estos valores dentro de los métodos del servicio es una mala práctica de acoplamiento.

```typescript
// ❌ INCORRECTO: Constantes de negocio y números mágicos quemados dentro del Service
@Injectable()
export class OrdersService {
  async processPayment(orderId: string, amount: number) {
    // Mal: números mágicos y strings quemados en el código de ejecución
    const taxRate = 0.18;
    const maxRetries = 3;
    if (amount > 10000) { /* política de revisión */ }
    const status = 'PENDING_APPROVAL';
  }
}

// ✅ CORRECTO: Extraer a {modulo}/constants/orders.constants.ts
// src/modules/orders/constants/orders.constants.ts
export const ORDER_TAX_RATE = 0.18;
export const ORDER_MAX_PAYMENT_RETRIES = 3;
export const HIGH_VALUE_ORDER_THRESHOLD_CENTS = 1000000;
export const ORDER_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

// src/modules/orders/application/services/orders.service.ts
import {
  ORDER_TAX_RATE,
  ORDER_MAX_PAYMENT_RETRIES,
  ORDER_STATUS,
} from '../../constants/orders.constants.js';

@Injectable()
export class OrdersService {
  async processPayment(orderId: string, amount: number) {
    // Limpio, testeable y centralizado
    const isHighValue = amount > HIGH_VALUE_ORDER_THRESHOLD_CENTS;
  }
}
```

### 2. Cuándo NO crear un archivo de constantes:
Solo para **variables locales temporales** que representan el flujo de ejecución de una función o método.

```typescript
// ✅ CORRECTO: Variable local temporal del flujo de una función (se queda en la función)
async findOrder(id: string): Promise<OrderResponseDto> {
  const existingOrder = await this.orderRepository.findById(id);
  const formattedTotal = existingOrder.subtotal * (1 + ORDER_TAX_RATE);
  return this.presenter.toDto(existingOrder, formattedTotal);
}

// ❌ INCORRECTO: Mover variables temporales de cálculo a una carpeta const/ externa
```

---

## Clarificación operativa de Contratos (ADR 0001 y Enfoque Senior Mode)

La arquitectura de contratos distingue claramente la tecnología del backend para evitar sobreingeniería innecesaria:

### Escenario A: Backend hecho en TypeScript / NestJS (Ecosistema Homogéneo)
Cuando el backend está en TypeScript/NestJS con Zod:
1. **El Backend es el ÚNICO creador de contratos**:
   - Todo schema Zod y DTO (`*.request.dto.ts`, `*.response.dto.ts`, `*.schema.ts`) se escribe **exclusivamente dentro de `src/` del Backend**.
   - **PROHIBIDO** crear paquetes `packages/contracts` o librerías de contratos escritas a mano por desarrolladores.
2. **Generación automática por máquina**:
   - El script `pnpm run build:contracts` ejecuta `vigilio-node generate-contracts`.
   - La herramienta extrae automáticamente los schemas Zod limpios y tipos inferidos de `src/`, eliminando cualquier decorator o import de NestJS.
   - Genera el artefacto compilado listo para consumo (`packages/contracts` o paquete npm versionado).
3. **El Frontend es ÚNICAMENTE Consumidor y aplica Tree-Shaking**:
   - Las aplicaciones web, mobile o clientes externos consumen el paquete generado con importación granular:
     ```typescript
     // ✅ Importación con tree-shaking por subpath del microservicio
     import { createOrderSchema, type CreateOrderDto } from '@empresa/orders-contracts/ecommerce-bus-impl';
     ```
   - **Optimización de Tree-Shaking y Recursos de Frontend**:
     - El artefacto de contratos declara `"sideEffects": false` y subpath exports en `package.json` (`exports: { "./ecommerce-bus-impl": "./dist/ecommerce-bus-impl/index.js" }`).
     - Al tener múltiples microservicios o módulos en el sistema, el bundler del frontend (Vite, Rollup, Webpack 5) elimina código muerto y schemas no utilizados.
     - El cliente final solo descarga y parsea el JavaScript estrictamente necesario, garantizando mínimo peso de bundle y óptimo rendimiento.
   - **PROHIBIDO** copiar, reescribir o duplicar DTOs e interfaces en el Frontend si el backend es NestJS.

### Escenario B: Backend NO hecho en TypeScript / NestJS (Laravel, Python, Go, Java o APIs Externas)
Cuando el backend utiliza otro lenguaje o es una API externa de terceros:
1. **NO forzar paquetes de contratos inexistentes**:
   - No tiene sentido ni es posible ejecutar `generate-contracts` desde un backend PHP, Python o Go.
2. **Uso legítimo de `interfaces/`, `types/` y `dtos/` locales en el Frontend**:
   - En este escenario, el frontend **SÍ debe declarar sus propias interfaces TypeScript y DTOs locales** (por ejemplo en `src/types/`, `src/contracts/` o mediante clientes OpenAPI generados).
   - Se definen validadores Zod locales en el frontend para proteger el borde de entrada de la API.
   - **Senior Mode pragmático**: La arquitectura se adapta al ecosistema real del proyecto; nunca se inventa un paquete de contratos vacío solo por seguir una plantilla.

---

## Prohibición de Alias Triviales y Re-exports Redundantes en Puertos, Servicios y Cliente HTTP (Single Source of Truth — SSOT)

Un error recurrente que rompe la trazabilidad de símbolos es importar un tipo de dominio o DTO canónico y crear un alias local con un nombre distinto (`export type A = B` o `export const a = b`).

### Reglas innegociables de Ownership de Tipos y Schemas:
1. **Un símbolo = Un dueño = Un nombre único en todo el sistema.**
2. **Puertos de Repositorio (`application/ports/*.port.ts` o `domain/repositories/*.interface.ts`)**: Deben importar y usar directamente los tipos definidos en `domain/types/*.type.ts` y `domain/schemas/*.schema.ts`. **Prohibido** crear alias intermedios como `OAuthState = OAuthStateRecord` o `AgentReadModel = AgentSchema`.
3. **DTOs y Schemas (`presentation/http/dto/*.dto.ts`)**: **Prohibido** hacer `export const chatAnswerSchema = answerResultSchema; export type ChatAnswerSchema = AnswerResultSchema;`. Si dos endpoints usan la misma query o el mismo schema de respuesta, ambos importan el único símbolo canónico.
4. **Cliente HTTP del Frontend (`api-client.ts` / `schemas.ts`)**: **Prohibido** crear re-exports con nombres abreviados (`export type Org = OrganizationResponseDto`, `export type Agent = AgentResponseDto`, `export type Page<T> = PaginatedResult<T>`). Los componentes y hooks del frontend deben importar directamente los tipos canónicos desde el paquete de contratos.

```typescript
// ❌ INCORRECTO (Cómo NO debe ser): Crear alias triviales en puertos de repositorio o en api-client.ts
// En integration-repository.port.ts:
import type {
  OAuthStateRecord,
  StoredConnectionRecord,
  ConnectedAccountRecord,
  SaveConnectionInput,
} from '../../domain/types/integration.type';

export type OAuthState = OAuthStateRecord;
export type StoredConnection = StoredConnectionRecord;
export type ConnectedAccount = ConnectedAccountRecord;
export type ConnectionInput = SaveConnectionInput;

// En api-client.ts (Frontend):
export type Org = OrganizationResponseDto;
export type Agent = AgentResponseDto;
export type Workflow = WorkflowResponseDto;
export type Page<T> = PaginatedResult<T>;
```

```typescript
// ✅ CORRECTO (Cómo debe ser): Usar directamente el tipo propietario sin alias intermedios
// En integration-repository.port.ts:
import type {
  ConnectedAccountRecord,
  OAuthStateRecord,
  SaveConnectionInput,
  StoredConnectionRecord,
} from '../../domain/types/integration.type';

export interface IntegrationRepositoryPort {
  saveOAuthState(state: OAuthStateRecord): Promise<void>;
  consumeOAuthState(state: OAuthStateRecord['state']): Promise<OAuthStateRecord | null>;
  saveConnection(input: SaveConnectionInput): Promise<ConnectedAccountRecord>;
  getDecryptedConnection(
    organization_id: StoredConnectionRecord['organization_id'],
    provider: StoredConnectionRecord['provider'],
  ): Promise<StoredConnectionRecord | null>;
}

// En componentes/servicios del Frontend:
import type {
  AgentResponseDto,
  OrganizationResponseDto,
  PaginatedResult,
  WorkflowResponseDto,
} from '@enterprise-agents/contracts';
```

---

## Guías por lenguaje

- [NestJS](../../stacks/backend/nestjs/architecture/module-symbol-ownership.md)
- [Laravel](../../stacks/backend/laravel/architecture/module-symbol-ownership.md)
- [Rust](../../stacks/rust/core/module-symbol-ownership.md)
- [C++](../../stacks/cpp/core/module-symbol-ownership.md)
- [Godot GDScript/C#](../../stacks/godot/core/module-symbol-ownership.md)
- [React/Web](../../stacks/frontend/web-mfe/ui/component-symbol-ownership.md)
- [Expo/Mobile](../../stacks/mobile/expo/ui/component-symbol-ownership.md)

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Extraer una política de hash compartida a `auth/config` y conservar `const user` local al flujo.
- ❌ **Incorrecto:** Forzar una carpeta `const/` por cada declaración e importar auth desde shared indiscriminadamente.

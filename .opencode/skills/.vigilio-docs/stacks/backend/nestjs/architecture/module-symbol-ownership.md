# NestJS — estructura por feature, puertos, configuración y tipos

**Owner:** auth/products/etc. Complementar el [owner transversal](../../../../standards/engineering/file-and-symbol-ownership.md) y el [contrato HTTP](../../../../standards/api/http-dtos-and-contracts.md); `@Inject(TOKEN)` requiere token real en runtime aunque el puerto sea TypeScript interface. Documentación oficial: https://docs.nestjs.com/modules y https://docs.nestjs.com/fundamentals/custom-providers.

## Estructura proporcional

```text
src/modules/auth/
├── auth.module.ts
├── domain/auth-security.ts
├── application/ports/auth-ports.ts
├── application/services/auth.service.ts
├── infrastructure/argon2-password-hasher.ts
├── config/password-hashing.config.ts
├── constants/auth.constants.ts
├── presentation/http/dto/sign-in.request.dto.ts
└── tests/auth.service.test.ts
```

**En producción:** usar configuración tipada/validada por ambiente cuando los parámetros deban cambiar sin release; hash policy pertenece al módulo auth, no a `shared/constants` global. `AuthService` orquesta validación, límite, sesión; hash y verificación viven en un adaptador inyectado para tests. `USER_REPOSITORY` y `SESSION_REPOSITORY` son tokens de DI y `AuthUserRepository`/`AuthSessionRepository` son tipos de puerto. No duplicar interfaces por puro convencimiento de carpetas.

```ts
// application/ports/password-hasher.port.ts
export interface PasswordHasher { hash(password: string): Promise<string>; verify(hash: string, password: string): Promise<boolean>; }
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
```

```ts
// application/services/auth.service.ts
@Injectable()
export class AuthService {
  constructor(@Inject(PASSWORD_HASHER) private readonly passwordHasher: PasswordHasher) {}
  async verifyCredentials(stored_hash: string, submitted_password: string): Promise<boolean> {
    return this.passwordHasher.verify(stored_hash, submitted_password);
  }
}
```

*Snippet ilustrativo:* faltan imports Nest, `AuthModule` y adaptador real; no presentarlo como programa compilado. La política de hash compartida no vive en este service. En tests probar flujo de usuario inexistente (respuesta uniforme, límites, tiempos) y recuperación de sesión; nunca importar infraestructura desde Domain.

**Contraejemplos:** `const HASH_OPTIONS` replicado en tres services, números mágicos quemados dentro del service sin extraer a `constants/`, `UserRepository` definido dentro de `AuthService`, DTO mezclado con dominio, `SharedUtils` circular, secretos en `constants.ts`, cambiar `hashing` sin plan de migración.

## Reglas para Constantes y Contratos en NestJS

### 1. Extracción obligatoria de constantes fuera de los Services (Sin Abreviaturas)
Toda constante de negocio, límites, TTLs, estados o tasas debe extraerse a `{modulo}/constants/*.constants.ts` (o `config/`) usando **nombres semánticos completos sin abreviaturas**. Nunca dejes valores mágicos quemados dentro de los métodos del service ni uses nombres recortados (`DOC`, `CHARS`, `EMBED`, `KB`, `EVAL`). Solo las variables locales temporales de un flujo (`const resultado = a + b`) permanecen dentro de la función, también con nombres descriptivos (nunca `c`, `q`, `d`, `res`, `ctx`).

```typescript
// ❌ INCORRECTO (Cómo NO debe ser): Abreviaturas en constantes, DTOs y variables locales
export const DEFAULT_EMBED_MODEL = 'nomic-embed-text';
export const MIN_DOC_TITLE_LENGTH = 1;
export const CHUNK_MAX_CHARS = 4000;
export const DOCS_LIST_LIMIT = 200;
export const kbQuery = z.object({ organization_id: z.string().uuid() });
const c = this.getOAuthConfig(provider);
const d = await this.repository.createDocument(input);

// ✅ CORRECTO (Cómo debe ser): Nombres completos y autodocumentados
export const DEFAULT_EMBEDDING_MODEL = 'nomic-embed-text';
export const MIN_DOCUMENT_TITLE_LENGTH = 1;
export const CHUNK_MAX_CHARACTERS = 4000;
export const DOCUMENTS_LIST_LIMIT = 200;
export const knowledgeBaseQueryDto = z.object({ organization_id: z.string().uuid() });
const oauth_config = this.getOAuthConfig(provider);
const created_document = await this.repository.createDocument(input);
```

### 2. Prohibición de Alias Triviales en Puertos de Repositorio y Dominio (`export type A = B`)
Los puertos de repositorio (`application/ports/` o `domain/repositories/`) deben importar y utilizar directamente los tipos de `domain/types/` y `domain/schemas/` sin crear alias como `export type OAuthState = OAuthStateRecord` ni `export type AgentReadModel = AgentSchema`.

### 3. Flujo de Contratos (ADR 0001 y Senior Mode)
- **Cuando el backend es TypeScript/NestJS**: Los contratos (schemas Zod, DTOs de request y response) se crean **únicamente en el Backend** en `presentation/http/dto/` y `domain/schemas/`. La herramienta `vigilio-node generate-contracts` los extrae y compila automáticamente sin decorators de NestJS. El frontend consume el paquete generado (`@vigilioyonatan/*-contracts`) sin duplicar DTOs.
- **Cuando el backend NO es TypeScript/NestJS (Laravel, Python, Go, API externa)**: No se fuerza ningún generador de contratos. El frontend declara sus propias `interfaces/`, `types/` y DTOs locales normales en su propio proyecto (o usa OpenAPI).

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Extraer números mágicos y estados a `{modulo}/constants/` fuera del service; generar contratos automáticamente desde el backend con `generate-contracts` cuando el backend es TS/Nest; usar interfaces/types locales cuando el backend sea de otra tecnología.
- ❌ **Incorrecto:** Dejar constantes de negocio hardcodeadas dentro del service, crear carpetas para variables locales temporales o forzar paquetes de contratos ficticios cuando el backend no es TS/Nest.

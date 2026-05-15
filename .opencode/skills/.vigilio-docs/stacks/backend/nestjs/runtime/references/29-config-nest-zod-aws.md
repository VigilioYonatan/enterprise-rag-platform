# Configuracion NestJS con Zod y AWS

La configuracion runtime del backend se centraliza en `@nestjs/config` y se valida con Zod al arrancar. Si una variable critica esta mal, la aplicacion falla en bootstrap y no queda corriendo con defaults peligrosos.

## Regla principal

- Dentro de NestJS se usa `ConfigService`.
- La validacion vive en `src/shared/infrastructure/config/environment.schema.ts`.
- `.env` es solo para desarrollo local.
- En AWS, las variables las inyecta CDK/Lambda y los secretos deben venir de Secrets Manager, SSM Parameter Store o variables cifradas del environment.
- `process.env` directo queda permitido solo en bootstrap de configuracion, CDK, scripts y helpers que corren fuera del contenedor Nest.

## Bootstrap recomendado

Antes de importar `AppModule`, `main.ts` ejecuta `validateEnvironmentAsync()`. En local carga `.env`; en cloud puede cargar `APP_CONFIG_SECRET_ID` y `CONFIG_SSM_PREFIX`, aplica prioridad `process.env > Secrets Manager > SSM > .env`, valida con Zod y recien despues construye Nest.

```ts
ConfigModule.forRoot({
  cache: true,
  envFilePath: [`.env.${process.env["APP_STAGE"] ?? process.env["NODE_ENV"] ?? "local"}`, ".env"],
  ignoreEnvFile: process.env["APP_STAGE"] === "production" || process.env["NODE_ENV"] === "production",
  isGlobal: true,
  validate: validateEnvironment,
});
```

Que hace cada opcion:

- `isGlobal: true`: permite inyectar `ConfigService` en cualquier modulo sin reimportar config.
- `cache: true`: evita recalcular lecturas de configuracion en runtime.
- `envFilePath`: permite `.env.local`, `.env.development`, `.env.test`, etc.
- `ignoreEnvFile` en production: evita que un `.env` accidental cambie el comportamiento productivo.
- `validate`: ejecuta Zod y corta el arranque si el entorno esta mal.

## Variables principales

```bash
APP_STAGE=local # stage funcional: local, development, staging, production
NODE_ENV=development # modo Node: development, test o production
PORT=3000 # puerto HTTP local
API_DOCS_ENABLED=true # production lo desactiva por defecto
LOG_LEVEL=debug # nivel Pino opcional
DATABASE_URL=${DATABASE_URL} # inyectada por secret store local o CI
DATABASE_SECRET_ARN=${DATABASE_SECRET_ARN} # alternativa cloud; se resuelve con TLS
APP_CONFIG_SECRET_ID=${APP_CONFIG_SECRET_ID} # JSON de secretos de aplicacion
CONFIG_SSM_PREFIX=${CONFIG_SSM_PREFIX} # opcional; solo si el stack tiene parametros/permiso
DATABASE_POOL_MAX=10 # conexiones maximas del pool local/API
DATABASE_IDLE_TIMEOUT_MS=30000 # cierre de conexiones inactivas
JWT_SECRET=local-development-secret-change-me-please # minimo 32 caracteres
JWT_ACCESS_TOKEN_TTL=15m # expiracion access token
JWT_REFRESH_TOKEN_TTL=7d # expiracion refresh token
GOOGLE_CLIENT_ID=your-google-client-id # requerido solo si se usa login Google
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0 # modelo Bedrock para chatbot IA
BEDROCK_MAX_TOKENS=1024 # limite default de salida para controlar costo IA
BEDROCK_TEMPERATURE=0.2 # sampling default para respuestas mas estables
BEDROCK_TOP_P=0.9 # nucleus sampling default
AWS_REGION=us-east-1 # region AWS
AWS_ENDPOINT_URL=http://127.0.0.1:4566 # opcional para LocalStack/Floci
```

## Uso en providers

```ts
@Injectable()
export class ExampleService {
  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {}

  port(): number {
    return this.configService.get("PORT", { infer: true });
  }
}
```

Reglas:

- no leer `process.env` dentro de controllers, services, repositories o guards.
- no parsear numeros manualmente en cada clase; Zod ya coerciona `PORT`, `DATABASE_POOL_MAX` y timeouts.
- si una variable puede faltar, tiparla como optional en el schema y manejar la decision en el caso de uso.
- si una variable es obligatoria para production, agregar una regla `superRefine` con mensaje claro.

## AWS

En CDK la Lambda define variables no sensibles como:

```ts
environment: {
  API_DOCS_ENABLED: config.stage === "production" ? "false" : "true",
  APP_CONFIG_SECRET_ID: appConfigSecret.secretArn,
  APP_STAGE: config.stage,
  DATABASE_SECRET_ARN: databaseSecret.secretArn,
  LOG_LEVEL: config.stage === "production" ? "info" : "debug",
  NODE_ENV: "production",
  NODE_OPTIONS: "--enable-source-maps",
  PORT: "8080",
}
```

Buenas practicas:

- no subir `.env.production` al repo.
- no guardar passwords, tokens ni secrets en CDK hardcodeado.
- no setear manualmente `AWS_REGION` en Lambda; es variable reservada y AWS la inyecta.
- preferir Secrets Manager para credenciales de RDS, OAuth y terceros.
- resolver `DATABASE_SECRET_ARN` en bootstrap de DB; fuera de local nunca usar fallback localhost.
- usar OIDC de GitHub Actions para deploy, no access keys largas.
- validar config en CI con `pnpm typecheck` y en runtime con Zod.

## Por que no Joi

El proyecto ya usa Zod para schemas, DTOs, queries y responses. Usar Zod tambien para entorno evita dos sistemas de validacion distintos y permite inferir tipos con `z.infer`.

Referencia oficial: NestJS documenta `@nestjs/config`, `ConfigModule.forRoot(...)`, validacion de schema y funciones `validate` personalizadas en su guia de configuracion.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Configuracion NestJS con Zod y AWS

✅ **Correcto:** Para **Configuracion NestJS con Zod y AWS**, limitar roles cloud, medir el coste y utilizar enlaces a las guías AWS propietarias.

❌ **Incorrecto:** En **Configuracion NestJS con Zod y AWS**, copiar credenciales AWS, inventar precios o meter la configuración cloud dentro del modelo de negocio.

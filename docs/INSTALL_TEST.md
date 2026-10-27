# Instalación y verificación — entorno local (sin AWS)

**Requisitos:** Docker Engine + Compose V2, acceso a imágenes y registry npm, RAM para PostgreSQL/Keycloak/ClamAV; más RAM/VRAM para Ollama. No desplegar públicos los defaults localhost.

```sh
cp enterprise-rag-deploy/.env.example enterprise-rag-deploy/.env
# Editar contraseñas, origen OIDC y parámetros de red antes de iniciar.
cd enterprise-rag-deploy
./scripts/start-local.sh
curl -fsS http://localhost:8080/api/v1/health/live
curl -fsS http://localhost:8080/api/v1/health/ready
```

Local UI en `http://localhost:8080`, Keycloak en `http://localhost:8081`, Mailpit en `http://localhost:8025`. En Keycloak registrar usuario; en frontend crear tenant y KB. La recuperación de contraseña necesita SMTP, Mailpit provee solo laboratorio. Modelos Ollama se descargan si `PULL_LOCAL_MODELS=true` al usar `start-local.sh`; para descarga manual:

```sh
docker compose --env-file .env -f compose/compose.yaml --profile llm up -d ollama
docker compose --env-file .env -f compose/compose.yaml exec ollama ollama pull gemma3:4b
docker compose --env-file .env -f compose/compose.yaml exec ollama ollama pull nomic-embed-text
```

Si `EMBEDDINGS_ENABLED=false`, retrieval funciona solo con FTS. Si Ollama falta, la API devuelve abstención de proveedor sin respuestas ficticias. ClamAV debe estar listo antes de que un archivo binario se procese; en fallo se rechaza la ingesta, no se salta el antivirus.

**Pruebas con dependencias instaladas:**

```sh
# Ejecutar desde la raíz del ZIP extraído (no desde subdirectorios).
( cd apps/enterprise-rag-impl && npm ci && npm run typecheck && npm test && npm run build )
( cd apps/enterprise-rag-web && npm ci && npm run typecheck && npm test && npm run build )
# Playwright requiere navegador y el stack real levantado.
( cd apps/enterprise-rag-web && npx playwright install chromium && npm run test:e2e )
# Solo en base EFÍMERA, nunca producción, con migraciones 001–011 aplicadas:
MIGRATION_DATABASE_URL='postgresql://...' ./prod-local/scripts/test-rls.sh
```

**Gate release:** el proyecto no tiene lockfiles generados en este entorno sin npm. Generarlos con acceso a registry, auditarlos y usar `npm ci` antes de publicar imágenes. El README no asegura build ni tests hasta observar resultados. El comando de migración es one-shot y requiere credencial distinta a `rag_app`.

**Aviso:** `npm ci` fallará deliberadamente hasta generar `package-lock.json` mediante `sh prod-local/scripts/prepare-lockfiles.sh` en un entorno con acceso al registry. Ningún lockfile falso se incluye. La validación Compose y las pruebas RLS/Playwright siguen NO VERIFICADAS en este entorno.

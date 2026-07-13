import { z } from 'zod';

const booleanEnv = z.preprocess((val) => {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1';
  }
  return false;
}, z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEB_ORIGIN: z.string().min(1).default('http://localhost:8080'),
  DATABASE_URL: z.url(),
  WORKER_DATABASE_URL: z.url().optional(),
  OIDC_ISSUER: z.url(),
  OIDC_JWKS_URL: z.url(),
  OIDC_AUDIENCE: z.string().min(1).default('enterprise-rag-api'),
  OIDC_CLIENT_ID: z.string().min(1).default('enterprise-rag-web'),
  OLLAMA_URL: z.url().default('http://ollama:11434'),
  OLLAMA_GENERATION_MODEL: z.string().min(1).default('qwen2.5:3b'),
  OLLAMA_EMBED_MODEL: z.string().min(1).default('qwen3-embedding:0.6b'),
  EMBEDDINGS_ENABLED: booleanEnv.default(false),
  EMBEDDING_DIMENSIONS: z.coerce
    .number()
    .int()
    .refine((n) => n === 0 || n === 768 || n === 1024)
    .default(0),
  MIN_VECTOR_SIMILARITY: z.coerce.number().min(0).max(1).default(0.25),
  RERANKER_ENABLED: booleanEnv.default(false),
  RERANKER_URL: z.url().optional(),
  RERANKER_MODEL: z.string().min(1).default('Qwen/Qwen3-Reranker-0.6B'),
  OBJECT_STORAGE_HOST: z.string().min(1).default('rustfs'),
  OBJECT_STORAGE_PORT: z.coerce.number().int().min(1).max(65535).default(9000),
  OBJECT_STORAGE_SSL: booleanEnv.default(false),
  OBJECT_STORAGE_REGION: z.string().min(1).default('us-east-1'),
  OBJECT_STORAGE_BUCKET: z
    .string()
    .regex(/^[a-z0-9][a-z0-9.-]{2,62}$/)
    .default('rag-documents'),
  OBJECT_STORAGE_ACCESS_KEY: z.string().min(8),
  OBJECT_STORAGE_SECRET_KEY: z.string().min(8),
  VALKEY_URL: z.url().default('redis://valkey:6379'),
  VALKEY_PASSWORD: z.string().min(8),
  QUEUE_MODE: z.enum(['bullmq', 'postgres']).default('bullmq'),
  CLAMAV_REQUIRED: booleanEnv.default(true),
  CLAMAV_HOST: z.string().min(1).default('clamav'),
  CLAMAV_PORT: z.coerce.number().int().min(1).max(65535).default(3310),
  OCR_ENABLED: booleanEnv.default(false),
  OCR_LANG_PATH: z.string().min(1).default('/opt/tessdata'),
  ENABLE_SWAGGER_UI: booleanEnv.default(false),
  LLM_INPUT_USD_PER_MILLION: z.coerce.number().min(0).default(0),
  LLM_OUTPUT_USD_PER_MILLION: z.coerce.number().min(0).default(0),
});

export type EnvSchema = z.infer<typeof envSchema>;

function buildEffectiveSource(raw: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const isOfflineSafeContext =
    raw.NODE_ENV === 'test' ||
    Boolean(raw.VITEST) ||
    raw.OPENAPI_EXPORT === 'true' ||
    raw.OPENAPI_EXPORT === '1';
  if (!isOfflineSafeContext) {
    return raw;
  }
  return {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://rag_app:local_dev_only_pwd@127.0.0.1:5432/rag',
    OIDC_ISSUER: 'http://127.0.0.1:8081/realms/enterprise',
    OIDC_JWKS_URL: 'http://127.0.0.1:8081/realms/enterprise/protocol/openid-connect/certs',
    OBJECT_STORAGE_ACCESS_KEY: 'local_dev_only_key',
    OBJECT_STORAGE_SECRET_KEY: 'local_dev_only_secret',
    VALKEY_PASSWORD: 'local_dev_only_valkey',
    ...raw,
  };
}

export const env: EnvSchema = envSchema.parse(buildEffectiveSource(process.env));

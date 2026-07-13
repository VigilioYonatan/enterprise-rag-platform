import { Injectable } from '@nestjs/common';
import { type EnvSchema, env } from './env';

@Injectable()
export class AppConfigService {
  readonly env: EnvSchema = env;

  get<K extends keyof EnvSchema>(key: K): EnvSchema[K] {
    return this.env[key];
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get embeddingsEnabled(): boolean {
    return this.env.EMBEDDINGS_ENABLED;
  }

  get rerankerEnabled(): boolean {
    return this.env.RERANKER_ENABLED;
  }

  get clamavRequired(): boolean {
    return this.env.CLAMAV_REQUIRED;
  }

  get ocrEnabled(): boolean {
    return this.env.OCR_ENABLED;
  }
}

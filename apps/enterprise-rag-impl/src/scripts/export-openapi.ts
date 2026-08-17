import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

process.env.OPENAPI_EXPORT = 'true';

async function main(): Promise<void> {
  const { AppModule } = await import('../app.module');
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  const spec = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Enterprise RAG Platform API')
      .setDescription('Zero-trust ACL-aware Enterprise RAG HTTP Contract (Vigilio 2026)')
      .setVersion('0.1.0-beta')
      .addBearerAuth()
      .build(),
  );
  const target = process.argv[2] || 'openapi.json';
  writeFileSync(target, `${JSON.stringify(spec, null, 2)}\n`);
  await app.close();
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? (e.stack ?? e.message) : String(e)}\n`);
  process.exitCode = 1;
});

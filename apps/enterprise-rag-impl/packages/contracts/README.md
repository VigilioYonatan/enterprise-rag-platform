# `@enterprise-rag/contracts`

Contratos HTTP públicos de `enterprise-rag-impl`: schemas Zod y tipos inferidos. El paquete no exporta NestJS, Swagger ni decoradores backend.

## Desarrollo local en tiempo real

Desde `enterprise-rag-impl`:

```powershell
pnpm build:contracts
```

En `enterprise-rag-web`, el paquete se consume directamente vía `@enterprise-rag/contracts`.

# Arquitectura de cinco repositorios

- `apps/enterprise-rag-impl`: API NestJS y worker BullMQ+Valkey con leases SQL; domain/services/repository, DTO Zod, adaptador pg. API y worker comparten modelo SQL sin duplicación en paquetes.
- `apps/enterprise-rag-web`: React/Vite/Tailwind, `auth` OIDC, layout, `features/knowledge-bases`, `features/documents`, `features/chat`; UI reutilizable en `src/libs/ui`.
- `enterprise-rag-deploy`: **único** compose canónico, Caddy, import de realm Keycloak (development), containers.
- `platform-ops`: checklist de despliegue y backups; sin recursos cloud vendor.
- `prod-local`: smoke/BDD y script de pruebas de infraestructura.

## Trust boundaries

Browser → Keycloak (PKCE) → token de acceso → NestJWTGuard verifica firma/JWKS, issuer, audience y azp → `tx.set_config('app.actor_sub', ...)` con `SET LOCAL` → SQL RLS y ACL sobre filas. Nunca tomar actor ni tenant de headers arbitrarios. Cada transacción usa `SET LOCAL`, evita fuga de contexto por conexiones recicladas.

## Ingesta

`POST /knowledge-bases/:id/documents` almacena texto plano y job en una transacción. Worker separado recibe tareas desde BullMQ/Valkey y reclama trabajo con `FOR UPDATE SKIP LOCKED`, fencing y heartbeat sobre PostgreSQL; almacena originales privados en MinIO, verifica integridad/ClamAV y publica chunks autorizados. Queries solo leen documentos `ready`. Citas incluyen documento y chunk y vuelven a validar ACL.

## Producción

Son archivos fuente para un slice funcional, NO un stack certificado para producción. MinIO autohospedado y transporte Valkey están implementados como código fuente, pero no probados en runtime. Requiere cuentas de almacenamiento de mínimo privilegio, ClamAV real, correo SMTP, TLS, PITR externo, pruebas de restore y pinning de imágenes por digest antes del release.

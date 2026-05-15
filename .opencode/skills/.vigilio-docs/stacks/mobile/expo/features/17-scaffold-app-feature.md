# Scaffold De Una Aplicación Mobile

## Aplicación frente a feature

Una aplicación es un binario/producto con application ID, EAS project, environments y ownership. Una
feature es un módulo vertical dentro de esa app. No crear otra app para cada worker/backend ni llamar
“MFE” a cualquier pantalla.

## Inputs obligatorios

Antes de generar una app:

- nombre/product owner y package IDs;
- plataformas y versiones mínimas;
- backend/contratos y método auth;
- perfiles EAS y estrategia de distribución;
- datos sensibles/permisos;
- SLO, analytics y crash provider;
- design system/branding;
- matriz de pruebas y rollback.

## Árbol mínimo

```text
apps/my-mobile/
  .github/workflows/
  app/
    _layout.tsx
    (auth)/
    (app)/
  src/
    design-system/
    features/
    screens/
    providers/
    services/{auth,http,files,observability}/
    config/
  libs/test-utils/
  tests/e2e/
  app.json
  app.config.ts
  eas.json
  jest.config.cjs
  metro.config.js
  tailwind.config.js
  package.json
  pnpm-lock.yaml
  README.md
```

Los contratos de backend se consumen desde un paquete owner-managed con versión exacta (en este
workspace, `@vigilioyonatan/bus-contracts`). No se genera un mirror local de DTOs/schemas.

## Agregar Features Después Del Scaffold

Este documento termina en el boundary de aplicación. La estructura, nombres, contratos derivados,
APIs por operación, hooks, componentes y pruebas de una feature se definen una sola vez en
[Golden path de una feature mobile](6-golden-path-feature-mobile.md). No mantener aquí un segundo
árbol de feature porque ambos estándares terminarían divergiendo.

El scaffold de aplicación crea únicamente infraestructura ejecutable y pruebas smoke reales. No
genera DTOs, reglas de negocio, carpetas vacías ni recorridos E2E ficticios.

## Verificación

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:coverage
pnpm expo:check
pnpm expo:doctor
pnpm export
pnpm export:budget
```

Después se ejecutan Maestro y EAS con emulador/dispositivo y credenciales autorizadas.

## README de cada app

Debe explicar requisitos, variables públicas, inicio Android/iOS, backend, perfiles, pruebas, EAS,
troubleshooting y pendientes reales. No copiar URLs, package IDs o credenciales de otra aplicación.

## No hacer

- Incluir Terraform/Kubernetes dentro de la app.
- Copiar todo `mobile-mfe` sin eliminar ejemplos.
- Crear una store global para todo.
- Omitir permisos/privacy porque el simulador funciona.
- Declarar build/store/E2E como probado sin evidencia.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Scaffold De Una Aplicación Mobile

✅ **Correcto:** Para **Scaffold De Una Aplicación Mobile**, crear operaciones semánticas según casos de uso y comprobar contratos publicados.

❌ **Incorrecto:** En **Scaffold De Una Aplicación Mobile**, generar métodos CRUD index/show/store como norma de negocio.

# Informe de reorganización multistack — 2026-10-24

## Alcance y conservación

- Fuente: `vigilio-docs-skills-multistack-migracion-completa-2026-10-24.zip`.
- Documentos web migrados: **20** archivos con texto completo.
- Documentos mobile migrados: **18** archivos con texto completo.
- Guías de refactorización y mapa técnico reubicados: **5**.
- Skills: renombre de la skill de refactorización sin duplicar instrucciones.
- Todas las normas DDD/DevSecOps históricas permanecen intactas excepto ajuste de enlaces; los ADR no cambian.
- Registro canónico de versiones humanas: `technology/versions.md`; los YAML existentes se mantienen como snapshots máquina hasta completar migración del tooling.
- Se incorporaron **18 controles técnicos** distribuidos por tema con ✅ y ❌.

## ¿Qué significaban las carpetas antiguas?

- `frontend-web-mfe`: frontend web modular (Preact/Vite/BFF según contexto), ahora `stacks/frontend/web-mfe/`.
- `frontend-mobile-mfe`: aplicación móvil Expo/React Native organizada en módulos, ahora `stacks/mobile/expo/`.
- `legacy-modernization`: refactor de código existente; nombre sustituido por refactorización según stack. ADR histórico original se preserva.

## Puertas de calidad

Se requiere validar enlaces, sidebar, generación `_site`, snapshot npm, sync/check en consumidor aislado, inventario de contenido y tests concretos de dependencias antes de declarar release de producción.

## Mapa de rutas original → actual

| Ruta anterior | Nueva ruta |
|---|---|
| `frontend-mobile-mfe/1-contratos-zod-formularios-tanstack.md` | `stacks/mobile/expo/contracts/1-contratos-zod-formularios-tanstack.md` |
| `frontend-mobile-mfe/10-observabilidad-mobile-sli-slo.md` | `stacks/mobile/expo/observability/10-observabilidad-mobile-sli-slo.md` |
| `frontend-mobile-mfe/11-tooling-pnpm-biome-supply-chain.md` | `stacks/mobile/expo/quality/11-tooling-pnpm-biome-supply-chain.md` |
| `frontend-mobile-mfe/12-devsecops-cicd-github.md` | `stacks/mobile/expo/delivery/12-devsecops-cicd-github.md` |
| `frontend-mobile-mfe/13-eas-stores-ota-finops.md` | `stacks/mobile/expo/delivery/13-eas-stores-ota-finops.md` |
| `frontend-mobile-mfe/14-gobierno-releases-ownership.md` | `stacks/mobile/expo/governance/14-gobierno-releases-ownership.md` |
| `frontend-mobile-mfe/15-evaluacion-roadmap-operacion.md` | `stacks/mobile/expo/governance/15-evaluacion-roadmap-operacion.md` |
| `frontend-mobile-mfe/16-design-system-nativewind-tokens.md` | `stacks/mobile/expo/ui/16-design-system-nativewind-tokens.md` |
| `frontend-mobile-mfe/17-scaffold-app-feature.md` | `stacks/mobile/expo/features/17-scaffold-app-feature.md` |
| `frontend-mobile-mfe/2-skills-agentes-openspec-devsecops.md` | `stacks/mobile/expo/governance/2-skills-agentes-openspec-devsecops.md` |
| `frontend-mobile-mfe/3-arquitectura-estructura-estado-navegacion.md` | `stacks/mobile/expo/architecture/3-arquitectura-estructura-estado-navegacion.md` |
| `frontend-mobile-mfe/4-flujo-local-entornos-runtime-config.md` | `stacks/mobile/expo/runtime/4-flujo-local-entornos-runtime-config.md` |
| `frontend-mobile-mfe/5-http-auth-deep-links-uploads.md` | `stacks/mobile/expo/http/5-http-auth-deep-links-uploads.md` |
| `frontend-mobile-mfe/6-golden-path-feature-mobile.md` | `stacks/mobile/expo/features/6-golden-path-feature-mobile.md` |
| `frontend-mobile-mfe/7-testing-jest-rntl-maestro.md` | `stacks/mobile/expo/testing/7-testing-jest-rntl-maestro.md` |
| `frontend-mobile-mfe/8-accesibilidad-rendimiento-calidad.md` | `stacks/mobile/expo/quality/8-accesibilidad-rendimiento-calidad.md` |
| `frontend-mobile-mfe/9-seguridad-hardening-privacidad.md` | `stacks/mobile/expo/security/9-seguridad-hardening-privacidad.md` |
| `frontend-mobile-mfe/README.md` | `stacks/mobile/expo/README.md` |
| `frontend-web-mfe/1-contratos-dtos-zod-tanstack.md` | `stacks/frontend/web-mfe/contracts/1-contratos-dtos-zod-tanstack.md` |
| `frontend-web-mfe/10-observabilidad-rum-grafana-slo.md` | `stacks/frontend/web-mfe/observability/10-observabilidad-rum-grafana-slo.md` |
| `frontend-web-mfe/11-tooling-pnpm-biome-supply-chain.md` | `stacks/frontend/web-mfe/quality/11-tooling-pnpm-biome-supply-chain.md` |
| `frontend-web-mfe/12-devsecops-cicd-github.md` | `stacks/frontend/web-mfe/delivery/12-devsecops-cicd-github.md` |
| `frontend-web-mfe/13-aws-cloudfront-cdk-finops.md` | `stacks/frontend/web-mfe/delivery/13-aws-cloudfront-cdk-finops.md` |
| `frontend-web-mfe/14-gobierno-skills-openspec-release.md` | `stacks/frontend/web-mfe/governance/14-gobierno-skills-openspec-release.md` |
| `frontend-web-mfe/15-evaluacion-roadmap-operacion.md` | `stacks/frontend/web-mfe/governance/15-evaluacion-roadmap-operacion.md` |
| `frontend-web-mfe/16-design-system-ui-tokens.md` | `stacks/frontend/web-mfe/ui/16-design-system-ui-tokens.md` |
| `frontend-web-mfe/17-scaffold-app-feature.md` | `stacks/frontend/web-mfe/features/17-scaffold-app-feature.md` |
| `frontend-web-mfe/18-frontend-technologies-skill-2026.md` | `stacks/frontend/web-mfe/technology/18-frontend-technologies-skill-2026.md` |
| `frontend-web-mfe/19-realtime-websocket-sse.md` | `stacks/frontend/web-mfe/http/19-realtime-websocket-sse.md` |
| `frontend-web-mfe/2-skills-agentes-openspec-devsecops.md` | `stacks/frontend/web-mfe/governance/2-skills-agentes-openspec-devsecops.md` |
| `frontend-web-mfe/3-arquitectura-estructura-estado.md` | `stacks/frontend/web-mfe/architecture/3-arquitectura-estructura-estado.md` |
| `frontend-web-mfe/4-flujo-local-entornos-runtime-config.md` | `stacks/frontend/web-mfe/runtime/4-flujo-local-entornos-runtime-config.md` |
| `frontend-web-mfe/5-bff-http-runtime-auth.md` | `stacks/frontend/web-mfe/http/5-bff-http-runtime-auth.md` |
| `frontend-web-mfe/6-golden-path-feature-componentes-hooks.md` | `stacks/frontend/web-mfe/features/6-golden-path-feature-componentes-hooks.md` |
| `frontend-web-mfe/7-testing-vitest-msw-playwright.md` | `stacks/frontend/web-mfe/testing/7-testing-vitest-msw-playwright.md` |
| `frontend-web-mfe/8-calidad-seo-accesibilidad-rendimiento.md` | `stacks/frontend/web-mfe/quality/8-calidad-seo-accesibilidad-rendimiento.md` |
| `frontend-web-mfe/9-seguridad-hardening-privacidad.md` | `stacks/frontend/web-mfe/security/9-seguridad-hardening-privacidad.md` |
| `frontend-web-mfe/README.md` | `stacks/frontend/web-mfe/README.md` |
| `stacks/backend/laravel/quality/legacy-modernization.md` | `stacks/backend/laravel/quality/refactoring-examples.md` |
| `stacks/backend/nestjs/legacy-modernization.md` | `stacks/backend/nestjs/quality/refactoring-examples.md` |
| `stacks/backend/nestjs/legacy-source-map.md` | `stacks/backend/nestjs/migration-content-map.md` |
| `stacks/backend/nestjs/quality/legacy-refactoring.md` | `stacks/backend/nestjs/quality/refactoring-workflow.md` |
| `standards/engineering/legacy-modernization.md` | `standards/engineering/refactoring-existing-code.md` |

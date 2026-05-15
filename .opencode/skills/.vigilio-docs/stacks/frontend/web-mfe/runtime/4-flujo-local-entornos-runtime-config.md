# Flujo Local, Entornos Y Runtime Config

## Topología

```text
local -> preview de PR -> staging -> production
```

El flujo recomendado es trunk-based: ramas cortas hacia `main`, artefacto inmutable y promoción controlada por environments. No introducir `develop` o `release/**` sin una necesidad organizacional demostrada.

## Configuración pública

El navegador solo puede recibir valores públicos. El baseline de `web-mfe` usa:

- `VITE_API_BASE_URL`;
- `VITE_STAGE`;
- flags públicos de features.

La configuración se valida con Zod y se escribe en `runtime-config.js`, cargado antes del bundle. Esto permite cambiar endpoint, stage y flags sin recompilar JavaScript.

Reglas:

- HTTPS fuera de localhost.
- Allowlist explícita de claves.
- Rechazar nombres como `SECRET`, `TOKEN`, `PASSWORD`, `PRIVATE_KEY` o `ACCESS_KEY`.
- No imprimir runtime config completa en logs.
- `runtime-config.js` y `index.html` usan caché corta; assets hasheados usan caché larga.

## Inicio local

```bash
pnpm install --frozen-lockfile
pnpm skills:sync
pnpm dev
```

Para contratos en desarrollo:

```bash
# bus-impl
pnpm dev:contracts

# web-mfe
pnpm dev
```

Un link local es temporal. Antes de commit, CI o producción se restaura la versión publicada exacta y se regenera el lockfile.

## Ciclo de cambio

1. Leer `AGENTS.md`, el documento canónico y una implementación vecina.
2. Crear OpenSpec si el cambio es cross-repo, breaking, auth, infraestructura o delivery.
3. Implementar el cambio más pequeño que cubra el criterio.
4. Ejecutar el test afectado durante el desarrollo.
5. Ejecutar los gates según superficie.
6. Revisar bundle, accesibilidad, headers o CDK si aplican.
7. Documentar solamente comportamiento comprobado.

## Gates locales

```bash
pnpm lint
pnpm typecheck
pnpm governance:contracts
pnpm governance:package-manager
pnpm governance:github-actions
pnpm skills:check
pnpm test
pnpm build
pnpm bundle:budget
```

Agregar `pnpm test:e2e`, `pnpm test:visual`, `pnpm cdk:synth` y smoke remoto según el riesgo.

## Preview por PR

- No usa secretos ni datos de producción.
- Tiene URL y recursos identificables por PR.
- Se elimina al cerrar el PR.
- Usa configuración del environment de preview.
- Ejecuta smoke funcional y controles de seguridad proporcionados por la plataforma.

## Staging y producción

- OIDC hacia AWS; no access keys persistentes.
- Environment protegido y aprobación cuando corresponda.
- Se promueve el mismo artefacto validado.
- Runtime config se escribe durante el despliegue sin recompilar.
- Smoke post-deploy verifica disponibilidad y headers.
- Rollback apunta a un artefacto anterior conocido.

## Matriz de pruebas

| Cambio | Evidencia mínima |
|---|---|
| Documentación | enlaces, fences y formato |
| Código TypeScript | lint + typecheck + unit/component |
| Contrato HTTP | governance + OpenAPI + tests |
| UI visible | unit/component + a11y; visual si aplica |
| Ruta crítica | E2E |
| Infraestructura | CDK synth + cdk-nag |
| Delivery/headers | policy de workflows + smoke remoto |

## Definition of Done

- No existen dependencias `link:`, `file:`, `workspace:*` o tags flotantes en CI.
- Runtime config fue validada para el stage.
- El artefacto de build es reproducible.
- Los gates ejecutados se reportan con precisión.
- Los controles externos pendientes quedan explícitos, no marcados como implementados.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Flujo Local, Entornos Y Runtime Config

✅ **Correcto:** Para **Flujo Local, Entornos Y Runtime Config**, separar configuración y secretos por ambiente, probar arranque y healthchecks.

❌ **Incorrecto:** En **Flujo Local, Entornos Y Runtime Config**, hardcodear secretos o prometer despliegue sin pruebas en runtime.

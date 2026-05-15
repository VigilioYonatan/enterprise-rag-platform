# Skills, Agentes, OpenSpec Y DevSecOps Mobile

## Fuente única

Las skills y automatizaciones canónicas viven en `platform-actions`. La plantilla conserva snapshots administradas en `.agents/skills/` y `.opencode/skills/`; cada runtime usa el mismo contenido y un manifiesto SHA-256. `pnpm skills:check` detecta archivos modificados, faltantes, obsoletos o distintos entre runtimes.

Una skill guía decisiones. Los tests y gates ejecutables son el control obligatorio.

## Perfil `mobile-mfe`

| Skill | Superficie |
| --- | --- |
| `mobile-mfe-build-feature` | Expo Router, screens, features, providers, estado y lifecycle nativo |
| `mobile-mfe-contracts` | Zod, React Hook Form, TanStack Query, CRUD y uploads presignados |
| `mobile-mfe-testing` | Jest Expo, RNTL, contratos, Maestro, coverage y evidencia |
| `mobile-mfe-quality` | Accesibilidad nativa, performance, offline y observabilidad |
| `mobile-mfe-security-delivery` | SecureStore, permisos, deep links, EAS, OTA y supply chain |

Codex invoca `$mobile-mfe-build-feature`; OpenCode usa el mismo nombre sin `$`. Para un CRUD HTTP suelen combinarse feature, contracts y testing. Agregar quality o security-delivery según riesgo.

## Sincronización canónica

Tras publicar una versión revisada de `@vigilioyonatan/vigilio-skills`, el consumidor la fija explícitamente y sincroniza ambos runtimes:

```bash
pnpm exec vigilio-skills sync --profile core --profile mobile-mfe --profile openspec
pnpm exec vigilio-skills sync --target .agents/skills --profile core --profile mobile-mfe --profile openspec
pnpm exec vigilio-skills check --profile core --profile mobile-mfe --profile openspec
pnpm exec vigilio-skills check --target .agents/skills --profile core --profile mobile-mfe --profile openspec
```

La sincronización se niega a sobrescribir cambios locales salvo `--force`, elimina únicamente archivos previamente gestionados y registra hashes. La plantilla actual añade además `pnpm skills:check` para verificar las snapshots ya incluidas sin depender de red o credenciales de GitHub Packages.

## Límites React Native

- TanStack Query posee server state; React Hook Form posee formularios; Expo Router posee navegación.
- Preact Signals solo expone estado cliente compartido pequeño; no duplica Query ni formularios.
- Tokens se guardan detrás de Expo SecureStore, nunca AsyncStorage.
- AppState y NetInfo conectan foco/conectividad en el provider raíz.
- No se usan DOM APIs, `localStorage`, Node built-ins, SDK cloud ni Terraform dentro del cliente.
- Maestro requiere app instalada, dispositivo/emulador y backend controlado; Jest/RNTL no es E2E.

## OpenSpec y ADR

Crear propuesta formal cuando cambie autenticación, persistencia, navegación raíz, runtime OTA, permisos nativos, analytics, contrato backend o distribución. Incluir problema, contrato/threat model, migración/rollback, matriz de dispositivos y evidencia esperada.

Una feature CRUD normal puede seguir el golden path sin ADR si no cambia esas decisiones.

## DevSecOps mínimo

```text
commit/PR
  -> skills + package-manager + repository policy
  -> contratos + Biome + typecheck
  -> unit/component + coverage
  -> Expo Doctor + export budget
  -> secrets/SAST/dependency scan + SBOM
  -> build EAS por ambiente aprobado
```

Actions externas se fijan a SHA, `permissions` usa mínimo privilegio y ninguna expresión no confiable se interpola en shell. Artefactos conservan commit, perfil, runtime y digest.

## Evidencia honesta

- No publicar, firmar ni promover sin autorización y credenciales.
- No declarar E2E si solo se renderizaron componentes.
- Un export prueba bundling; no prueba instalación, permisos, red, stores ni runtime real.
- No declarar EAS, OTA rollback, AWS, Azure o GCP sin ejecutar el entorno correspondiente.
- No modificar `_site`; el sitio se genera desde Markdown.

## Definition of Done

Las instrucciones, skills, código, contratos, pruebas, documentación y pipeline coinciden. Todo gate no ejecutado se entrega como pendiente explícito, no como evidencia implícita.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Skills, Agentes, OpenSpec Y DevSecOps Mobile

✅ **Correcto:** Para **Skills, Agentes, OpenSpec Y DevSecOps Mobile**, mantener una norma propietaria y evidencia trazable por cambio.

❌ **Incorrecto:** En **Skills, Agentes, OpenSpec Y DevSecOps Mobile**, repetir políticas transversales en cada skill y afirmar aprobaciones no verificadas.

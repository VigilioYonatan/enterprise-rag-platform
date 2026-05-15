# Tooling, pnpm, Biome Y Supply Chain

## Versiones y package manager

- Node y pnpm fijados en `packageManager`, engines y configuración del workspace.
- `corepack` en local/CI cuando corresponda.
- Lockfile congelado en CI.
- Versiones exactas para contratos, skills y herramientas críticas.
- Sin `link:`, `file:`, `workspace:*`, `latest`, `next` o ranges para paquetes externos de plataforma en CI/producción.

Los links locales sirven para feedback durante desarrollo. Deben desaparecer antes de commit y regenerarse el lockfile contra el registry.

## Registry privado

`.npmrc` define el scope y registry, pero nunca contiene tokens versionados. El token proviene del entorno o secret store del runner.

Validar:

- scope correcto;
- `always-auth` según registry;
- ausencia de credenciales en repo/artifact;
- permisos mínimos para lectura/publicación.

## pnpm 11

La configuración activa vive en `pnpm-workspace.yaml`. Mantener, según riesgo:

- `engineStrict`;
- integridad del store;
- `strictDepBuilds`;
- allowlist de dependencias con scripts de build;
- `minimumReleaseAge`;
- política de trust/lockfile.

Las excepciones temporales para paquetes recién publicados deben usar versión exacta, motivo y fecha de retiro.

## Biome

Biome es la única herramienta de lint/formato del baseline. No agregar ESLint o Prettier en paralelo.

- `biome ci .` en CI.
- `biome format --write` para formato mecánico.
- Excluir artifacts, reportes y skills sincronizadas inmutables.
- Mantener TypeScript strict; lint no sustituye typecheck.

No modificar copias administradas de `.agents/skills` o `.opencode/skills` para satisfacer formato; el consumidor debe excluirlas y `skills:check` controla su integridad.

## Husky y lint-staged

Los hooks aceleran feedback, pero CI es la autoridad. No esconder gates críticos únicamente en pre-commit/pre-push.

## Dependency review

- Revisar licencia, mantenimiento, tamaño y scripts.
- Preferir capacidades ya presentes en el stack.
- Bloquear severidad según política.
- Excepciones con owner, justificación y expiración.
- No actualizar dependencias sensibles sin tests y diff de artifact.

## SBOM y provenance

- Generar SBOM de release.
- Asociar artifact a commit, workflow y versión.
- Usar attestations/provenance cuando la plataforma lo soporte.
- No incluir `.env`, reportes sensibles o source maps públicos no autorizados.

## Skills como dependencia

`@vigilioyonatan/vigilio-skills` se instala con versión exacta. `skills:sync` materializa el perfil y `skills:check` verifica hashes.

```bash
pnpm skills:sync
pnpm skills:check
```

La fuente se edita en `vigilio-platform-actions`, no en las copias del consumidor.

## Gates

```bash
pnpm lint
pnpm typecheck
pnpm governance:package-manager
pnpm governance:repository
pnpm governance:github-actions
pnpm skills:check
pnpm sbom:generate
```

## Anti-patrones

- Dos formatters compitiendo.
- Ranges flotantes en contratos.
- Tokens en `.npmrc`.
- Desactivar scripts de build globalmente sin entender impacto.
- Excepción de auditoría sin fecha.
- Editar assets de skills sincronizados.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Tooling, pnpm, Biome Y Supply Chain

✅ **Correcto:** Para **Tooling, pnpm, Biome Y Supply Chain**, reutilizar contratos, separar API client y hooks con errores y cache invalidada.

❌ **Incorrecto:** En **Tooling, pnpm, Biome Y Supply Chain**, hacer fetch directamente en componentes o llamar store/index a casos de uso.

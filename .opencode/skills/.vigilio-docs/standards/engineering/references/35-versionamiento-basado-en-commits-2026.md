# Versionamiento Basado en Commits - 2026

[Configuracion hibrida](../../../stacks/backend/nestjs/runtime/references/34-gestion-configuracion-hibrida-2026.md) |
[Indice](../../../stacks/backend/nestjs/references/README.md)

## 1. Aplicaciones y paquetes no versionan igual

- una aplicacion desplegable se identifica por commit SHA, digest, provenance y environment;
- un paquete consumido por otros repos usa SemVer y release notes;
- una version comercial o Jira Fix Version puede agrupar varios deploys sin cambiar
  `package.json` del servicio.

## 2. `bus-impl`

El pipeline usa `${{ github.sha }}` para:

- nombres de artefactos;
- deployment ID;
- evidencia operacional;
- rollback target;
- comentarios/transiciones Jira;
- rutas de archivo de auditoria.

El release genera digests SHA-256, SBOM y SLSA provenance. Esa combinacion identifica mejor un
deploy que incrementar la version de `package.json` en cada merge.

## 3. `APP_VERSION`

`src/app.module.ts` soporta:

```typescript
const runtimeEnvironment = process.env as Partial<Record<'APP_VERSION', string>>;

const version = runtimeEnvironment.APP_VERSION || 'local-dev';
```

Estado actual:

- el codigo puede incluir `APP_VERSION` en logging;
- los workflows identifican artefactos y deploys por `${{ github.sha }}`;
- no se encontro una inyeccion ejecutable de `APP_VERSION` en CDK/workflows.

Por tanto, la version de runtime no debe documentarse como implementada hasta agregar, por ejemplo,
en CDK:

```typescript
environment: {
  APP_VERSION: process.env.GITHUB_SHA ?? 'local-dev',
}
```

El cambio requiere test de configuracion y evidencia en logs/health sin exponer informacion
sensible.

## 4. Releases y Jira

`jira-release.yml` puede crear o actualizar una Fix Version desde un tag `v*` o ejecución manual.
Ese tag representa una release operativa; el deploy sigue ligado al SHA y al digest exactos.

Reglas:

- no reconstruir un artefacto para promoverlo;
- registrar SHA y digest en cada environment;
- rollback usa el ultimo artefacto conocido, no un build local;
- no depender solo de un tag mutable.

## 5. Paquetes de `vigilio-platform-actions`

Los paquetes compartidos si usan SemVer porque otros repos los consumen:

```text
@vigilioyonatan/devsecops-governance
@vigilioyonatan/devsecops-evidence
@vigilioyonatan/node-nest-tooling
@vigilioyonatan/vigilio-skills
```

El hub usa Changesets y `release-package.yml` para publicar, generar SBOM y attestations. Los
consumidores fijan versiones exactas y actualizan mediante PR.

## 6. Otros stacks

Patrones referenciales:

- Web/Vite: inyectar el SHA al bundle para Sentry/observabilidad.
- Expo/EAS: combinar version de tienda con commit/runtime version para OTA.
- Tauri: conservar version del instalador y commit de compilacion.

Estos patrones no afirman que `web-mfe`, `mobile-mfe` o `tauri-mfe` ya los implementen; deben
verificarse en cada repositorio.

## 7. Regla final

```text
aplicacion desplegada -> SHA + digest + provenance
paquete reutilizable  -> SemVer + Changesets + provenance
release de negocio    -> tag/Fix Version que referencia SHAs
```

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.

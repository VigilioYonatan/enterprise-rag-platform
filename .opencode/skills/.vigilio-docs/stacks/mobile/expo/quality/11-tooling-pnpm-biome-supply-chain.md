# Tooling, pnpm, Biome Y Supply Chain Mobile

## Versiones

`package.json` fija Node y `packageManager`; CI usa exactamente esas políticas. Expo packages se
alinean con `expo install --check`, no se actualizan a mano ignorando compatibilidad del SDK.

```bash
pnpm install --frozen-lockfile
pnpm expo:check
pnpm expo:doctor
```

## pnpm y registry

El lockfile se revisa como código. Paquetes privados usan token efímero de GitHub Packages; `.npmrc`
con token nunca entra al repo, artefacto o imagen. `--ignore-scripts` no se activa indiscriminadamente
si rompe toolchains; scripts permitidos se gobiernan explícitamente.

## Biome y TypeScript

Biome formatea/lint y TypeScript valida con strictness acordada. Pre-commit solo ejecuta checks rápidos
sobre staged files; pre-push y CI ejecutan el gate completo. Hooks locales ayudan, no son autoridad.

## Dependencias nativas

Una dependencia Expo/RN se evalúa por mantenimiento, permisos, soporte New Architecture, tamaño,
licencia, advisories y necesidad real. Agregar un config plugin es un cambio nativo: requiere Expo
Doctor, development build y matriz de dispositivos.

## Supply chain

- Dependency Review en PR.
- `pnpm audit --prod` como señal, con política ante indisponibilidad del registry.
- CodeQL/Semgrep y Gitleaks.
- Trivy filesystem/config.
- SBOM CycloneDX y attestation del export/build.
- Actions externas fijadas a SHA completo.

Un timeout del registry se reporta como inconcluso; no como “sin vulnerabilidades”. Excepciones de
licencia/CVE tienen owner, vencimiento y compensating control.

## Cachés

Cachear store pnpm, Jest, Metro y Expo con key de lockfile. No cachear secrets, outputs firmados ni
`node_modules` entre plataformas incompatibles. El cache acelera; el frozen lockfile conserva
determinismo.

## Gates

Biome, typecheck, tests/coverage, Expo checks, export budget, governance y SBOM. EAS solo corre después
de estos gates y desde una fuente aprobada.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Tooling, pnpm, Biome Y Supply Chain Mobile

✅ **Correcto:** Para **Tooling, pnpm, Biome Y Supply Chain Mobile**, comprobar contratos React Native, permisos de dispositivo y estados offline.

❌ **Incorrecto:** En **Tooling, pnpm, Biome Y Supply Chain Mobile**, suponer que los adaptadores web funcionan automáticamente en Expo.

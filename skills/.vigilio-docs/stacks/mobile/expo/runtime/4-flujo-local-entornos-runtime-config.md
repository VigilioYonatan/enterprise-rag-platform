# Flujo Local, Entornos Y Runtime Config Mobile

## Topología

La app se ejecuta en dispositivo/emulador y consume una URL alcanzable desde ese entorno. `localhost`
del teléfono no es el host del desarrollador. Para pruebas locales se usa una IP de red segura o un
túnel aprobado; nunca se desactiva TLS en producción.

## Configuración pública

Solo variables `EXPO_PUBLIC_*` pueden incorporarse al bundle, y por definición no son secretas:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.dev.example.com
EXPO_PUBLIC_STAGE=development
```

Zod valida URL HTTPS y enum de ambiente al iniciar. API keys privadas, tokens de firma, AWS y
credenciales de stores pertenecen a EAS/GitHub secrets o al backend.

## Inicio local

```bash
pnpm install --frozen-lockfile
pnpm expo:check
pnpm expo:doctor
pnpm dev
```

El desarrollador elige Expo Go solo si las dependencias nativas son compatibles; un development
build es la referencia cuando existen plugins o módulos nativos.

## Ambientes

| Perfil | Backend | Distribución | Canal |
|---|---|---|---|
| development | dev | interna/dev client | development |
| test | development o sandbox QA aprobado | interna | test |
| staging | staging | interna | staging |
| production | producción | stores | production |

Cada perfil tiene application ID/package, iconografía y endpoints inequívocos cuando el negocio lo
requiere. Ningún build de producción apunta a dev por fallback.

Los stages persistentes del backend son `development`, `staging` y `production`. `test` es un perfil
de build/QA, no una cuarta infraestructura. En EAS, `test` reutiliza `development`, `staging` usa
`preview` y `EXPO_PUBLIC_STAGE` conserva su valor exacto para channel, telemetría y variante.

## Runtime y OTA

`runtimeVersion` usa fingerprint para impedir que una actualización JS incompatible llegue a un
binario con módulos nativos distintos. Los canales no sustituyen autorización: staging y production
requieren environments protegidos. Un rollback OTA solo revierte JS/assets compatibles; un cambio
nativo exige otro binario.

## Matriz local

- Android emulador y al menos un dispositivo físico representativo.
- iOS simulador en macOS y dispositivo físico antes de release.
- red lenta/offline, background/foreground y permisos denegados.
- idioma, zona horaria, fuente grande y modo oscuro si están soportados.

## Gates

`lint`, `typecheck`, tests, coverage, Expo checks y export deben pasar antes de EAS. El `.env` real,
certificados y archivos de credenciales no se versionan.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Flujo Local, Entornos Y Runtime Config Mobile

✅ **Correcto:** Para **Flujo Local, Entornos Y Runtime Config Mobile**, separar configuración y secretos por ambiente, probar arranque y healthchecks.

❌ **Incorrecto:** En **Flujo Local, Entornos Y Runtime Config Mobile**, hardcodear secretos o prometer despliegue sin pruebas en runtime.

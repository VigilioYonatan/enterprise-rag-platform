# Estándar de Versionado de Repositorios, Pre-Releases (`0.1.0-beta`) y Publicación en GitHub — Nivel Senior/Staff

**Estado:** estándar canónico transversal de ingeniería y release. **Owner:** `standards/engineering/`.

El versionado de un repositorio comunica instantáneamente el **nivel de madurez real**, las **garantías de estabilidad** y el **camino de descarga** para cualquier usuario o integrador. Declarar una versión ambigua, desincronizada entre manifiestos o sin enlaces claros de descarga rompe la confianza del usuario desde el primer vistazo.

---

## 1. Ciclo de Vida SemVer 2.0.0 Honest-First

Todo proyecto sigue [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) (`MAJOR.MINOR.PATCH[-PRERELEASE]`) reflejando con honestidad su madurez operativa:

| Etapa | Formato Canónico | Cuándo Usarla | Checkbox en GitHub Releases |
| :--- | :--- | :--- | :---: |
| **Prototipo / Alpha** | `0.1.0-alpha.1` | Funcionalidades núcleo en construcción; el esquema de datos o UI puede cambiar entre commits. | ✅ *Set as a pre-release* |
| **Beta Pública / Preview** | `0.1.0-beta` (o `0.1.0-beta.1`) | Flujos principales completos de extremo a extremo (con capturas, seed y pruebas E2E verificadas), listo para evaluación y pruebas de usuarios, previo al cierre de auditorías de producción. | ✅ *Set as a pre-release* |
| **Release Candidate** | `0.1.0-rc.1` / `1.0.0-rc.1` | Feature-complete; solo se aceptan correcciones de bugs críticos y validaciones finales de infraestructura/DR. | ✅ *Set as a pre-release* |
| **General Availability (GA)** | `1.0.0` | Producción aprobada con todos los gates de seguridad, observabilidad, backups/PITR y contratos estables. | ❌ Release estable |

---

## 2. Single Source of Truth (SSOT) de la Versión en el Repositorio

**Prohibido** escribir `0.1.0-beta` únicamente como texto decorativo en el `README.md` dejando `"version": "0.0.1"` o `"1.0.0"` en el código. Al cortar o actualizar una versión, sincronizar atómicamente:

1. **`VERSION`** en la raíz del repositorio (ej. `0.1.0-beta\n`) para scripts de CI, Docker labels y tooling agnóstico de lenguaje.
2. **Manifiestos de paquetes / módulos**:
   - Node / TypeScript: `"version": "0.1.0-beta"` en cada `package.json` del workspace (`apps/*`, `packages/*`).
   - Rust / C++ / Python: `Cargo.toml`, `CMakeLists.txt` (`project(... VERSION ...)`), `pyproject.toml`.
3. **Especificación de API (`OpenAPI / Scalar`)**: `.setVersion('0.1.0-beta')` para que el portal interactivo `/reference` muestre exactamente la misma versión que el repositorio.
4. **`CHANGELOG.md`** en la raíz siguiendo *Keep a Changelog*, redactado en lenguaje claro orientado al usuario con fecha ISO (`## [0.1.0-beta] - YYYY-MM-DD`) e instrucciones directas de descarga.
5. **Tag Anotado de Git**:
   ```bash
   git tag -a v0.1.0-beta -m "NombreProyecto v0.1.0-beta — First Public Beta Preview"
   git push origin v0.1.0-beta
   ```

---

## 3. Presentación en GitHub: "About" Description, Badges y Descarga Directa

Cuando un usuario entra a GitHub, toma tres decisiones en menos de 15 segundos: **¿Qué hace esto?**, **¿En qué versión está?** y **¿Cómo lo descargo y pruebo ahora mismo?**

### 3.1. Configuración de la Barra Lateral "About" de GitHub

Documentar siempre (ej. en `docs/GITHUB_RELEASE_<version>.md` o automatizado vía `gh repo edit`) la descripción corta (`<= 160` caracteres) libre de jerga críptica e incluyendo el estado/versión cuando está en Beta:

```text
Self-hosted AI assistants & visual workflows with human approvals, private document search, and Dark/Light UI (v0.1.0-beta).
```

### 3.2. Badges de Versión + Botón de Descarga en el Hero del `README.md`

Inspirado en repositorios de referencia de producto (*Craft Anything*, *Twenty*), el Hero centrado del `README.md` debe mostrar explícitamente:
- Un badge de **versión exacta** (`version | 0.1.0-beta`).
- Un badge de **estado claro** (`status | public beta` en ámbar o `stable` en esmeralda).
- Un **botón principal de descarga (`DOWNLOAD v0.1.0-beta`)** y una fila de enlaces directos (`Download 0.1.0-beta · Release Notes · Quick Start`).

```markdown
  <p>
    <img src="https://img.shields.io/badge/version-0.1.0--beta-2563EB?style=flat-square" alt="Version 0.1.0-beta" />
    <img src="https://img.shields.io/badge/status-public_beta-F59E0B?style=flat-square" alt="Status Public Beta" />
    <img src="https://img.shields.io/badge/privacy-100%25_Self--Hosted-10B981?style=flat-square" alt="100% Self-Hosted" />
  </p>

  <p>
    <a href="#download--get-started"><img src="https://img.shields.io/badge/DOWNLOAD_v0.1.0--beta-09090B?style=for-the-badge&logo=github&logoColor=white" alt="Download v0.1.0-beta" /></a>
    <a href="#see-how-it-works"><img src="https://img.shields.io/badge/WATCH_QUICK_DEMOS-2563EB?style=for-the-badge&logo=youtube&logoColor=white" alt="Watch Quick Demos" /></a>
  </p>

  <p>
    <a href="#download--get-started"><b>Download AgentOps 0.1.0-beta</b></a> ·
    <a href="CHANGELOG.md">Release Notes</a>
  </p>
```

> [!TIP]
> **Escapado de guiones en Shields.io:** En URLs estáticas de `img.shields.io`, el guion simple separa etiqueta/mensaje/color. Para mostrar `0.1.0-beta` o `Self-Hosted`, escribe **doble guion (`--`)**: `0.1.0--beta`, `Self--Hosted`.

### 3.3. Sección Dedicada "Download & Get Started" para Cualquier Usuario

Ofrecer siempre **dos vías simples** sin asumir que el lector domina Git avanzado:
1. **Descarga directa desde GitHub Releases / ZIP** (`Releases → v0.1.0-beta` o `Code → Download ZIP`).
2. **Clonado exacto del tag** (`git clone --branch v0.1.0-beta <repository-url>`).

---

## 4. ✅ Correcto vs ❌ Incorrecto

| Criterio | ✅ Correcto (Senior Mode) | ❌ Incorrecto (Anti-Patrón) |
| :--- | :--- | :--- |
| **Consistencia de versión** | `VERSION`, `package.json`, `openapi.bootstrap.ts`, `CHANGELOG.md` y el badge del `README.md` marcan todos `0.1.0-beta`. | El `README.md` dice `Beta`, `package.json` dice `0.0.1` y OpenAPI dice `1.0.0`. |
| **Honestidad de madurez** | Publicar `0.1.0-beta` con checkbox *pre-release* cuando el producto funciona E2E en local pero aún tiene gates de producción pendientes. | Etiquetar `v1.0.0 Production Ready` sin haber ejecutado pruebas reales de restore/DR o supply chain. |
| **Experiencia de descarga** | Botón visible `DOWNLOAD v0.1.0-beta` en el Hero + pasos de descarga ZIP y `git clone --branch v0.1.0-beta` + `CHANGELOG.md` legible por humanos. | Obligar al usuario a buscar entre ramas o commits sin explicar qué versión descargar ni cómo arrancarla. |
| **Formato de badge Shields.io** | `badge/version-0.1.0--beta-2563EB` (doble guion `--` para escapar el guion de `-beta`). | `badge/version-0.1.0-beta-2563EB` (rompe el renderizado del badge en GitHub). |

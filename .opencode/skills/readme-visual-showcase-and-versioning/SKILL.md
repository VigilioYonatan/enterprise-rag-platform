---
name: readme-visual-showcase-and-versioning
description: SuperSkill Senior Mode para crear READMEs visuales estilo Craft Anything / Twenty / NestJS aptos para cualquier usuario, automatizar capturas Retina 2x y videos cortos (.gif + .webm) con Playwright/Puppeteer headless + Super Seeder, diseñar logos SVG Dark/Light (<picture>), auditar frame a frame cada imagen/video y gobernar el versionado SemVer (ej. 0.1.0-beta, CHANGELOG y descarga en GitHub).
owner: governance-platform
lifecycle: stable
introduced_in: 0.9.0
routing_ecosystems: "cross-stack"
routing_keywords: "readme, showcase, screenshots, screenshot, captura, capturas, imagen, imagenes, video, videos, gif, playwright, puppeteer, headless, logo, dark-mode, light-mode, version, versioning, versionado, semver, beta, release, changelog, github-release, descarga, download"
routing_files: "README.md, CHANGELOG.md, VERSION, package.json"
routing_capabilities: "documentation, showcase, release, governance"
requires: []
optional: ["repository-readme-architecture"]
conflicts: []
supersedes: []
---

# readme-visual-showcase-and-versioning — SuperSkill Senior Mode

> **Fuentes Canónicas Obligatorias:**
> - [Playbook de Capturas Headless, Videos Cortos y Auditoría Visual](../.vigilio-docs/playbooks/readme-headless-showcase-and-visual-qa.md)
> - [Estándar de Versionado de Repositorios y Pre-Releases (`0.1.0-beta`)](../.vigilio-docs/standards/engineering/repository-versioning-and-releases.md)
> - [Estándar de Documentación de Repositorios (`README.md`)](../.vigilio-docs/standards/engineering/readme-standard.md)

## Propósito y Cuándo Activar Esta SuperSkill

Activar cuando el usuario pida cualquiera de estos escenarios:
1. Crear o modernizar un **`README.md` visual de alto impacto** (estilo *Craft Anything*, *Twenty* o *NestJS*) comprensible por **cualquier usuario** sin saturarlo de jerga técnica interna.
2. Tomar **capturas reales (`2x Retina`)** y grabar **videos cortos demostrativos (`.gif` + `.webm`)** de cómo usar la aplicación usando **Playwright o Puppeteer headless** sobre datos poblados por un **Super Seeder**.
3. Adaptar el **logo oficial del proyecto a Modo Claro y Modo Oscuro** (`docs/assets/logo-light.svg`, `docs/assets/logo-dark.svg`, `<picture>` en GitHub e icono adaptable en la propia web).
4. Configurar o actualizar el **versionado del repositorio** (ej. `0.1.0-beta`), descripción "About" de GitHub, badges de versión/estado, `CHANGELOG.md`, `VERSION` y enlaces directos de descarga.

---

## Reglas Innegociables de Ejecución Senior Mode

1. **Lenguaje Humano para Cualquier Usuario en el `README.md` Principal**:
   - La narrativa principal del `README.md` (Hero, pitch, títulos, recorridos en video, galería de pantallas, descarga y preguntas frecuentes) debe escribirse en **lenguaje claro, natural y orientado a beneficios**, entendible por cualquier persona sin conocimientos internos del código.
   - **Prohibido** meter jerga críptica de implementación (`MATERIALIZED CTE`, `TOCTOU`, `ts_rank_cd`, `RS256 JWKS`, scripts internos de auditoría) en las descripciones de producto o pies de foto. Los comandos avanzados de desarrollo/contribución se agrupan limpiamente dentro de un bloque desplegable `<details>` al final o en `architecture/`.

2. **Super Seeder Limpio Antes de Fotografiar o Grabar**:
   - **Prohibido** capturar pantallas vacías (`Empty state`) o con registros basura de pruebas previas (`Test 1234`, `Draft QA`).
   - Truncar restos de pruebas, ejecutar `db:seed` con datos realistas y completos, y **restaurar automáticamente el seed determinista** al terminar el script de grabación.

3. **Auditoría Visual Obligatoria Frame-a-Frame y Coherencia 100% con la Descripción**:
   - **Jamás** insertar una imagen `.png` o animación `.gif`/`.webm` en el `README.md` sin abrirla y revisarla visualmente (incluyendo una lámina de contacto con todos los frames de cada GIF).
   - Verificar cero rutas `404`, cero paneles vacíos, cero cortes por falta de scroll, contraste impecable en Dark y Light Mode, y que **la descripción escrita debajo de cada imagen o video coincida al 100% con lo que realmente aparece y ocurre en pantalla**.

4. **Single Source of Truth en Versionado (`0.1.0-beta`) y Descarga Directa**:
   - Sincronizar la misma versión (`0.1.0-beta`) en `VERSION`, `CHANGELOG.md`, todos los `package.json` / manifiestos y OpenAPI (`setVersion`).
   - Incluir en el Hero del `README.md` el badge de versión (`0.1.0--beta` con doble guion en Shields.io), el botón CTA de descarga (`DOWNLOAD v0.1.0-beta`) y los pasos simples de descarga (ZIP de GitHub Releases o `git clone --branch v0.1.0-beta`).

5. **Verificación Obligatoria de Enlaces e Imágenes con `curl` (`Zero Broken Links / Images`)**:
   - Todo enlace HTTP/HTTPS, badge de Shields.io, recurso de imagen, video o enlace de descarga en cualquier archivo Markdown (`.md`) DEBE pasar validación activa con `curl.exe -I -s -f -L` comprobando respuesta HTTP 200 (con fallback a `GET --range 0-1024` para CDNs).
   - Todo asset local debe comprobarse en disco garantizando existencia física (`missing = 0`) y contenido no vacío (`st_size > 0`).
   - Prohibido en Senior Mode commitear o publicar documentación con enlaces o imágenes rotas o no probadas activamente.

---

## Lectura Obligatoria de Referencias

Leer completas las tres guías de referencia de esta skill antes de ejecutar:

- Leer [headless-capture-and-gif-pipeline.md](references/headless-capture-and-gif-pipeline.md) — Arquitectura exacta del script Playwright/Puppeteer headless (`2x Retina`, cursor visual flotante, `.webm` + codificador Python Pillow `.gif`, Super Seeder y logos SVG Dark/Light).
- Leer [visual-verification-and-human-copywriting.md](references/visual-verification-and-human-copywriting.md) — Auditoría frame-a-frame mediante contact sheets, correspondencia 1:1 imagen-descripción y plantilla de `README.md` en lenguaje humano con `<details>` para desarrolladores.
- Leer [repository-versioning-and-releases.md](references/repository-versioning-and-releases.md) — Buenas prácticas SemVer (`0.1.0-beta`), `VERSION` + `CHANGELOG.md`, descripción "About" de GitHub y experiencia de descarga.

---

## Resumen Correcto / Incorrecto

- ✅ **Correcto**: Levantar el stack real con Super Seeder limpio, grabar GIFs/WebMs con cursor visual, revisar cada PNG y cada frame de GIF antes de publicarlos, redactar descripciones humanas que cuenten exactamente lo que se ve en pantalla y alinear `0.1.0-beta` en todos los manifiestos + botón de descarga.
- ❌ **Incorrecto**: Asumir que un script headless capturó bien sin abrir las imágenes, dejar un `404` o panel cortado en el README, llenar los pies de foto de siglas internas incomprensibles para un usuario normal, o poner `0.1.0-beta` solo en texto sin actualizar `package.json` ni `CHANGELOG.md`.

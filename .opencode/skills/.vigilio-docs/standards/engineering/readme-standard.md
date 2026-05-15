# Estándar de Documentación de Repositorios (README.md) — Nivel Senior/Staff

**Estado:** estándar canónico transversal de ingeniería. **Owner:** `standards/engineering/`.

El `README.md` no es una formalidad burocrática ni un adorno opcional que se escribe al final del proyecto. **Es el mapa de arquitectura y la guía de supervivencia del repositorio**. Un buen `README` garantiza que cualquier nuevo desarrollador, evaluador o agente de IA pueda clonar el repositorio, configurar el entorno y estar corriendo el proyecto en **menos de 10 minutos**.

---

## 1. Principios de Senior Mode para READMEs

1. **Objetivo < 10 Minutos (Fast Onboarding)**: El apartado *Quick Start* debe ser ejecutable paso a paso, sin asumir herramientas ocultas ni pasos no documentados.
2. **Cero Secretos Hardcodeados**: Ninguna clave de API, contraseña o cadena de conexión vive en el README ni en el repositorio. Todo se documenta a través de tablas de variables de entorno y archivos `.env.example`.
3. **Claridad en la Propiedad de Contratos (ADR 0001)**:
   - **Backend TypeScript/NestJS**: Documentar que los contratos se definen en `src/` y se generan mediante `vigilio-node generate-contracts`.
   - **Backend No-TS / API Externa**: Indicar expresamente que los DTOs e interfaces son locales del consumidor o generados desde OpenAPI.
4. **Cero Versiones Hardcodeadas (Single Source of Truth para Versiones)**:
   - **PROHIBIDO** inventar o duplicar números de versiones estáticas en el README que queden desfasados del código real.
   - La versión de Node.js y pnpm debe referenciar `package.json` (`"engines"`, `"packageManager"`) o `.nvmrc` / `.node-version`.
   - Las versiones de bases de datos y colas deben referenciarse a `docker-compose.yml`.
   - La política y matriz de versiones global está centralizada en [technology/versions.md](../../technology/versions.md) y en las políticas de plataforma (`policies/platform/node-backend-2026.json`).
5. **Verificación Antes del Despliegue**: Todo README debe declarar los comandos de testing unitario, integración, E2E y linters.
6. **Lenguaje Humano para Cualquier Usuario en `README.md` Raíz de Producto**:
   - Cuando el `README.md` raíz presenta una aplicación o plataforma completa (estilo *Craft Anything* o *Twenty*), la narrativa principal (Hero, propuesta de valor, recorridos en video, galería de pantallas, descarga e inicio rápido) debe escribirse en **lenguaje natural, claro y libre de jerga críptica de ingeniería** (`MATERIALIZED CTE`, `TOCTOU`, `ts_rank_cd`, `RS256 JWKS`), para que cualquier persona entienda qué hace el producto y cómo descargarlo/usarlo en minutos.
   - Los detalles técnicos profundos y suites de desarrollo para contribuidores se agrupan en un bloque desplegable `<details>` al final o en `architecture/`.
7. **Auditoría Visual Frame a Frame (`1:1` Imagen/Video ↔ Descripción)**:
   - Toda captura (`2x Retina PNG`) y video corto (`.gif` + `.webm`) generado con Playwright o Puppeteer headless sobre un **Super Seeder** debe ser **inspeccionado visualmente imagen por imagen y fotograma por fotograma** antes de escribir su descripción.
   - **Prohibido** describir pantallas que no aparecen en la captura o inventar pasos que el video no graba. Ver el [Playbook de Capturas Headless, Videos Cortos y Auditoría Visual](../../playbooks/readme-headless-showcase-and-visual-qa.md).
8. **Versionado Semántico Alineado (`VERSION` + `CHANGELOG.md` + Descarga Directa)**:
   - Mostrar la versión oficial vigente (ej. `0.1.0-beta`, escapando guiones como `0.1.0--beta` en badges estáticos de Shields.io), enlazar a `CHANGELOG.md` e incluir botones directos de descarga (`releases/tag/vX.Y.Z-beta` y ZIP) junto con la descripción corta "About" de GitHub (`<= 160` caracteres). Ver el [Estándar de Versionado de Repositorios y Releases](repository-versioning-and-releases.md).
9. **Verificación Obligatoria de Enlaces e Imágenes con `curl` (`Zero Broken Links / Images` en Modo Senior)**:
   - **Regla innegociable**: Todo enlace web externo (`https://...`), badge de Shields.io, enlace a releases/descargas y recurso multimedia (imágenes `.png`/`.svg`, GIFs `.gif`, videos `.webm`) referenciado en cualquier archivo Markdown (`.md`) DEBE ser validado activamente antes de cualquier commit o release.
   - **Protocolo de verificación para URLs remotas**: Ejecutar `curl -I -s -f -L "<URL>"` (o fallback a `GET --range 0-1024` para CDNs que restrinjan HEAD). Si cualquier badge o URL remota devuelve HTTP 404, 500, error de red o timeout, el gate de calidad falla de inmediato (`FAIL`).
   - **Protocolo de verificación para recursos locales**: Comprobar en disco la existencia física (`stat`), tamaño estrictamente mayor a cero (`bytes > 0`), extensión válida y coincidencia exacta de ruta.
   - **Prohibido en Senior Mode**: Commitear o publicar `.md` con URLs de badges mal formadas (por ejemplo guiones no escapados en Shields.io que devuelvan 400/404), enlaces externos rotos o rutas relativas inexistentes. Cada repositorio debe contar con un script automatizado ejecutable en CI/CD y localmente (ej. `python scripts/verify_readme_assets.py`).

---

## 2. Anatomía Canónica y Diseño Visual Flagship (Estilo NestJS / Twenty / Craft Anything)

Un `README.md` de nivel Senior/Staff combina **presentación visual tecnológica de primer nivel** (Hero centrado, logos adaptables a modo oscuro/claro, badges con iconos de marca, captura principal del producto con pie de foto y alertas nativas de GitHub) con **rigor técnico ejecutable** (Quick Start < 10 min, arquitectura Mermaid, variables de entorno y pruebas).

### 2.1. Estructura del Hero Visual (`<div align="center">`)

1. **Wordmark / Icono Centrado (`<picture>`)**: Usa `<picture>` con `prefers-color-scheme: dark` y `light` para que el logo luzca impecable tanto en el tema oscuro como claro de GitHub.
2. **Título `<h1>` + Barra de Navegación / Idiomas**: Enlaces rápidos separados por punto medio (`Quick Start · Arquitectura · API & Contratos · Testing · Seguridad`).
3. **Propuesta de Valor en 2 Niveles**:
   - Primera línea en **negrita** (`<p><b>...</b></p>`) resumiendo la potencia del producto.
   - Segunda línea explicando cómo funciona de extremo a extremo.
4. **Fila de Badges Tecnológicos (`shields.io` con `logo=`)**: Lenguaje principal, frameworks, base de datos, licencia y estado.
5. **Botón CTA Principal (`style=for-the-badge`)** + enlaces secundarios clave.
6. **Showcase Visual (Screenshot / GIF en modo oscuro) + Pie de Foto (`<sub>`)**: Imagen a ancho completo mostrando la interfaz real o terminal en acción, seguida de un callout `> [!NOTE]`.

```markdown
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.svg" />
    <img alt="Logo" src="docs/assets/logo.png" width="110" />
  </picture>

  <h1>[Nombre del Proyecto]</h1>

  <p>
    <a href="#1-características-principales-features">Features</a> ·
    <a href="#2-stack-tecnológico-tech-stack">Tech Stack</a> ·
    <a href="#3-inicio-rápido-quick-start--10-min">Quick Start</a> ·
    <a href="#5-arquitectura-y-flujo-de-datos">Arquitectura</a> ·
    <a href="#8-calidad-y-pruebas-testing">Testing</a>
  </p>

  <p><b>[Pitch de 1 línea en negrita explicando qué hace el sistema y su ventaja técnica clave.]</b></p>
  <p>[Subtítulo de 1–2 líneas explicando el flujo real: desde la interfaz y validación de contratos hasta la ejecución transaccional.]</p>

  <p>
    <img src="https://img.shields.io/badge/100%25-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Backend-NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS" />
    <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
    <img src="https://img.shields.io/badge/license-Proprietary%20%2F%20MIT-10B981?style=flat-square" alt="License" />
  </p>

  <img src="docs/assets/hero-preview.png" alt="Product Preview" width="100%" />
  <p><sub>[Descripción breve de lo que muestra la captura: flujos verificados, métricas en tiempo real y control de aprobaciones.]</sub></p>
</div>

> [!NOTE]
> **[Resumen de Arquitectura]:** Explicación breve del estándar de ingeniería aplicado en el repositorio (Clean Architecture, DDD, Contratos SSOT y pruebas E2E verificadas).
```

### 2.2. Orden de Secciones Técnicas

Todo repositorio en VIGILIO debe estructurar el cuerpo de su `README.md` siguiendo este orden:

```markdown
# [Nombre del Proyecto] — [Pitch / Propósito en 1 Línea]

[Breve párrafo descriptivo explicando qué problema resuelve el proyecto y su valor de negocio].

## 1. Características Principales (Features)
- **Feature A**: Descripción clara y orientada a valor.
- **Feature B**: Descripción técnica/funcional.

## 2. Stack Tecnológico (Tech Stack)
- **Runtime / Lenguaje**: Node.js (fijado en `package.json#engines`), TypeScript
- **Framework**: NestJS (Fastify) en Backend / React o Preact (Vite) en Frontend
- **Base de Datos & Caché**: PostgreSQL / Valkey (imágenes fijadas en `docker-compose.yml`)
- **Tooling & Linter**: Biome, pnpm (fijado en `package.json#packageManager`), Vitest, Playwright
- **CI/CD & Cloud**: GitHub Actions, Docker, AWS EKS / S3 + CloudFront
- **Línea Canónica de Versiones**: Verificada en [vigilio-docs/technology/versions.md](../../technology/versions.md)

## 3. Inicio Rápido (Quick Start < 10 min)
### Prerrequisitos
- Node.js: Versión fijada en `package.json` (`"engines"`) o `.nvmrc`
- pnpm: Versión fijada en `package.json` (`"packageManager"`)
- Docker Desktop / Podman en ejecución (servicios en `docker-compose.yml`)

### Instalación y Configuración
1. Clonar el repositorio:
   ```bash
   git clone <repo-url> && cd <repo-dir>
   ```
2. Instalar dependencias:
   ```bash
   pnpm install
   ```
3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Editar .env con tus valores locales
   ```
4. Levantar servicios locales (Docker):
   ```bash
   docker compose up -d
   ```
5. Iniciar en desarrollo:
   ```bash
   pnpm run dev # o pnpm run start:dev
   ```

## 4. Estructura del Repositorio (Repository Structure)
Árbol anotado explicando la responsabilidad de cada directorio principal.

## 5. Arquitectura y Flujo de Datos
Explicación o diagrama Mermaid de Clean Architecture, DDD o Microfrontends.

## 6. Contratos y API Endpoints
Tabla de endpoints y ejemplo de request/response con schemas Zod y tree-shaking por subpath.

## 7. Variables de Entorno (Environment Variables)
Tabla detallando nombre, descripción, obligatoriedad y si es secreta.

## 8. Calidad y Pruebas (Testing)
Comandos para unitarios, integración, E2E y cobertura.

## 9. CI/CD y Flujo de Ramas
Gobernanza de Pull Requests, Conventional Commits y pipelines automáticos.

## 10. Checklist del Desarrollador y Errores Comunes
Lista de comprobación rápida para evitar problemas frecuentes.
```

---

## 3. Ejemplo Real: Backend NestJS (`bus-impl`)

```markdown
# Bus Implementation API — Core de Pagos y Emisión

Microservicio backend de alta concurrencia encargado del procesamiento de órdenes, validación de clientes y emisión de pólizas de seguros.

## Stack Tecnológico
- **Runtime**: Node.js (fijado en `package.json#engines`) + TypeScript
- **Framework**: NestJS + Clean Architecture & DDD
- **Persistencia**: PostgreSQL + Drizzle ORM (imagen fijada en `docker-compose.yml`)
- **Colas Asíncronas**: BullMQ + Valkey (Redis)
- **Contratos**: Schemas Zod generados automáticamente con `vigilio-node generate-contracts`
- **Testing**: Vitest (Unitarios/Integración) + Playwright API
- **Baseline de Versiones**: [technology/versions.md](../../technology/versions.md)

## Quick Start (< 10 min)
1. **Requisitos**: Node.js (ver `package.json#engines`), pnpm (ver `package.json#packageManager`), Docker.
2. **Instalar**: `pnpm install`
3. **Variables**: `cp .env.example .env`
4. **Base de datos local**: `docker compose up -d postgres redis`
5. **Migraciones**: `pnpm run db:migrate`
6. **Ejecutar**: `pnpm run start:dev`

## Flujo de Contratos (ADR 0001)
Este microservicio es el **propietario único** de los contratos. Los DTOs se definen en `src/**/presentation/http/dto/` y se compilan automáticamente para el frontend con soporte estricto de **Tree-Shaking**:
```bash
pnpm run build:contracts
```
El paquete resultante publica subpaths específicos por servicio (ej. `@empresa/orders-contracts/ecommerce-bus-impl`) con `"sideEffects": false` en `package.json`, asegurando que el frontend solo empaquete los DTOs y schemas que realmente consume.

## Variables de Entorno
| Variable | Descripción | Requerida | Secreta |
|---|---|:---:|:---:|
| `PORT` | Puerto de escucha HTTP (default: 3000) | No | No |
| `DATABASE_URL` | Conexión PostgreSQL (`postgres://...`) | Sí | Sí |
| `REDIS_URL` | Conexión Valkey/Redis para BullMQ | Sí | Sí |
| `JWT_SECRET` | Clave de firmado de tokens | Sí | Sí |

## Testing y Gobernanza
```bash
# Tests unitarios
pnpm run test:unit

# Tests de integración con base de datos
pnpm run test:integration

# Verificación de gobernanza y dependencias
pnpm run test:devsecops
```
```

---

## 4. Ejemplo Real: Frontend Web MFE (`web-mfe`)

```markdown
# Backoffice Salud — Web Microfrontend

Portal web responsive para la administración y suscripción de pólizas de salud, integrado mediante arquitectura de microfrontends.

## Stack Tecnológico
- **UI Framework**: Preact / React + Vite (fijados en `package.json` y `pnpm-lock.yaml`)
- **Estilos**: Tailwind CSS + Radix UI
- **Estado & Datos**: TanStack Query + Preact Signals
- **Contratos**: Consumo de `@empresa/orders-contracts/ecommerce-bus-impl` (Tree-Shaking)
- **Testing**: Vitest + Testing Library + Playwright E2E

## Quick Start
1. `pnpm install`
2. `cp .env.example .env`
3. `pnpm run dev` (abre en `http://localhost:5173`)

## Consumo de Contratos
Este frontend **NO declara DTOs locales manuales**. Importa los schemas directamente del subpath exportado del microservicio backend, beneficiándose de **Tree-Shaking** para minimizar los bundles de JavaScript:
```typescript
import { productResponseSchema, type ProductResponseDto } from '@empresa/orders-contracts/ecommerce-bus-impl';
```
> **Beneficio de Rendimiento Senior**: Al importar desde el subpath específico y contar con `"sideEffects": false`, el bundler (Vite) descarta schemas no utilizados de otros microservicios (billing, auth, reporting), reduciendo drásticamente el consumo de CPU y memoria en el navegador del cliente.
>
> **Nota Senior Mode**: Si el backend fuera externo o no estuviera en TypeScript, los contratos se definen como interfaces locales en `src/types/` o se generan vía cliente OpenAPI.

## Testing E2E y Visual
```bash
# Tests unitarios
pnpm run test

# Pruebas End-to-End con navegador real
pnpm run test:e2e
```
```

---

## 4.1. Ejemplo Real de Producto Completo para Cualquier Usuario (`AgentOps 0.1.0-beta`)

Cuando el repositorio entrega una aplicación completa lista para descargar y probar, el `README.md` raíz aplica **lenguaje 100% humano**, **logo adaptable Dark/Light**, **badges `0.1.0-beta` + botón de descarga**, **videos cortos `.gif`/`.webm` grabados en vivo con Playwright** y **descripciones auditadas fotograma por fotograma**:

```markdown
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.svg" />
    <img alt="AgentOps Logo" src="docs/assets/logo-light.png" width="96" height="96" />
  </picture>

  <h1>AgentOps</h1>

  <p><b>Build, connect, and supervise AI agents for your team — with human approvals, private company knowledge, and clear cost control.</b></p>

  <p>
    <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/version-0.1.0--beta-2563EB?style=flat-square" alt="Version 0.1.0-beta" /></a>
    <img src="https://img.shields.io/badge/status-public%20beta-F59E0B?style=flat-square" alt="Status Public Beta" />
    <img src="https://img.shields.io/badge/Docker-One--Command%20Start-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Ready" />
  </p>

  <p>
    <a href="#download--run-in-2-minutes">
      <img src="https://img.shields.io/badge/DOWNLOAD%20v0.1.0--beta-18181B?style=for-the-badge&logo=github&logoColor=white" alt="Download v0.1.0-beta" />
    </a>
  </p>

  <img src="docs/assets/screenshots/01-hero-workflow-dag.png" alt="AgentOps Visual Workflow Builder" width="100%" />
  <p><sub>The visual workflow studio in dark mode: connect an Incident Classifier Agent, a Human Approval step, and a Jira Cloud Action on one canvas.</sub></p>
</div>
```

> Ver implementación completa y scripts reproducibles en el [Playbook de Capturas Headless y Auditoría Visual](../../playbooks/readme-headless-showcase-and-visual-qa.md) y en el [Estándar de Versionado de Repositorios (`0.1.0-beta`)](repository-versioning-and-releases.md).

---

## 5. Errores Comunes que Rompen el Onboarding (Common Pitfalls)

| Error Común | Impacto | Solución Senior Mode |
|---|---|---|
| **Hardcodear credenciales en código** | Fuga de seguridad grave | Usar variables de entorno en `.env.example` y gitignorar `.env`. |
| **Hardcodear versiones de herramientas** | Documentación desfasada y drift | Referenciar `package.json` (`engines`, `packageManager`), `docker-compose.yml` y `technology/versions.md`. |
| **Llenar un README de usuario con jerga interna** | Usuarios no técnicos abandonan el repo | Redactar beneficios y pasos en lenguaje humano claro; mover comandos internos de desarrollo a `<details>`. |
| **Capturas vacías o pies de foto que no coinciden** | Pérdida inmediata de credibilidad | Poblar con Super Seeder, capturar con Playwright `2x` e inspeccionar cada PNG y cada frame de GIF antes de describirlo. |
| **Omitir el paso a paso de arranque o descarga** | Usuarios y devs bloqueados | Incluir botón de descarga (`0.1.0-beta` Release/ZIP) y *Quick Start* probado desde cero. |
| **No explicar la estructura de carpetas** | Archivos colocados en lugares erróneos | Árbol anotado en la sección *Repository Structure* (o en `<details>` para desarrolladores). |
| **Falta de tests o comandos rotos** | Código que falla en producción | Comandos exactos de `test:unit` y `test:e2e` documentados. |
| **Enlaces o imágenes rotas en el Markdown** | 404 en imágenes o badges caídos | Validar con `curl -I -s -f -L` (HTTP 200) y `stat > 0` en disco mediante `verify_readme_assets.py`. |
| **Versionado inexistente o inconsistente** | Pérdida de trazabilidad | Alinear `VERSION`, `package.json`, OpenAPI y `CHANGELOG.md` bajo SemVer (ej. `0.1.0-beta`). |

---

## 6. ✅ Correcto / ❌ Incorrecto — Criterio Verificable

- ✅ **Correcto**: Abrir con un **Hero visual centrado (`<div align="center">`)** estilo *NestJS / Twenty / Craft Anything* (logo adaptable dark/light con `<picture>`, enlaces rápidos, propuesta de valor en lenguaje claro, badge de versión vigente como `0.1.0-beta`, botón de descarga, capturas `2x` y videos cortos `.gif`/`.webm` verificados frame a frame con su pie de foto exacto), seguido de arranque rápido en minutos y bloque para desarrolladores sin secretos hardcodeados.
- ❌ **Incorrecto**: Entregar un `README.md` plano o saturado de jerga críptica interna, con capturas de tablas vacías (`0 rows`), videos cuyo pie de foto inventa acciones que no ocurren en pantalla, versiones desalineadas o credenciales reales hardcodeadas.


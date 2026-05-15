# Buenas Prácticas al Versionar un Repositorio (`0.1.0-beta`, GitHub Metadata y Descargas)

Guía práctica alineada con [repository-versioning-and-releases.md](../../.vigilio-docs/standards/engineering/repository-versioning-and-releases.md).

---

## 1. Checklist de Archivos al Definir o Actualizar la Versión (ej. `0.1.0-beta`)

Siempre que el usuario indique la versión actual del proyecto (como `0.1.0-beta`, `0.2.0-rc.1` o `1.0.0`), actualizar de forma sincronizada:

- [ ] **`VERSION`** en la raíz del repositorio (`0.1.0-beta`).
- [ ] **`CHANGELOG.md`** en la raíz con sección `## [0.1.0-beta] - YYYY-MM-DD`, resumen claro de novedades para usuarios e instrucciones de descarga.
- [ ] **Todos los manifiestos de paquetes** (`apps/*/package.json`, `packages/*/package.json`, `Cargo.toml`, `pyproject.toml`, etc.).
- [ ] **Versión del documento OpenAPI / Scalar** (ej. `.setVersion('0.1.0-beta')` en `openapi.bootstrap.ts`).
- [ ] **Hero y sección de Descarga en `README.md`**:
  - Badge de versión con doble guion en Shields.io: `https://img.shields.io/badge/version-0.1.0--beta-2563EB?style=flat-square`.
  - Badge de etapa: `https://img.shields.io/badge/status-public_beta-F59E0B?style=flat-square`.
  - Botón CTA `DOWNLOAD v0.1.0-beta` y enlaces rápidos a `CHANGELOG.md` y guía de release.
- [ ] **Guía / Metadatos para GitHub (`docs/GITHUB_RELEASE_<version>.md`)**:
  - Texto exacto para el campo **About / Description** de GitHub (`<= 160` caracteres, claro para cualquier visitante e indicando `(v0.1.0-beta)`).
  - Lista de **Topics** recomendados para descubrimiento en GitHub.
  - Comandos para crear y subir el tag anotado (`git tag -a v0.1.0-beta -m "..." && git push origin v0.1.0-beta`).
  - Notas de release listas para pegar en **GitHub Releases** indicando marcar ✅ *Set as a pre-release* cuando el sufijo sea `-alpha`, `-beta` o `-rc`.

---

## 2. Ejemplo Real Listo para Reutilizar (`0.1.0-beta`)

### Descripción "About" del Repositorio en GitHub
```text
Self-hosted AI assistants & visual workflows with human approvals, private document search, and Dark/Light UI (v0.1.0-beta).
```

### Sección de Descarga Clara para Cualquier Usuario en `README.md`
```markdown
## Download & Get Started

**Current Version:** `0.1.0-beta` ([Read the Changelog](CHANGELOG.md))

### Step 1 — Download `0.1.0-beta`
- **Option A — Download from GitHub:** Open **Releases** on the right side of this page and download **`v0.1.0-beta`** (`.zip` or `.tar.gz`), or click **Code → Download ZIP**.
- **Option B — Clone with Git:**
  ```bash
  git clone --branch v0.1.0-beta <repository-url>
  cd <repository-folder>
  ```
```

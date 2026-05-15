# Cargo Workspaces, versiones y dependencias reproducibles

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Diseñar proyectos de uno o varios crates, fijar dependencias y evitar artefactos GB dentro de distribuciones.

## Política y decisiones de diseño

1. Elegir workspace si varias aplicaciones o bibliotecas comparten código y políticas. Declarar `[workspace]`, `members`, `resolver = "3"` únicamente cuando el toolchain fijado lo soporte.
2. Un `Cargo.lock` de aplicación/workspace debe versionarse; una librería puede publicarse sin hacer del lockfile una API. El lockfile jamás reemplaza una política de actualización.
3. Para monorepos, `apps/*` y `crates/*` son convenciones, no obligaciones; tests por paquete y suite E2E como miembro explícito.
4. Excluir `target/` del ZIP de fuentes y `.git`; medir cachés, símbolos debug e incremental antes de “optimizar”.

## Ejemplo técnico específico — Workspace reproducible

```toml
[workspace]
members = ["apps/desktop", "apps/cli", "crates/vigilio-core"]
resolver = "3" # Confirmar edición y MSRV de todos los miembros.

[workspace.package]
version = "0.1.0"
edition = "2024"
```

**Criterio de aprobación:** `cargo metadata --locked --format-version 1` debe resolver paquetes; `target/` se ignora en Git, no en caché reproducible.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** `cargo metadata --locked --format-version 1` debe resolver todos los miembros.
- **Gate 2:** `cargo check --workspace --all-targets --locked` y `cargo test --workspace --locked` en CI compatible.
- **Gate 3:** Verificar features no predeterminadas necesarias; validar dependencias de Git fijadas a revisiones, licencias y avisos RustSec.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Elegir workspace si varias aplicaciones o bibliotecas comparten código y políticas. Declarar `[workspace]`, `members`, `resolver = "3"` únicamente cuando el toolchain fijado lo soporte. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Inventar crates ausentes para lograr green.
- ❌ **Incorrecto:** `cargo clean` ejecutado automáticamente sin permiso.
- ❌ **Incorrecto:** Confundir `cargo check` con e2e GPUI.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cargo](https://doc.rust-lang.org/cargo/reference/workspaces.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [rustsec](https://rustsec.org/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Duplicar versiones divergentes de Tokio en los miembros
- **❌ Incorrecto**: Duplicar versiones divergentes de Tokio en los miembros.
- **✅ Correcto**: Centralizar versiones comunes mediante workspace.dependencies cuando aporta coherencia.

### 02. Excluir apps/desktop del workspace para que falle silenciosamente CI
- **❌ Incorrecto**: Excluir apps/desktop del workspace para que falle silenciosamente CI.
- **✅ Correcto**: Revisar cargo metadata y miembros del workspace antes de dar build verde.

### 03. Eliminar Cargo.lock de la aplicación en release
- **❌ Incorrecto**: Eliminar Cargo.lock de la aplicación en release.
- **✅ Correcto**: Versionar lockfile de binarios y compilar con --locked.

### 04. Compartir todas las features por defecto sin medir superficie
- **❌ Incorrecto**: Compartir todas las features por defecto sin medir superficie.
- **✅ Correcto**: Declarar features explícitas y probar combinaciones soportadas.

### 05. Usar target/ versionado en Git
- **❌ Incorrecto**: Usar target/ versionado en Git.
- **✅ Correcto**: Ignorar artefactos y cachear compilaciones con claves de toolchain/lockfile.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

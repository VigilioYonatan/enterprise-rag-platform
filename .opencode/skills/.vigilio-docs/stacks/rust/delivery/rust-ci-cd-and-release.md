# Rust CI/CD, matrices, distribución y recuperación

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Tres pipelines PR, Nightly y Release; cada consumidor debe adoptar y exigir status checks reales.

## Política y decisiones de diseño

1. PR: fmt/check/clippy/test y cambios afectados; nightly: matrices OS, stress, fuzz y compatibilidad; release: build reproducible, firmas y pruebas de instalación.
2. Toolchain y dependencias fijados; auditar supply chain y licencias; generar SBOM cuando proceso lo soporte.
3. Artefactos release no contienen `target/`, credenciales ni caches; prueba post-instalación fuera del entorno de desarrollo.
4. No firmar ni publicar desde PR no confiables; tokens mínimos y aprobación para release.

## Ejemplo técnico específico — Gate release real

```bash
cargo build --workspace --release --locked
# Consumer: verificar ejecutables, firma, SBOM, checksum, instalación y smoke.
test -s target/release/my-cli || { echo 'FAIL artifact'; exit 1; }
```

**Criterio de aprobación:** El nombre ejecutable se obtiene de metadata real, y la firma no se sustituye por imprimir “signed”.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Verificar GitHub ruleset active/requiered checks, no solo workflow YAML.
- **Gate 2:** `cargo build --workspace --release --locked` en plataformas soportadas.
- **Gate 3:** Registrar `PASS/FAIL/BLOCKED/NOT_RUN`; empaquetar según OS realmente comprobado.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** PR: fmt/check/clippy/test y cambios afectados; nightly: matrices OS, stress, fuzz y compatibilidad; release: build reproducible, firmas y pruebas de instalación. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Usar `latest` o branch mutable para herramientas críticas sin política.
- ❌ **Incorrecto:** Anunciar macOS soportado sin runner.
- ❌ **Incorrecto:** Tratar SBOM generado como licencia aprobada.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cargo](https://doc.rust-lang.org/cargo/reference/workspaces.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [github](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) — verificar compatibilidad con la versión efectiva del consumidor.
- [rustsec](https://rustsec.org/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Build sin --locked y descargar latest
- **❌ Incorrecto**: Build sin --locked y descargar latest.
- **✅ Correcto**: Fijar toolchain, lockfile y versiones en pipeline.

### 02. Subir solo binary sin probar instalación
- **❌ Incorrecto**: Subir solo binary sin probar instalación.
- **✅ Correcto**: Instalar artefacto real en runner limpio y ejecutar smoke.

### 03. Firmar binario antes de verificar SBOM/artefacto
- **❌ Incorrecto**: Firmar binario antes de verificar SBOM/artefacto.
- **✅ Correcto**: Producir SBOM, checksums, firma y verificación posterior.

### 04. Meclar certificados y secretos en PR de fork
- **❌ Incorrecto**: Meclar certificados y secretos en PR de fork.
- **✅ Correcto**: Separar build sin secretos de publicación protegida.

### 05. Anunciar Windows/macOS por compilar Linux
- **❌ Incorrecto**: Anunciar Windows/macOS por compilar Linux.
- **✅ Correcto**: Matriz por plataforma y evidencia de empaquetado soportado.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

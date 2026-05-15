# Testing Rust: gates por riesgo y evidencia

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Pruebas compilables por paquete, nativas y de seguridad; asegurar que el CI ejerce los targets declarados.

## Política y decisiones de diseño

1. Unit en `src` y tests integrales por paquete; E2E global como paquete Cargo explícito.
2. Gate principal: `cargo fmt --all -- --check`, `cargo metadata --locked --format-version 1`, `cargo check --workspace --all-targets --locked`, `cargo clippy --workspace --all-targets --locked -- -D warnings`, `cargo test --workspace --locked`.
3. GUI requiere test-runner de ventana real; sin él `BLOCKED`. Fuzzing/property/sanitizers según soporte y riesgo; no marcar PASS por herramientas ausentes.
4. Métricas de cobertura son señal, no objetivo absoluto; invertir en tests de fallos reales.

## Ejemplo técnico específico — Tests ejecutados y compilación completa

```bash
cargo metadata --locked --format-version 1
cargo fmt --all -- --check
cargo check --workspace --all-targets --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
```

**Criterio de aprobación:** Si falta Cargo o un miembro workspace, bloquear; no contar archivos Rust como tests ejecutados.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Comprobar lista exacta de test binaries conectados en Cargo, no contar archivos `.rs`.
- **Gate 2:** Prueba negativa de symlinks, rollback, IPC y no persistencia de secretos.
- **Gate 3:** Performance: presupuestos explícitos de p95, RAM y startup medidos.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Unit en `src` y tests integrales por paquete; E2E global como paquete Cargo explícito. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** `cargo test` como sustituto de UI E2E.
- ❌ **Incorrecto:** Omitir test y salir 0.
- ❌ **Incorrecto:** Test unitario con mock de DB etiquetado integración.

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

### 01. Dar PASS a cargo test sin correr clippy ni fmt
- **❌ Incorrecto**: Dar PASS a cargo test sin correr clippy ni fmt.
- **✅ Correcto**: Gates independientes de formato, lint, unit y build.

### 02. Asumir UI GPUI probada por unit de dominio
- **❌ Incorrecto**: Asumir UI GPUI probada por unit de dominio.
- **✅ Correcto**: E2E gráfico separado con runner soportado.

### 03. Ignorar test filtrado que encontró cero casos
- **❌ Incorrecto**: Ignorar test filtrado que encontró cero casos.
- **✅ Correcto**: Comprobar descubrimiento/contador y fallar en pruebas obligatorias.

### 04. Usar test dependiente de red pública y horario
- **❌ Incorrecto**: Usar test dependiente de red pública y horario.
- **✅ Correcto**: Fixtures locales deterministas y clock controlado.

### 05. Dejar unsafe/FFI sin casos negativos
- **❌ Incorrecto**: Dejar unsafe/FFI sin casos negativos.
- **✅ Correcto**: Miri/sanitizers/fuzz según compatibilidad documentada.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

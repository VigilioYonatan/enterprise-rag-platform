# CLI Rust: contratos, UX y seguridad de procesos

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** CLI pequeña no necesita workspace ni arquitectura en seis crates.

## Política y decisiones de diseño

1. Separar parsing de flags, casos de uso y adaptadores solo si complejidad real; `clap` opcional según lockfile.
2. Salida stdout estable para resultados y stderr para diagnósticos; exit codes documentados, modo JSON si consumidores lo necesitan.
3. Configuración y credenciales mediante mecanismo explícito; no exponer tokens en logs ni argumentos de procesos.
4. Operaciones destructivas con `--dry-run` y confirmación según política; comandos idempotentes cuando es posible.

## Ejemplo técnico específico — CLI pequeña sin arquitectura ceremonial

```rust
fn exit_code(valid: bool) -> i32 { if valid { 0 } else { 2 } }

fn main() {
    let valid = std::env::args().len() > 1;
    std::process::exit(exit_code(valid));
}
```

**Criterio de aprobación:** Mensajes de uso en stderr y salida determinista para shell; probar señales de interrupción y cancelación.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests binarios end-to-end con tempfile, exit code y salida reproducible.
- **Gate 2:** Validar Unicode, paths con espacios, stdin vacío y cancelación.
- **Gate 3:** Versionar flags y compatibilidad en cambios de CLI pública.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Separar parsing de flags, casos de uso y adaptadores solo si complejidad real; `clap` opcional según lockfile. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** `println!` disperso como protocolo JSON.
- ❌ **Incorrecto:** Borrar archivos sin dry-run.
- ❌ **Incorrecto:** Introducir Tokio/DB sin necesidad.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cargo](https://doc.rust-lang.org/cargo/reference/workspaces.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Imprimir errores recuperables y finalizar 0
- **❌ Incorrecto**: Imprimir errores recuperables y finalizar 0.
- **✅ Correcto**: Códigos de salida significativos, stdout datos y stderr errores.

### 02. Interpolar rutas sin canonicalizar en operación destructiva
- **❌ Incorrecto**: Interpolar rutas sin canonicalizar en operación destructiva.
- **✅ Correcto**: Alcance/confirmación y validación de symlinks según amenaza.

### 03. Pedir contraseña por argumento visible en historial shell
- **❌ Incorrecto**: Pedir contraseña por argumento visible en historial shell.
- **✅ Correcto**: Entrada segura o token por canal aprobado.

### 04. Cargar todo el archivo grande en memoria
- **❌ Incorrecto**: Cargar todo el archivo grande en memoria.
- **✅ Correcto**: Streaming con buffers acotados y progreso opcional.

### 05. Publicar una CLI sin tests del binario
- **❌ Incorrecto**: Publicar una CLI sin tests del binario.
- **✅ Correcto**: Tests de proceso reales con stdout, stderr y status.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

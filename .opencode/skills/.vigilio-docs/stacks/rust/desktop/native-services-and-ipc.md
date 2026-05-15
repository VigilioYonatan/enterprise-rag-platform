# PTY, Git, LSP, filesystem e IPC CLI/desktop

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Adapta servicios OS a puertos verificables sin forzar GPUI a consumir dependencias de kernel.

## Política y decisiones de diseño

1. PTY y subprocess con owner, cancelación, grupos de procesos cuando aplica y limpieza después del cierre.
2. Protocolo IPC versionado, framing y autenticación local, con manejo de instancias múltiples.
3. Git y LSP son procesos/no confiables: validación de rutas, working directory, timeouts y redacción de secretos.
4. No ejecutar hooks/scripts recibidos del repositorio sin política de aprobación; limitar operaciones de escritura.

## Ejemplo técnico específico — Proceso externo gobernado

```rust
use std::process::{Command, Stdio};

fn run_version() -> std::io::Result<std::process::Output> {
    Command::new("git").arg("--version")
        .stdin(Stdio::null()).output()
}
```

**Criterio de aprobación:** Añadir timeout, cancelación, validación de argumentos/path, limpieza de child/grandchild y límites de output.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de IPC interrumpido, mensajes corruptos, doble instancia y replay.
- **Gate 2:** Fixture Git temporal para staging/diff sin red.
- **Gate 3:** Cancelación PTY y limpieza de descendientes en cada OS soportado.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** PTY y subprocess con owner, cancelación, grupos de procesos cuando aplica y limpieza después del cierre. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Socket/pipe accesible a cualquier usuario.
- ❌ **Incorrecto:** Envío de secretos por logs IPC.
- ❌ **Incorrecto:** Comando shell concatenando input externo.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust_api](https://doc.rust-lang.org/std/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Concatenar string del usuario en comando shell
- **❌ Incorrecto**: Concatenar string del usuario en comando shell.
- **✅ Correcto**: Usar Command con argv separados y políticas allowlist.

### 02. Crear PTY sin cerrar hijos al cerrar tab
- **❌ Incorrecto**: Crear PTY sin cerrar hijos al cerrar tab.
- **✅ Correcto**: Supervisar proceso y manejar señales/shutdown y recursos.

### 03. Aceptar mensajes IPC sin tamaño/tipo/versión
- **❌ Incorrecto**: Aceptar mensajes IPC sin tamaño/tipo/versión.
- **✅ Correcto**: Protocolo tipado, límites y validación de origen.

### 04. Pasar filesystem root como string no canónico a un agente
- **❌ Incorrecto**: Pasar filesystem root como string no canónico a un agente.
- **✅ Correcto**: Resolver raíz permitida y revisar symlinks y rutas escapadas.

### 05. Enviar el output completo de procesos a UI sin límite
- **❌ Incorrecto**: Enviar el output completo de procesos a UI sin límite.
- **✅ Correcto**: Stream acotado, truncamiento seguro y cancelación.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Async, concurrencia, backpressure y apagado ordenado

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Evitar tareas huérfanas, UI bloqueada, races y consumo de recursos descontrolado.

## Política y decisiones de diseño

1. No usar runtime async por obligación: código CPU-bound puede ejecutarse síncrono o en pool acotado. Elegir Tokio según stack real.
2. Crear ownership explícito de tareas, timeouts, cancellation token y cierre de procesos descendientes.
3. Establecer colas acotadas y política de backpressure en stream de editor, LSP, red e IA; medir saturación.
4. Separar event-loop GPUI del I/O bloqueante; entregar resultados al thread apropiado.

## Ejemplo técnico específico — Cancelación con shutdown definido

```rust
// Pseudocódigo Tokio: usar versión del proyecto.
// tokio::select! {
//     result = worker.run() => handle(result),
//     _ = shutdown.cancelled() => worker.stop().await,
// }
```

**Criterio de aprobación:** En aplicaciones CLI/GPUI no crear Tokio por moda; cancelar procesos hijos y cerrar sockets tras timeout.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de cancelación en operaciones lentas, canales cerrados, doble shutdown y reintentos.
- **Gate 2:** Registrar latencia p95/p99 y recursos en stress test, sin umbrales inventados.
- **Gate 3:** Detección de race mediante tests deterministas, fixtures y herramientas compatibles con toolchain.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** No usar runtime async por obligación: código CPU-bound puede ejecutarse síncrono o en pool acotado. Elegir Tokio según stack real. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Mantener mutex mientras se espera un futuro.
- ❌ **Incorrecto:** Task spawn sin owner ni cleanup.
- ❌ **Incorrecto:** Prometer que Tokio garantiza ausencia de races.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [tokio](https://tokio.rs/tokio/tutorial) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Crear tokio::spawn sin gestionar el JoinHandle
- **❌ Incorrecto**: Crear tokio::spawn sin gestionar el JoinHandle.
- **✅ Correcto**: Establecer propietario, shutdown y propagación de errores de tasks.

### 02. Bloquear Tokio con std::thread::sleep
- **❌ Incorrecto**: Bloquear Tokio con std::thread::sleep.
- **✅ Correcto**: Usar tokio::time::sleep; mover CPU/IO bloqueante fuera del executor cuando corresponda.

### 03. Canal ilimitado para frames o eventos de terminal
- **❌ Incorrecto**: Canal ilimitado para frames o eventos de terminal.
- **✅ Correcto**: Usar canal acotado y política de backpressure explícita.

### 04. Mantener mutex entre una llamada HTTP await
- **❌ Incorrecto**: Mantener mutex entre una llamada HTTP await.
- **✅ Correcto**: Delimitar sección crítica y liberar antes de suspensión.

### 05. Abandonar transacciones al cancelar sin semántica documentada
- **❌ Incorrecto**: Abandonar transacciones al cancelar sin semántica documentada.
- **✅ Correcto**: Definir rollback y operaciones idempotentes en caminos de cancelación.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

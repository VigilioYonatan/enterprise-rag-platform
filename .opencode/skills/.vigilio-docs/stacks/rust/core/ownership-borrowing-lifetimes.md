# Ownership, borrowing, lifetimes y sincronización

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Diseñar APIs sin aliasing inseguro, temporales colgantes o clones costosos por defecto.

## Política y decisiones de diseño

1. Preferir referencias con alcance legible a `Arc<Mutex<T>>` global. Documentar quién posee documentos, buffers y procesos y cuándo se destruyen.
2. `Rc`/`RefCell` pertenecen a un único hilo; para concurrencia, usar `Arc` y sincronización solo después de explicar `Send` y `Sync`.
3. Evitar mantener un lock mientras se hace I/O, se ejecuta callback o se cruza `.await`; modelar transiciones de estado y tiempo de posesión.
4. Usar `Cow` o borrowed views por rendimiento solo después de medir y proteger las lifetimes; no llenar código de clones a ciegas.

## Ejemplo técnico específico — Ownership de buffers sin clones arbitrarios

```rust
fn normalize_path_hint(value: &str) -> &str {
    value.trim()
}

fn path_segment(value: &str) -> Option<&str> {
    value.split('/').next().filter(|part| !part.is_empty())
}
```

**Criterio de aprobación:** Si se introduce `Arc<Mutex<T>>` explicar contención, lock order y por qué no basta ownership local; prueba de deadlock y error.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de cierre de ventana con tareas activas y cancelación; detectar leaks y retenciones.
- **Gate 2:** Modelar propietario de cada `JoinHandle`, archivo temporal, socket y suscriptor.
- **Gate 3:** Revisar locks anidados, starvation y guardas que sobreviven llamadas reentrantes.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Preferir referencias con alcance legible a `Arc<Mutex<T>>` global. Documentar quién posee documentos, buffers y procesos y cuándo se destruyen. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** `unsafe` para eludir borrow checker.
- ❌ **Incorrecto:** Mutex compartido para cada campo UI.
- ❌ **Incorrecto:** Recrear recursos en cada render.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.
- [rustnomicon](https://doc.rust-lang.org/nomicon/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Poner Arc<Mutex<T>> alrededor de todo el modelo para compilar
- **❌ Incorrecto**: Poner Arc<Mutex<T>> alrededor de todo el modelo para compilar.
- **✅ Correcto**: Preferir ownership exclusivo y referencias; compartir estado solo con necesidad concurrente.

### 02. Usar clone en cada lectura para evitar pensar en préstamos
- **❌ Incorrecto**: Usar clone en cada lectura para evitar pensar en préstamos.
- **✅ Correcto**: Medir asignaciones y tomar &str o &T cuando el contrato lo permita.

### 03. Retener MutexGuard durante un await
- **❌ Incorrecto**: Retener MutexGuard durante un await.
- **✅ Correcto**: Liberar la guarda antes del await y revisar cancelación y deadlocks.

### 04. Devolver referencia a memoria temporal local
- **❌ Incorrecto**: Devolver referencia a memoria temporal local.
- **✅ Correcto**: Retornar valor owned o referencia con lifetime válido del propietario.

### 05. Introducir unsafe para evitar resolver errores de borrow checker
- **❌ Incorrecto**: Introducir unsafe para evitar resolver errores de borrow checker.
- **✅ Correcto**: Rediseñar el ciclo de vida antes de considerar unsafe con invariantes verificadas.


## Ejemplo implementable y revisión del riesgo
### Ejemplo de cierre de guarda antes de suspender

```rust
use std::sync::{Arc, Mutex};
async fn read_then_wait(state: Arc<Mutex<u64>>) -> Result<u64, String> {
    let snapshot = {
        let guard = state.lock().map_err(|_| "mutex poisoned".to_string())?;
        *guard
    }; // lock liberado ANTES del await
    tokio::time::sleep(std::time::Duration::from_millis(1)).await;
    Ok(snapshot)
}
```

❌ Incorrecto: mantener `MutexGuard` alrededor del `await`; puede bloquear tareas y romper requisitos `Send`. ✅ Correcto: reducir la sección crítica, instrumentar contención y elegir mutex async solo si el recurso/ciclo de vida realmente lo exige. El fragmento requiere Tokio como dependencia; no imponer Tokio a toda crate Rust.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Estado GPUI, eventos y ciclo de vida

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Mantener identidad estable de ventanas/tabs, efectos y tareas asíncronas.

## Política y decisiones de diseño

1. Distinguir estado persistente de vista y estado efímero UI. Evitar replicar same state en varios paneles.
2. Definir secuencia de eventos y quién confirma escritura; predecir reentradas y cierres mientras hay I/O.
3. Al cambiar workspace cancelar LSP/PTY/tareas huérfanas; no cerrar app con recursos aún retenidos.
4. La restauración usa datos verificados/versionados; no ejecuta comandos guardados automáticamente.

## Ejemplo técnico específico — Transición de estado UI

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DocumentStatus { Clean, Dirty, Saving, Conflict }

pub fn is_safe_to_close(state: DocumentStatus) -> bool {
    matches!(state, DocumentStatus::Clean)
}
```

**Criterio de aprobación:** Probar cerrar durante `Saving`, archivo modificado externamente, autosave y cancelación del editor.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de multiple ventanas/duplicación de pestañas, foco y navegación.
- **Gate 2:** Simular eventos tardíos tras destruir ventana y asegurar que no mutan estado ajeno.
- **Gate 3:** Probar recuperación ante snapshot corrupto y cambios de versión.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Distinguir estado persistente de vista y estado efímero UI. Evitar replicar same state en varios paneles. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Guardar secretos en el snapshot UI.
- ❌ **Incorrecto:** Asumir ejecución secuencial de callbacks.
- ❌ **Incorrecto:** Cerrar ventana dejando PTY huérfanos.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [gpui](https://github.com/zed-industries/zed/tree/main/crates/gpui) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Permitir que una pestaña cerrada reciba resultado async tardío
- **❌ Incorrecto**: Permitir que una pestaña cerrada reciba resultado async tardío.
- **✅ Correcto**: Cancelar o ignorar respuestas con token de generación por vista.

### 02. Dos fuentes de verdad para documento modificado
- **❌ Incorrecto**: Dos fuentes de verdad para documento modificado.
- **✅ Correcto**: Un estado dueño para buffer y dirty flag derivados.

### 03. Ejecutar guardado síncrono en hilo de UI
- **❌ Incorrecto**: Ejecutar guardado síncrono en hilo de UI.
- **✅ Correcto**: Guardado asincrónico con estados pending/success/error recuperables.

### 04. Eliminar suscripciones al cerrar ventana sin limpieza
- **❌ Incorrecto**: Eliminar suscripciones al cerrar ventana sin limpieza.
- **✅ Correcto**: Gestionar handles/lifetimes y unsubscribe explícitos cuando aplique.

### 05. Reabrir aplicación sin conservar archivo/estado permitido
- **❌ Incorrecto**: Reabrir aplicación sin conservar archivo/estado permitido.
- **✅ Correcto**: Persistir solo sesión consentida y probar restauración segura.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

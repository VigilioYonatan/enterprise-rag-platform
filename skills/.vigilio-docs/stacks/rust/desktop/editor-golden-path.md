# Golden path ejecutable del editor nativo

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Flujo vertical de apertura, edición, guardado, cierre y recuperación; primer gate de producto para IDE.

## Política y decisiones de diseño

1. Empezar por abrir una ventana GPUI real y un archivo UTF-8; manejar codificaciones especiales de forma explícita.
2. Separar el buffer en memoria de bytes del disco; registrar versión/hash del archivo al abrir para detectar modificaciones externas.
3. Guardar de manera robusta mediante archivo temporal y reemplazo donde sea seguro; definir fsync/atomicidad por SO y fallback, sin prometer atomicidad universal.
4. Undo/redo determinista, protección contra pérdida de cambios y restauración sin exponer archivos confidenciales.

## Ejemplo técnico específico — Editor funcional comprobable

```text
OPEN -> dirty=false -> EDIT -> dirty=true -> SAVE -> fsync/rename
  -> CLOSE -> REOPEN -> contenido idéntico

Rechazo: close sin confirmación en estado dirty.
```

**Criterio de aprobación:** E2E nativo imprescindible: ventana real, teclado, focus, reinicio y contenido sin corrupción.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** E2E abrir→editar→guardar→cerrar→reabrir con bytes idénticos.
- **Gate 2:** Simular permisos denegados, cambios simultáneos y corte antes de renombrar.
- **Gate 3:** Benchmarks de fichero grande, latencia de escritura y memoria de buffers.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Empezar por abrir una ventana GPUI real y un archivo UTF-8; manejar codificaciones especiales de forma explícita. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Contar archivo `.rs` como feature operativa si no está compilado.
- ❌ **Incorrecto:** Escribir directamente sobre original sin estrategia.
- ❌ **Incorrecto:** Ignorar ediciones externas.

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

### 01. Guardar directamente sobre el archivo sin alternativa de recuperación
- **❌ Incorrecto**: Guardar directamente sobre el archivo sin alternativa de recuperación.
- **✅ Correcto**: Escritura temporal, fsync y rename atómico donde la plataforma lo permita.

### 02. Reemplazar buffer al recibir cambios de watcher sin comprobar dirty
- **❌ Incorrecto**: Reemplazar buffer al recibir cambios de watcher sin comprobar dirty.
- **✅ Correcto**: Conflicto visible, conservar edición del usuario y permitir resolver.

### 03. Dar por hecho undo/redo porque existe buffer
- **❌ Incorrecto**: Dar por hecho undo/redo porque existe buffer.
- **✅ Correcto**: Probar historial reversible, grupos de edición y cursor.

### 04. Ignorar encodings y saltos de línea
- **❌ Incorrecto**: Ignorar encodings y saltos de línea.
- **✅ Correcto**: Definir UTF-8, detección y estrategia ante bytes inválidos/EOL.

### 05. Dar por pasado E2E solo por compilar el editor
- **❌ Incorrecto**: Dar por pasado E2E solo por compilar el editor.
- **✅ Correcto**: Abrir, editar, guardar, cerrar, reabrir y comprobar contenido byte a byte.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

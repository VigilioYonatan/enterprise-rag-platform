# Unsafe, FFI y garantías de memoria

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Controlar bloques unsafe y fronteras C/C++ sin asumir seguridad por compilar.

## Política y decisiones de diseño

1. Encapsular `unsafe` en módulo pequeño con sección `# Safety`, precondiciones, invariantes y reviewers propietarios.
2. Mantener layout y ABI declarados (`repr(C)` cuando aplique), ownership y liberación a través de FFI; no atravesar pánicos en fronteras no preparadas.
3. Revisar lifetimes de punteros provenientes de C, recursos GPU, buffers nativos y callback de ventanas.
4. Aislar FFI de Core; wrappers seguros validan rangos, nulos y conversiones UTF-8.

## Ejemplo técnico específico — Contratos de unsafe y frontera FFI

```rust
/// # Safety
/// `ptr` debe apuntar a `len` bytes válidos durante toda la llamada.
unsafe fn borrowed_bytes<'a>(ptr: *const u8, len: usize) -> &'a [u8] {
    // Aislar y auditar invariantes; en código real evitar lifetime libre.
    unsafe { std::slice::from_raw_parts(ptr, len) }
}
```

**Criterio de aprobación:** El ejemplo expone una API peligrosa: NO adoptarlo sin demostrar lifetime; preferir API segura que recibe una referencia owner válida.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de punteros nulos, buffers de tamaño límite, callbacks post-destrucción y error paths.
- **Gate 2:** Ejecutar sanitizers/Miri según soporte del toolchain; `NOT_RUN` cuando la plataforma no los admita.
- **Gate 3:** Auditoría de nuevos `unsafe` y dependencies con FFI en review.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Encapsular `unsafe` en módulo pequeño con sección `# Safety`, precondiciones, invariantes y reviewers propietarios. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** `transmute` sin prueba de representación.
- ❌ **Incorrecto:** Enviar punteros sin lifetime a background threads.
- ❌ **Incorrecto:** Usar `unsafe` para silenciar compile errors.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [rustnomicon](https://doc.rust-lang.org/nomicon/) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust_api](https://doc.rust-lang.org/std/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Envolver unsafe sin explicar precondiciones
- **❌ Incorrecto**: Envolver unsafe sin explicar precondiciones.
- **✅ Correcto**: Documentar SAFETY, ownership, aliasing y longitud del buffer en la frontera.

### 02. Pasar &str a C como puntero temporal que vive después de la llamada
- **❌ Incorrecto**: Pasar &str a C como puntero temporal que vive después de la llamada.
- **✅ Correcto**: Usar CString y contratos explícitos de retención/liberación.

### 03. Asumir ABI Rust estable entre bibliotecas binarias
- **❌ Incorrecto**: Asumir ABI Rust estable entre bibliotecas binarias.
- **✅ Correcto**: Usar extern "C" y repr(C) cuando el contrato FFI lo requiera.

### 04. Crear slice con longitud tomada de entrada no confiable
- **❌ Incorrecto**: Crear slice con longitud tomada de entrada no confiable.
- **✅ Correcto**: Validar puntero, rango, alineación y vida antes de from_raw_parts.

### 05. Dar PASS a FFI únicamente por cargo check
- **❌ Incorrecto**: Dar PASS a FFI únicamente por cargo check.
- **✅ Correcto**: Ejecutar sanitizers/Miri donde sean compatibles y pruebas con datos frontera.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

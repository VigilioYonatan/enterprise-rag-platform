# GPUI: arquitectura nativa y composición de UI

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Especialización solo para proyectos cuyo lockfile/fuentes prueben adopción de GPUI.

## Política y decisiones de diseño

1. Fijar commit/version de GPUI; verificar APIs en el código de Zed correspondiente, no suponer estabilidad pre-1.0.
2. La pantalla representa estado, dispara acciones y maneja foco/accesibilidad; guardar documentos pertenece a casos de uso y adaptadores de filesystem.
3. Separar modelo de documento, sesión de editor, tab y ventana; diseñar ownership, suscripciones y destrucción.
4. No bloquear hilo UI con parsing, red, indexación o escritura; invalidar render de forma controlada.

## Ejemplo técnico específico — Límites GPUI independientes de la versión

```text
GPUI: event -> command -> application service -> output/error
UI thread: render, focus, gestures, shortcuts.
Worker: filesystem, Git, PTY, LSP, heavy work; nunca bloquear render.
```

**Criterio de aprobación:** Las firmas concretas de GPUI cambian entre commits: no publicar llamadas imaginadas; verificar versión y compilación.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Smoke nativo: abrir ventana; eventos teclado; foco; cierre con cambios sin guardar.
- **Gate 2:** Pruebas por cambios de escala DPI y tamaños; observar consumo y leaks al abrir/cerrar tabs.
- **Gate 3:** Sin runner GUI => E2E `BLOCKED`, no `PASS`.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Fijar commit/version de GPUI; verificar APIs en el código de Zed correspondiente, no suponer estabilidad pre-1.0. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Acoplar modelo core a GPUI.
- ❌ **Incorrecto:** Hacer I/O directamente en render.
- ❌ **Incorrecto:** Suponer compatibilidad Windows/macOS/Linux sin build real.

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

### 01. Componente GPUI ejecuta SQL o lee archivos en render
- **❌ Incorrecto**: Componente GPUI ejecuta SQL o lee archivos en render.
- **✅ Correcto**: Estado UI coordina casos de uso async; infraestructura maneja IO.

### 02. Recrear toda la vista con estado global mutable
- **❌ Incorrecto**: Recrear toda la vista con estado global mutable.
- **✅ Correcto**: Mantener entidades/estado con ownership explícito y actualización acotada.

### 03. Añadir listener de teclado que no respeta focus
- **❌ Incorrecto**: Añadir listener de teclado que no respeta focus.
- **✅ Correcto**: Dirigir eventos al componente enfocado; probar IME y atajos.

### 04. Actualizar entidades de UI desde worker arbitrario
- **❌ Incorrecto**: Actualizar entidades de UI desde worker arbitrario.
- **✅ Correcto**: Retornar al contexto/ciclo de vida GPUI según la versión fijada.

### 05. Copiar código de GPUI HEAD sin fijar revisión
- **❌ Incorrecto**: Copiar código de GPUI HEAD sin fijar revisión.
- **✅ Correcto**: Fijar dependency revision y probar APIs reales del proyecto.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# UX/UI GPUI — IDE y aplicaciones nativas Rust

**Estado:** norma vigente, no certificación de implementación. **Owner:** `stacks/`. **Alcance:** GPUI desktop con comandos, docking, focus, accesibilidad y estado de vista..

## Decisiones arquitectónicas y de producto

- Distinguir entidad editable, modelo de documento y presentación GPUI; un redraw no escribe en disco. - Respetar control de foco, IME, teclado, atajos, deshacer/rehacer, modo oscuro, múltiples ventanas/monitores y overlays. - Crear tokens semánticos consumibles desde tema activo sin colorear cada control a mano. - No asumir soporte completo de accessibility tree de GPUI: verificar versión fijada y APIs reales antes de prometer lectores de pantalla. - Render pesado y procesos en hilos/tareas adecuados, sin blocking UI.

## Contrato implementable / ejemplo verificable

```text
CommandPalette: query → resultados → selección → execute(command)
Editor: DocumentState (modelo) → ViewState (cursor/scroll/focus) → render
Themes: primitive tokens → semantic palette → component style
```

Golden path: abrir archivo → editar con IME → guardar → undo → change theme → cerrar/reabrir → recuperar estado. No hay implementación implícita por este contrato.

## Testing, revisión y criterios de aceptación

- [ ] Tab/atajos, accesibilidad verificada por OS si API disponible, IME multilenguaje.
- [ ] UI reflow, multi monitor, alto contraste, lag al abrir archivo grande.
- [ ] UI E2E NATIVE `NOT_RUN` si falta runner.

## Anti-patrones y riesgos

- Crear un crate por componente visual.
- Clonar estructura DOM/ARIA a GPUI como si fuera el navegador.
- Prometer screen reader sin prueba específica del toolkit.



## Referencias oficiales y fuentes canónicas

- [GPUI](../desktop/gpui-architecture.md)
- [Norma UX](../../../standards/experience/README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Crear un crate por componente visual.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Usar un layout de dashboard SaaS para un IDE profesional
- **❌ Incorrecto**: Usar un layout de dashboard SaaS para un IDE profesional.
- **✅ Correcto**: Jerarquía densidad-edición: buffer central, paneles acoplables y terminal secundaria.

### 02. Registrar Ctrl+K sin indicar focus ni conflictos
- **❌ Incorrecto**: Registrar Ctrl+K sin indicar focus ni conflictos.
- **✅ Correcto**: Mapa de comandos contextual y atajos configurables por plataforma.

### 03. Crear dock sin persistir dimensiones ni mínimo visible
- **❌ Incorrecto**: Crear dock sin persistir dimensiones ni mínimo visible.
- **✅ Correcto**: Layout recuperable, redimensionable y probado en pantallas pequeñas.

### 04. Animar cada keystroke del editor
- **❌ Incorrecto**: Animar cada keystroke del editor.
- **✅ Correcto**: Priorizar latencia de entrada y respetar reducción de movimiento.

### 05. Color de error solo rojo sin texto
- **❌ Incorrecto**: Color de error solo rojo sin texto.
- **✅ Correcto**: Mensaje y contexto accesible en panel de problemas con navegación por teclado.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

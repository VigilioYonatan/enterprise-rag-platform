# Accesibilidad integral: WCAG, input y necesidades reales

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Perceptible, operable, comprensible y robusto; diferencias web, desktop, móvil, videojuegos..

## Decisiones arquitectónicas y de producto

1. Usar WCAG 2.2 AA como baseline para contenido web; no extrapolar automáticamente a UI de videojuegos como garantía legal. 2. Verificar teclado, lector de pantalla/semántica, orden de foco, etiquetas, errores asociados, reducciones de movimiento, zoom/reflow, texto ajustable, contraste, estados y cambios de contenido. 3. **Tamaños por plataforma:** WCAG 2.2 AA 2.5.8 pide 24×24 CSS px o excepciones; iOS recomienda objetivo típico 44×44 pt; Android objetivo táctil 48×48 dp. Son unidades y requisitos diferentes. 4. En videojuegos incluir alternativas al audio/color, subtítulos, remapeo de controles, flashes seguros, vibración opcional y opciones de pausa; el motor no garantiza lector de pantalla automáticamente. 5. Incluir pruebas de limitaciones motoras, visuales, auditivas y cognitivas según público.

## Contrato implementable / ejemplo verificable

**Checklist reproducible web**: Tab por toda la tarea → foco visible y no oculto → Enter/Espacio activa → Escape cierra diálogo → zoom 200% y reflow → lector de pantalla anuncia nombre/rol/estado → errores legibles y reversibles.

**Godot**: `Control.focus_mode` y vecinos configurados; probar `ui_focus_next` con mando/teclado; reservar acciones de gameplay distintas de `ui_*`, no robar el focus al mover personaje.

## Testing, revisión y criterios de aceptación

- [ ] Matriz manual por plataforma y dispositivo real.
- [ ] Contraste probado contra fondos y estados reales; no solo contra un token.
- [ ] Cumplir mínimos de entrada nativos y excepciones explícitas.
- [ ] Documentar resultados `PASS/FAIL/BLOCKED/NOT_RUN`; axe o auditor automático no certifica experiencia completa.

## Anti-patrones y riesgos

- Checkbox con label visual pero sin nombre accesible.
- Desactivar visible focus para estética.
- Forzar animación o flashes sin opción de reducción.



## Referencias oficiales y fuentes canónicas

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Apple HIG: accesibilidad](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Godot focus](https://docs.godotengine.org/en/stable/tutorials/ui/gui_navigation.html)
- [Guía UX/UI transversal](README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Checkbox con label visual pero sin nombre accesible.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Quitar outline sin foco alternativo
- **❌ Incorrecto**: Quitar outline sin foco alternativo.
- **✅ Correcto**: Indicador de foco visible y orden lógico, evaluado teclado-only.

### 02. Usar placeholder como único label
- **❌ Incorrecto**: Usar placeholder como único label.
- **✅ Correcto**: Label accesible visible y errores asociados al control.

### 03. Usar color o audio exclusivamente para fallo en juego
- **❌ Incorrecto**: Usar color o audio exclusivamente para fallo en juego.
- **✅ Correcto**: Cues redundantes texto/forma/imagen/sonido opcional.

### 04. Aplicar tamaños touch en px CSS para app nativa sin adaptar
- **❌ Incorrecto**: Aplicar tamaños touch en px CSS para app nativa sin adaptar.
- **✅ Correcto**: Distinguir unidades CSS px, pt iOS y dp Android y verificar targets.

### 05. Declarar WCAG 2.2 AA por un contraste automático
- **❌ Incorrecto**: Declarar WCAG 2.2 AA por un contraste automático.
- **✅ Correcto**: Auditar criterios aplicables, screen reader y pruebas manuales.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

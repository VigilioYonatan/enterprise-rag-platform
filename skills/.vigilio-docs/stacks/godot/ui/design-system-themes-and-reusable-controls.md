# Godot 2D/3D — Themes, controles y UI reutilizable

**Estado:** norma vigente, no certificación de implementación. **Owner:** `stacks/`. **Alcance:** HUD, menús, settings, overlays y UI diegética en Godot..

## Decisiones arquitectónicas y de producto

- Separar **presentación** (`Control`, `CanvasLayer`, `Theme`) del estado de gameplay; observar señales, no calcular daño en barra de salud. - `Theme` y type variations para base y variantes de `Button`, `PanelContainer`, `Label`; minimizar overrides por nodo, evitar estilos hardcoded. - Escalado con Containers, anchors, stretch modes, viewport y safe area según plataforma. - UI 2D y 3D comparten semántica de ajustes y gameplay, pero no obligatoriamente HUD idéntico. - Mantener estilo único del mundo narrativo con legibilidad de botones, focus, texto y estados.

## Contrato implementable / ejemplo verificable

```gdscript
# Botón de menú: el enfoque sigue reglas del motor; asignar Theme en recurso.
extends Button
signal start_requested
func _ready() -> void:
    focus_mode = Control.FOCUS_ALL
    pressed.connect(func() -> void: start_requested.emit())
```

Aplicar `theme_type_variation` en escenas para cada variante registrada en Theme, no llamar al backend desde el botón.

## Testing, revisión y criterios de aceptación

- [ ] Probar focus/gamepad, hover, pressed, disabled, pause/resume y scene restart.
- [ ] HUD en 4:3, 16:9, ultrawide, táctil y texto localizado si soportado.
- [ ] Test visual por modo/tema + prueba real en Godot; headless no valida UI.

## Anti-patrones y riesgos

- `theme_override_*` distinto en cada nodo.
- HUD colisiona con subtítulos, joystick virtual o notch.
- Configurar `ui_*` para mover personaje en vez de navegación.



## Referencias oficiales y fuentes canónicas

- [Godot Theme variations](https://docs.godotengine.org/en/stable/tutorials/ui/gui_theme_type_variations.html)
- [Menús y accesibilidad](menus-hud-accessibility.md)
- [Normas UX](../../../standards/experience/README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** `theme_override_*` distinto en cada nodo.

## Ejemplo adicional — Theme y Focus sin overrides dispersos

```gdscript
# FocusController.gd — enlazado a menú Control con botón principal.
extends Control
@onready var primary_action: Button = %PrimaryAction
func _ready() -> void:
    primary_action.grab_focus()
```

`Theme` y *Type Variations* deben controlar colores/estados/fuentes de controles reutilizados. Los tokens del proyecto se convierten a estilos de `StyleBox` y clases/variaciones adecuadas, no a overrides en cada nodo. **Tests:** navegación mando, teclado/Tab/Shift+Tab, mouse, focus visible, disabled/foco no atrapado, textos localizados largos, escalado DPI. **Negativo:** un modal sin tecla cancelar y sin foco inicial.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. StyleBox copiado con overrides distintos en cada Button
- **❌ Incorrecto**: StyleBox copiado con overrides distintos en cada Button.
- **✅ Correcto**: Theme central con type variations por componente/estado.

### 02. Tokens de gamepad y mouse iguales sin ergonomía
- **❌ Incorrecto**: Tokens de gamepad y mouse iguales sin ergonomía.
- **✅ Correcto**: Estados hover/focus/pressed separados y área de activación suficiente.

### 03. Definir colores exactos dentro de veinte escenas
- **❌ Incorrecto**: Definir colores exactos dentro de veinte escenas.
- **✅ Correcto**: Colores semánticos con variantes por tema y contraste probado.

### 04. Sobrescribir Theme global por el minijuego local
- **❌ Incorrecto**: Sobrescribir Theme global por el minijuego local.
- **✅ Correcto**: Theme del feature con ownership y componentes reusables.

### 05. Revisar solo captura del menú principal
- **❌ Incorrecto**: Revisar solo captura del menú principal.
- **✅ Correcto**: QA de todos los estados, tamaños, idiomas y errores.


## Ejemplo implementable y revisión del riesgo
### Ejemplo realista de árbol de UI y ownership

```text
ui/
  theme/game_theme.tres       # tokens semánticos, variaciones de tipo
  components/focus_button.tscn
  screens/pause_menu.tscn    # navegación y estado específico
  screens/inventory.tscn     # items, controles y gamepad
```

❌ Incorrecto: veinte `Button` con stylebox_override copiado y fuente demasiado pequeña sobre fondos 3D variables. ✅ Correcto: `Theme` y Type Variations, estados normal/focus/hover/disabled, escala de texto y contraste probados en gameplay. Este árbol es ejemplo, no obligación de carpetas en proyectos pequeños.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

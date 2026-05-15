# UI de juegos — HUD, menú, pausa y accesibilidad

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** menús, inventarios, minimapas, overlays y juegos accesibles.

## Decisiones de arquitectura

1. Usar Control/Containers/anchors y theme resources para escalado; nunca fijar cada posición solo para 1920x1080.
2. Separar estado de partida de UI; `HUD` escucha señales de salud/inventario y no es fuente de verdad.
3. Pausa: decidir qué nodos siguen activos, evitar doble pausa y permitir remapeo de entradas; navegación teclado/gamepad y focus visible.
4. Localización temprana, tamaños variables de texto, subtítulos, contraste, reducción de movimiento y control de audio independientes.

## Implementación de referencia

```gdscript
# UI anclada a señales de dominio, sin referencia directa a NPC.
extends CanvasLayer
@onready var hp_label: Label = $Panel/HPLabel

func on_health_changed(value: int) -> void:
    hp_label.text = tr("HP_LABEL") % value
```

La clave traducible `HP_LABEL` debe existir en recursos de localización de destino.

## Verificación obligatoria

- [ ] Navegación completa del menú con teclado y gamepad, sin ratón.
- [ ] No pérdida de foco tras abrir/cerrar pausa.
- [ ] Pruebas de texto largo y resoluciones 16:9, 4:3, ultrawide si están soportadas.

## Casos adversarios y revisión

- ❌ Un HUD que calcula daño basado en número de píxeles de barra.
- ❌ Botón principal inaccesible sin ratón.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — index](https://docs.godotengine.org/en/stable/tutorials/ui/index.html)
- [Godot — internationalizing games](https://docs.godotengine.org/en/stable/tutorials/i18n/internationalizing_games.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).

## Contratos UX/UI complementarios

- [Godot Theme reutilizable y variantes](design-system-themes-and-reusable-controls.md).
- [Dirección artística, HUD y acceso por género](game-ux-accessibility-and-art-direction.md).
- [Matriz de playtesting/a11y](../testing/uxui-accessibility-playtest-matrix.md).
- [Norma de tokens y modos](../../../standards/experience/design-tokens-modes-and-theming.md).

Para juegos de acción, la accesibilidad incluye **controles remapeables, feedback redundante audio/visual**, subtítulos y opciones de cámara/movimiento según proyecto. Ninguna automatización headless sustituye controles jugables con gamepad o teclado.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Botones de menú sin foco navegable con mando
- **❌ Incorrecto**: Botones de menú sin foco navegable con mando.
- **✅ Correcto**: Configurar focus neighbors y probar keyboard/gamepad.

### 02. HUD de plataformas con 18 paneles permanentes
- **❌ Incorrecto**: HUD de plataformas con 18 paneles permanentes.
- **✅ Correcto**: Mostrar vida, objetivo y señales en contexto sin cubrir acción.

### 03. Depender exclusivamente de rojo/verde para estado
- **❌ Incorrecto**: Depender exclusivamente de rojo/verde para estado.
- **✅ Correcto**: Iconos, forma, texto y audio opcional redundante.

### 04. Menú de pausa no funciona con focus tras cerrar popup
- **❌ Incorrecto**: Menú de pausa no funciona con focus tras cerrar popup.
- **✅ Correcto**: Restaurar foco en elemento disparador.

### 05. No exponer tamaño de texto/audio/reduced motion
- **❌ Incorrecto**: No exponer tamaño de texto/audio/reduced motion.
- **✅ Correcto**: Preferencias por usuario y pruebas de salida desde menú.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

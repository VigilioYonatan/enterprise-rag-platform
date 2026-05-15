# Animación, efectos visuales, hit feedback y cámara

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** feedback visual de salto, ataque, muerte, partículas, UI y cinemáticas.

## Decisiones de arquitectura

1. Para 2D simple: AnimatedSprite2D/AnimationPlayer; para transitions complejas: AnimationTree. Separar estado de juego del clip visible.
2. Hit-stop, flash de daño, partículas, cámara shake y tween son feedback con límites, cancelación y reducción de movimiento.
3. Priorizar legibilidad de gameplay y legibilidad de ataques sobre espectacularidad. Respetar motion sickness, fotosensibilidad y opciones de accesibilidad.
4. Eventos `jumped`,`landed`,`damaged` accionan SFX/VFX; si falta asset, el gameplay permanece funcional.

## Implementación de referencia

```gdscript
# Feedback visual independiente: componente bajo jugador.
@export var sprite: Sprite2D

func on_jump_started() -> void:
    var tween := create_tween()
    tween.tween_property(sprite, "scale", Vector2(1.1, 0.9), 0.07)
    tween.tween_property(sprite, "scale", Vector2.ONE, 0.11)
```

Usar `AnimationTree` para clips 3D; `create_tween` solo para efectos de transformación sencillos.

## Verificación obligatoria

- [ ] El salto funciona con audio desactivado y VFX fallido.
- [ ] Las animaciones no dejan escala alterada tras cancelar o reiniciar nivel.
- [ ] Reducción de movimiento desactiva shake sin desactivar feedback crítico.

## Casos adversarios y revisión

- ❌ Enlazar la física del salto al tween de la cámara.
- ❌ Ejecución de animaciones al doble de velocidad según FPS.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — animation tree](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html)
- [Godot — animation player](https://docs.godotengine.org/en/stable/tutorials/animation/animation_player.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).

## Escenario adicional — animación observa gameplay, nunca autoridad de daño

```gdscript
# PlayerVisuals.gd — extracto de observador
@export var player_anim: AnimationPlayer
func on_jumped() -> void:
    if player_anim != null and player_anim.has_animation("jump"):
        player_anim.play("jump")
```

La animación `jump` se dispara por señal del gameplay, no emite daño ni crea inventario. Un ataque multigolpe debe tener **identificador de ataque + ventanas de hit** controladas por reglas, para evitar daños duplicados al reiniciar animación. **Pruebas:** transiciones idle/run/jump/land, pausa, skip animation, reduced motion, VFX en GPUs de baja capacidad. **Negativo:** una llamada repetida a `play("attack")` dispara un segundo cargo de moneda.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Mezclar daño de gameplay dentro de AnimationPlayer timeline decorativa
- **❌ Incorrecto**: Mezclar daño de gameplay dentro de AnimationPlayer timeline decorativa.
- **✅ Correcto**: Gameplay define evento; animación visualiza y sincroniza ventanas declaradas.

### 02. Tween infinito acumulado en cada hover
- **❌ Incorrecto**: Tween infinito acumulado en cada hover.
- **✅ Correcto**: Cancelar tween previo y limitar número de animaciones.

### 03. Efectos de partículas cada frame por input sostenido
- **❌ Incorrecto**: Efectos de partículas cada frame por input sostenido.
- **✅ Correcto**: Disparar VFX en transiciones únicas con pooling medido.

### 04. Usar camera shake intenso imposible de reducir
- **❌ Incorrecto**: Usar camera shake intenso imposible de reducir.
- **✅ Correcto**: Preferencia de intensidad o reduced motion.

### 05. Perder estados de animación tras pausa/resume
- **❌ Incorrecto**: Perder estados de animación tras pausa/resume.
- **✅ Correcto**: Usar AnimationTree state machine y tests de transición.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

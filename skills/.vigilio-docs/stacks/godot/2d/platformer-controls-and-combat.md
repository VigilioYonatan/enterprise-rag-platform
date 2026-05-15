# 2D — salto, plataformas, movimiento y combate

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** plataformas, metroidvania, runner, puzzle-platformer y acción 2D.

## Decisiones de arquitectura

1. Usar `CharacterBody2D`, `CollisionShape2D`, física en `_physics_process`, `move_and_slide` y InputMap por acción. No mover con coordenadas arbitrarias que atraviesen paredes.
2. Sensación de salto: configurar gravedad/velocidad, coyote-time y jump-buffer si el género requiere controles tolerantes; estos valores son datos balanceables, no constantes universales.
3. Separar hitbox/hurtbox, invulnerabilidad temporal, knockback, equipo y efectos; validar colisiones y daño en el lado autorizado cuando el juego sea online.
4. Cada acción crítica (salto/aterrizaje/ataque) emite un evento de gameplay para animación y SFX sin que las reglas dependan de un `AudioStreamPlayer` concreto.

## Implementación de referencia

```gdscript
# Integración mínima: InputMap contiene move_left, move_right, jump.
extends CharacterBody2D

signal jumped
@export var move_speed: float = 220.0
@export var jump_speed: float = 390.0
@export var gravity: float = 980.0

func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = -jump_speed
        jumped.emit()
    velocity.x = Input.get_axis("move_left", "move_right") * move_speed
    move_and_slide()
```

Para coyote/buffer usar timers acotados al estado de suelo; escribir pruebas de borde para no permitir salto infinito.

## Consideraciones Senior/Staff

**Audio y animación:** [música/SFX](../audio/music-sfx-and-mixing.md), [animación/feedback](../gameplay/animation-vfx-and-camera.md). **Test:** [golden path 2D](../golden-paths/2d-jump-audio-vertical-slice.md).

## Verificación obligatoria

- [ ] Probar salto/caída y detección de suelo con frame rate estable y variable.
- [ ] Validar que saltar repetidamente en el aire no reinicia el salto si no está permitido.
- [ ] Verificar que animación de salto y sonido se disparan una vez, que el aterrizaje restablece el estado.
- [ ] Probar teclado, mando y remapeo de acciones.

## Casos adversarios y revisión

- ❌ `position.y -= 10` desde `_process` sin motor de colisiones.
- ❌ Salto ligado al clip de sonido: el juego deja de saltar si falla el audio.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — 2d movement](https://docs.godotengine.org/en/stable/tutorials/2d/2d_movement.html)
- [Godot — using character body 2d](https://docs.godotengine.org/en/stable/tutorials/physics/using_character_body_2d.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).

## Escenario adicional — salto fiable y pruebas de input 2D

El jugador solo puede saltar cuando la regla de juego lo permite. *Coyote time* y *input buffering* son opciones de diseño, no un valor fijado para todos los juegos.

```gdscript
# Extracto para CharacterBody2D; exige InputMap "jump" existente.
@export var jump_velocity: float = -360.0
@export var gravity: float = 980.0
func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity
        jumped.emit() # solo un evento de salto legítimo
    move_and_slide()
```

**Pruebas:** suelo plano, bordes, techo, doble input, FPS fijo y test de SFX exactamente una vez por salto aceptado. **Negativo:** sonido en cada pulsación aunque el personaje esté en el aire. Para plataformas físicas móviles considerar velocidad heredada y escenarios de colisión del motor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Aplicar salto aunque is_on_floor sea falso sin diseño double-jump
- **❌ Incorrecto**: Aplicar salto aunque is_on_floor sea falso sin diseño double-jump.
- **✅ Correcto**: Guardar reglas explícitas de jump/coyote/buffer.

### 02. Reproducir SFX directamente desde condición de movimiento cada frame
- **❌ Incorrecto**: Reproducir SFX directamente desde condición de movimiento cada frame.
- **✅ Correcto**: Emitir señal de transición real de salto y reproducir una vez.

### 03. Mover CharacterBody2D cambiando global_position ignorando colisión
- **❌ Incorrecto**: Mover CharacterBody2D cambiando global_position ignorando colisión.
- **✅ Correcto**: velocity + move_and_slide en física.

### 04. Permitir atacar sin cooldown / estado de daño
- **❌ Incorrecto**: Permitir atacar sin cooldown / estado de daño.
- **✅ Correcto**: Máquina de estados con ventanas y tests de spam.

### 05. Hacer enemigos dependientes del HUD del jugador
- **❌ Incorrecto**: Hacer enemigos dependientes del HUD del jugador.
- **✅ Correcto**: Resolver daño en dominio de gameplay y notificar UI.


## Ejemplo implementable y revisión del riesgo
### Ejemplo Godot 4: señal de salto aceptado

```gdscript
extends CharacterBody2D
signal jumped
@export var jump_speed: float = 350.0
@export var gravity: float = 980.0
func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y += gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = -jump_speed
        jumped.emit() # exactamente un evento cuando el salto se acepta
    move_and_slide()
```

❌ Incorrecto: reproducir `jump_sfx.play()` cada frame que se mantenga la tecla. ✅ Correcto: otro nodo escucha `jumped`; realiza SFX y animación en capas desacopladas. El valor `gravity` y las acciones deben adaptarse al proyecto y probarse con suelo/colisión reales.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

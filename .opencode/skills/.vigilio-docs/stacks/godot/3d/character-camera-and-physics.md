# 3D — personaje, física, cámara y colisiones

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** third person, first person, action, simulación ligera y exploración 3D.

## Decisiones de arquitectura

1. CharacterBody3D y `move_and_slide` para personaje controlado; `RigidBody3D` para objetos físicos. No cambiar de tipo solo por conveniencia de una animación.
2. Normalizar dirección relativa a cámara; limitar pitch; gestionar mouse capture y accesibilidad.
3. Usar `_physics_process` para movimiento/colisiones y `_process` para interpolación puramente visual cuando aplique.
4. Separar autoría de colisiones, cámaras, esqueleto y estado del jugador. Fijar capas físicas y probar escalones, pendientes y triggers.

## Implementación de referencia

```gdscript
extends CharacterBody3D

@export var speed: float = 5.0
@export var jump_velocity: float = 4.8
@export var gravity: float = 14.0

func _physics_process(delta: float) -> void:
    if not is_on_floor(): velocity.y -= gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity
    var input_vector := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
    var direction := Vector3(input_vector.x, 0.0, input_vector.y).normalized()
    velocity.x = direction.x * speed
    velocity.z = direction.z * speed
    move_and_slide()
```

Para cámara en tercera persona hay que rotar `direction` usando `Camera3D.global_basis`, no asumir que mundo +Z coincide con la vista.

## Verificación obligatoria

- [ ] Saltar y aterrizar sobre pendientes/escalones con delta variable.
- [ ] Capturar/liberar ratón y evitar giro acumulado después del alt-tab.
- [ ] Probar cámara contra paredes y clipping.

## Casos adversarios y revisión

- ❌ Sin normalizar entrada diagonal (personaje corre más rápido).
- ❌ Acceso a render/UI desde callback de física sin medir/juzgar.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — 3d movement](https://docs.godotengine.org/en/stable/tutorials/3d/3d_movement.html)
- [Godot — using character body 3d](https://docs.godotengine.org/en/stable/tutorials/physics/using_character_body_3d.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).

## Escenario adicional — CharacterBody3D con input independiente de cámara

```gdscript
# Fragmento ilustrativo: CharacterBody3D con mapa de acciones asignado.
@export var run_speed: float = 5.5
@export var jump_impulse: float = 5.0
@export var gravity: float = 18.0
func _physics_process(delta: float) -> void:
    if not is_on_floor():
        velocity.y -= gravity * delta
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_impulse
    var input_dir: Vector2 = Input.get_vector("left", "right", "forward", "back")
    var direction := Vector3(input_dir.x, 0.0, input_dir.y).normalized()
    velocity.x = direction.x * run_speed
    velocity.z = direction.z * run_speed
    move_and_slide()
```

**Decisión:** movimiento relativo al mundo vs cámara se define por género TPS/FPS, no copiar por defecto. **Pruebas:** pendientes/escalones, cámara libre, mouse capture/release, gamepad deadzone, caída y colisión. **Negativo:** aplicar `gravity` con el signo de 2D y hacer que el personaje suba indefinidamente.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Girar cuerpo y cámara vertical con misma rotación
- **❌ Incorrecto**: Girar cuerpo y cámara vertical con misma rotación.
- **✅ Correcto**: Separar yaw del CharacterBody3D y pitch de pivot/cámara.

### 02. Aplicar gravedad cada _process con delta variable
- **❌ Incorrecto**: Aplicar gravedad cada _process con delta variable.
- **✅ Correcto**: Física de CharacterBody3D en _physics_process.

### 03. Saltar repetidamente por mantener botón sin cooldown ni suelo
- **❌ Incorrecto**: Saltar repetidamente por mantener botón sin cooldown ni suelo.
- **✅ Correcto**: Detección edge e invariante de suelo.

### 04. Camera3D atraviesa paredes en tercera persona
- **❌ Incorrecto**: Camera3D atraviesa paredes en tercera persona.
- **✅ Correcto**: Raycast o collision adjustment y test estrecho.

### 05. Ignorar sensibilidad distinta para gamepad y mouse
- **❌ Incorrecto**: Ignorar sensibilidad distinta para gamepad y mouse.
- **✅ Correcto**: Curvas, límites, inversión y remapeo por dispositivo.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

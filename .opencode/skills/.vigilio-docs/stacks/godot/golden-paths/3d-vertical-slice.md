# Golden path 3D — exploración, animaciones, cámara y audio 3D

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** vertical slice de aventura 3D, TPS, juego de rol o simulación.

## Decisiones de arquitectura

1. Implementar CharacterBody3D con colisión, movimiento y cámara antes de importar modelos completos.
2. Importar personaje glTF y AnimationPlayer/AnimationTree para idle/run/jump/attack; no mezclar lógica de daño con track visual.
3. Añadir sonidos 3D espaciales, pasos, salto, ambiente y música por buses, con controles de volumen.
4. Perfilar escena cargada con materiales, colisiones, enemigos y objetivos de FPS según hardware real.

## Implementación de referencia

```text
scenes/world3d.tscn -> Node3D + WorldEnvironment + DirectionalLight3D
scenes/player3d.tscn -> CharacterBody3D + CollisionShape3D + Camera3D
                    -> AnimationPlayer + AnimationTree + AudioStreamPlayer3D
scripts/player3d.gd -> input/physics/events
resources/movement_config.tres -> velocidad/gravedad/salto
```

No es proyecto 3D ya compilado; documenta el orden de implementación y evidencias exigidas en el consumidor.

## Verificación obligatoria

- [ ] Movimiento con pendiente/escalón y colisiones correctamente importadas.
- [ ] Animaciones se transicionan sin duplicar ataques ni perder eventos.
- [ ] Sonido espacial se atenúa con distancia y no bloquea gameplay si falta audio.

## Casos adversarios y revisión

- ❌ Sincronizar daño crítico usando únicamente `animation_finished`.
- ❌ Declarar 3D probado sólo por parsear escenas headless.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — 3d movement](https://docs.godotengine.org/en/stable/tutorials/3d/3d_movement.html)
- [Godot — animation tree](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).

## Código mínimo 3D listo para probar con el motor

- [Golden path 3D movimiento, cámara y física](../../../examples/godot-3d-movement-golden-path/README.md).
- [QA UX y accesibilidad de juego](../testing/uxui-accessibility-playtest-matrix.md).

**Nota:** se entregan escenas y tests de lógica; ejecución gráfica 3D y exportación quedan `NOT_RUN` hasta disponer de Godot y runner visual.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Demostrar salto por valor velocity.y sin contacto con suelo
- **❌ Incorrecto**: Demostrar salto por valor velocity.y sin contacto con suelo.
- **✅ Correcto**: Test con colisión real CharacterBody3D sobre StaticBody3D.

### 02. Camera3D no asignada current y pantalla negra
- **❌ Incorrecto**: Camera3D no asignada current y pantalla negra.
- **✅ Correcto**: Cámara activa y comprobación de viewport en runtime.

### 03. Movimiento no respeta yaw de cámara cuando se pide tercera persona
- **❌ Incorrecto**: Movimiento no respeta yaw de cámara cuando se pide tercera persona.
- **✅ Correcto**: Transform de input contextual y test de rotación.

### 04. Ignorar colisiones al atravesar escalón/pared
- **❌ Incorrecto**: Ignorar colisiones al atravesar escalón/pared.
- **✅ Correcto**: Reproducir casos de borde del nivel con cuerpos reales.

### 05. Asumir que un parse válido prueba GPU/latencia
- **❌ Incorrecto**: Asumir que un parse válido prueba GPU/latencia.
- **✅ Correcto**: Ejecutar 3D en export compatible y medir frame time.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

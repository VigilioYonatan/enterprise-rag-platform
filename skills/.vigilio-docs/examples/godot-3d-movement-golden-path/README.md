# Golden path Godot 3D — movimiento, cámara, suelo y lógica probada

**Estado:** código preparado pero `Godot runtime = NOT_RUN` en el entorno que generó el ZIP; no es un E2E jugable certificado. Diseñado como demostración de mínima complejidad, sin audio/licencias externas ni backend.

## Layout

`project.godot`, `scenes/world.tscn` (suelo + personaje + cámara), `scripts/player.gd` (CharacterBody3D), `scripts/movement_rules.gd` (reglas testeables) y `tests/smoke_test.gd`.

## Uso con Godot 4.x instalado

```bash
godot --headless --path . --editor --import
godot --headless --path . --script res://tests/smoke_test.gd
godot --path .
```

Comprobar manualmente WASD, salto, aterrizaje, foco y cámara. En proyectos reales, definir InputMap en `project.godot` para remapeo; el script del ejemplo configura WASD solo si faltan acciones. Añadir colisiones complejas, sonidos, animaciones, HUD y controlador de cámara según género; no extrapolar controles de demo a FPS o simulador profesional.

## CI

La importación/headless comprueba reglas, carga de escena, colisiones declaradas y cámara activa; prueba de cámara, iluminación, colisiones, render y controles necesita Godot gráfico en runner y hardware declarado. El pipeline de release debe bloquear si esos E2E se requieren y no se ejecutan.

## ✅ Correcto / ❌ Incorrecto

- ✅ Correcto: entregar vertical slice concreto con test de reglas, documentar cómo reproducir y marcar ejecución sin motor como `NOT_RUN`.
- ❌ Incorrecto: llamar a una escena declarativa 3D «juego jugable 10/10» sin arrancarla con Godot.

[Estándar de 3D](../../stacks/godot/3d/character-camera-and-physics.md) · [QA UX/UI](../../stacks/godot/testing/uxui-accessibility-playtest-matrix.md)

# 2D — TileMapLayer, cámaras, mundos y colisiones

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** plataformas 2D, top-down, RPG, mapas y mundos con streaming.

## Decisiones de arquitectura

1. Usar el TileMapLayer de la versión del motor realmente instalada; no replicar APIs de Godot 3 o 4 antiguas sin verificar.
2. Separar tiles visuales, colisiones y navegación; etiquetar capas físicas para evitar disparos/colisiones accidentales.
3. Cámara suave con límites explícitos; fijar budgets para parallax, partículas, sombras y zoom.
4. Si hay mapas grandes, medir chunking/streaming antes de implementar un framework genérico.

## Implementación de referencia

```gdscript
# Camera2D bajo el jugador; activar suavizado únicamente tras medir motion sickness.
@onready var camera: Camera2D = $Camera2D

func configure_camera(bounds: Rect2i) -> void:
    camera.limit_left = bounds.position.x
    camera.limit_top = bounds.position.y
    camera.limit_right = bounds.end.x
    camera.limit_bottom = bounds.end.y
```

Guardar IDs de nivel y checkpoints, no referencias frágiles a posiciones de nodos del editor.

## Verificación obligatoria

- [ ] Colisiones de tile consistentes tras importar/reimportar TileSet.
- [ ] Límites de cámara en resoluciones distintas y pantallas ultrawide.
- [ ] Performance con mapas representativos de la plataforma objetivo.

## Casos adversarios y revisión

- ❌ Tile visual usado como verdad de colisión sin PhysicsLayer.
- ❌ Cámara sin límites que enseña el vacío del nivel.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — using tilemaps](https://docs.godotengine.org/en/stable/tutorials/2d/using_tilemaps.html)
- [Godot — 2d movement](https://docs.godotengine.org/en/stable/tutorials/2d/2d_movement.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Repetir tilemap en cada chunk sin ownership de coordenadas
- **❌ Incorrecto**: Repetir tilemap en cada chunk sin ownership de coordenadas.
- **✅ Correcto**: Definir grid/transform de mundo y streaming medido.

### 02. Camera2D sigue al jugador con sacudida descontrolada
- **❌ Incorrecto**: Camera2D sigue al jugador con sacudida descontrolada.
- **✅ Correcto**: Smoothing, límites y feedback de cámara ajustable.

### 03. Descartar colisiones del TileSet al exportar
- **❌ Incorrecto**: Descartar colisiones del TileSet al exportar.
- **✅ Correcto**: Testear capas/máscaras de física en build.

### 04. Colocar enemigos fuera de área cargada sin persistencia
- **❌ Incorrecto**: Colocar enemigos fuera de área cargada sin persistencia.
- **✅ Correcto**: Gestionar spawn/despawn con estado por región.

### 05. Usar layers visuales como sustituto de navegación
- **❌ Incorrecto**: Usar layers visuales como sustituto de navegación.
- **✅ Correcto**: Generar rutas/colisiones separadas y comprobar accesibilidad del nivel.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

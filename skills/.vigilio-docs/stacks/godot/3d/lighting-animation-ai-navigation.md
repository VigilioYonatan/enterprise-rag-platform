# 3D — importación, iluminación, animación y navegación

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** juegos 3D con modelos, animación esquelética, enemigos y mundos.

## Decisiones de arquitectura

1. Importar `.glb/.gltf` como formato preferente de intercambio; documentar exportador y versiones Blender, escalas, orientación, rig y animaciones.
2. `AnimationPlayer` almacena clips; `AnimationTree` gestiona blends y transiciones. Evitar if-else encadenados en scripts de UI para estados complejos.
3. `NavigationAgent3D` guía navegación, pero no sustituye física ni control de colisión; recalcular rutas con budget y evitar pathfinding por frame si no cambian destinos.
4. Definir iluminación por plataforma/renderer, LOD, sombras y budgets; comparar iluminación precalculada/dinámica y perfilar en hardware real.

## Implementación de referencia

```gdscript
# Un AnimationTree reutiliza clips del AnimationPlayer asociado.
@onready var animation_tree: AnimationTree = $AnimationTree

func set_movement_blend(speed_ratio: float) -> void:
    animation_tree.set("parameters/Locomotion/blend_position", clampf(speed_ratio, 0.0, 1.0))
```

El path de `parameters/...` debe coincidir con el árbol real del consumidor: no copiarlo ciegamente.

## Verificación obligatoria

- [ ] Modelos animados importados sin perder escala, root motion ni materiales.
- [ ] State transitions idle/run/attack sin duplicar daño o invocar ataques múltiples.
- [ ] Navigation mesh recargado y agentes sin atravesar obstáculos.

## Casos adversarios y revisión

- ❌ Path de AnimationTree inventado que no existe en la escena.
- ❌ Perseguir al jugador recalculando ruta cada frame sin necesidad.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — animation tree](https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html)
- [Godot — index](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/index.html)
- [Godot — navigation introduction 3d](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_introduction_3d.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Reconstruir navegación 3D en cada frame
- **❌ Incorrecto**: Reconstruir navegación 3D en cada frame.
- **✅ Correcto**: Bake/update NavMesh en eventos previstos, evaluar coste.

### 02. Crear luces dinámicas sin presupuesto en hardware móvil
- **❌ Incorrecto**: Crear luces dinámicas sin presupuesto en hardware móvil.
- **✅ Correcto**: LOD, baking y profiler GPU por plataforma.

### 03. Iniciar AnimationTree transición sin estados válidos
- **❌ Incorrecto**: Iniciar AnimationTree transición sin estados válidos.
- **✅ Correcto**: Estados/transiciones y blend validados por acción.

### 04. IA persigue al jugador aun sin line-of-sight
- **❌ Incorrecto**: IA persigue al jugador aun sin line-of-sight.
- **✅ Correcto**: Percepción con distancia, visibilidad y estados de fallback.

### 05. Instanciar geometría pesada sin culling
- **❌ Incorrecto**: Instanciar geometría pesada sin culling.
- **✅ Correcto**: Occlusion/LOD/instancing tras profiling y capturas.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

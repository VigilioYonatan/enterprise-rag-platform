# Godot — `scripts/`, `resources/`, `scenes/` y `shared/` según ownership

**Owner:** `stacks/godot/core/`, [estándar transversal](../../../standards/engineering/file-and-symbol-ownership.md) y [scene organization](scenes-nodes-resources.md). Referencia: https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html.

## Godot 2D/3D, GDScript

```text
game/
├── project.godot
├── scenes/
│   ├── actors/player.tscn
│   ├── ui/hud.tscn
│   └── levels/level_01.tscn
├── features/
│   ├── player/
│   │   ├── player.gd
│   │   ├── movement_config.gd   # Resource tipado
│   │   ├── movement_config.tres
│   │   ├── player_audio.gd
│   │   └── tests/
│   └── inventory/
├── shared/
│   └── ui/                     # Solo cuando reutilizado realmente
├── assets/{audio,art,fonts}/
└── tests/
```

- `const SPEED := 220.0` dentro de `player.gd` es válido si solo ese jugador lo usa; **NO** crear `const/` para cada uno.
- `@export var movement: MovementConfig` es mejor para parámetros que diseñadores balancean entre personajes; `MovementConfig extends Resource` vive en el feature propietario.
- Input actions se configuran en `project.godot`/InputMap y se nombran semánticamente. Señales (`jumped`, `landed`) comunican gameplay/audio; **player no importa SFX global**.
- `autoload` es para servicios globales con estado realmente global, no para cada recurso. Una escena reutilizable debe minimizar rutas absolutas a otros nodos.

```gdscript
# features/player/movement_config.gd
class_name MovementConfig
extends Resource
@export_range(1.0, 1000.0) var run_speed: float = 220.0
@export_range(1.0, 1000.0) var jump_impulse: float = 360.0
```

```gdscript
# features/player/player.gd — extracto, no escena completa
@export var movement: MovementConfig
signal jumped
func start_jump() -> void:
    velocity.y = -movement.jump_impulse
    jumped.emit()
```

Para juegos 3D la gravedad suele aplicarse al eje Y con signo opuesto al salto; validar el sentido con el motor y el eje del proyecto, nunca copiar el código 2D al personaje 3D sin adaptar. Audio/animación reaccionan a señal y controlan frecuencia/cooldown.

## C# Godot

```text
Scripts/Features/Player/PlayerController.cs
Scripts/Features/Player/MovementConfig.cs
Scripts/Features/Inventory/InventoryService.cs
```

Usar namespaces por feature y `Resource`/`[GlobalClass]` donde corresponda a la versión .NET, clases parciales al derivar de `Node`, convenciones C# de nombres y señales Godot reales. No crear carpetas C# `const/`, `types/`, `interfaces/`, `libs/` por obligación; un `const` local sigue siendo legítimo. Verificar exportación de C# para OS de destino antes de elegirlo.

**Gates:** parse/import, scripts tests reales, input/physics, sample scenes, UI gamepad, audio manual, perfiles, performance, export. Ausencia Godot => `BLOCKED` para ejecución, no PASS.

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Crear Resource configurable para parámetros reutilizados y emitir señal jumped.
- ❌ **Incorrecto:** Poner todos los números mágicos en autoload global o abrir escenas sin prueba.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Exportar constantes gameplay en singleton universal
- **❌ Incorrecto**: Exportar constantes gameplay en singleton universal.
- **✅ Correcto**: Agrupar por dominio/feature y Resource propietario.

### 02. Crear helpers.gd con lógica de guardado y sonido mezcladas
- **❌ Incorrecto**: Crear helpers.gd con lógica de guardado y sonido mezcladas.
- **✅ Correcto**: Separar servicios por responsabilidad, señales para feedback.

### 03. Poner tipos C# de juego en clase MainMenu
- **❌ Incorrecto**: Poner tipos C# de juego en clase MainMenu.
- **✅ Correcto**: Namespace/modelo de dominio independiente de UI.

### 04. Duplicar salud máxima en HUD y en Enemy
- **❌ Incorrecto**: Duplicar salud máxima en HUD y en Enemy.
- **✅ Correcto**: Estado dueño en entidad; HUD observa señal.

### 05. Mover cada variable del salto a const/ global
- **❌ Incorrecto**: Mover cada variable del salto a const/ global.
- **✅ Correcto**: Valores por escena o Resource cuando hay variación, temporales en script local.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

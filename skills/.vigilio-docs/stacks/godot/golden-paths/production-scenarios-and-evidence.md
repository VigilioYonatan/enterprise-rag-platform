# Diez escenarios Godot 2D/3D — decisiones, ejemplos y evidencia real

**Estado:** playbook técnico y casos de aceptación; no certifica comportamiento gráfico sin motor. Complementa [2D](2d-jump-audio-vertical-slice.md), [3D](3d-vertical-slice.md), [audio](../audio/music-sfx-and-mixing.md), [backend](../networking/backend-api-integration.md) y [UX game](../ui/game-ux-accessibility-and-art-direction.md).

| Tipo de juego | Regla de ownership / interfaz | Ejemplo de aceptación medible | Prueba negativa |
|---|---|---|---|
| Plataformas 2D | Jugador emite `jumped`; audio responde; HUD no conoce física | Salto permitido en suelo, buffer/coyote time si es requisito | Mantener salto infinito fuera de suelo |
| Metroidvania | Abilities en Resource/estado, niveles desacoplados | Habilidad desbloqueada persiste y cambia rutas permitidas | Save viejo pierde habilidad |
| RPG 2D | Inventario independiente del HUD, IDs únicos estables | Equipar item actualiza stats y se guarda | Duplicación por doble evento |
| Roguelike | Semilla y generador reproducibles, logs de run | Misma semilla+versión recrea layout determinista | Dos jugadores obtienen un estado diferente |
| Top-down shooter | Munición/daño en gameplay, VFX observador | Cadencia y hit registration correctos bajo 100 ms ficticios | Animación causa doble daño |
| Puzzle | Estado de puzzle determinista separado de Control | Undo/redo restaura estado y se anuncia accesiblemente | Entrada rápida rompe solvencia |
| Carrera 3D | Física en `RigidBody3D`/simulación, HUD velocidad | FPS y frame-time medidos en dispositivo | Física cambia con frames visuales |
| Aventura TPS 3D | CharacterBody3D, cámara, navegación con ownership | Movimiento+cámara+colisiones y foco UI probados | Colisión atraviesa pared inclinada |
| Juego musical | Playback/cues + calibración y opciones visuales | Latencia audio/video calibrable y fallback visual | Sin audio la partida es imposible sin alternativa |
| Multiplayer cooperativo | Servidor autoritativo, predicción limitada | Reconexion, replay rechazado, snapshot versionado | Cliente reclama moneda/daño sin autoridad |

## Ejemplo A — audio y animación desacoplados

```gdscript
# Player.gd (extracto)
signal jumped
signal landed
func on_valid_jump() -> void:
    jumped.emit()
```

```gdscript
# PlayerFeedback.gd (extracto, Node asociado por editor)
@export var jump_player: AudioStreamPlayer2D
@export var animation_player: AnimationPlayer
func on_player_jumped() -> void:
    if jump_player != null and jump_player.stream != null:
        jump_player.play()
    if animation_player != null and animation_player.has_animation("jump"):
        animation_player.play("jump")
```

Conectar señal `jumped` desde escena; no interpolar `AnimationPlayer` de forma que controle mecánica crítica del salto. SFX no debe dispararse varias veces por repetir input sin salto válido.

## Ejemplo B — HUD/gamestate no inventa fuente de verdad

```gdscript
# HUD.gd (extracto)
func render_health(current_health: int, max_health: int) -> void:
    health_bar.max_value = max_health
    health_bar.value = clampi(current_health, 0, max_health)
```

El HUD consume cambios de un `HealthComponent`, no escribe HP por animación ni por datos del servidor no validados. Fijar foco, contraste, opciones de escala/subtítulos e input rebind antes de release.

## Ejemplo C — score/saves y backend

- Offline: `user://` con escritura atómica/temporal, versionado y backup verificable; no incluir tokens o claves privilegiadas.
- Online: DTO JSON versionado, autenticación apropiada, timeout/cancelación, idempotencia, retry con backoff medido. **Nunca aceptar moneda premium, daño o ranking desde cliente sin verificación server-side.**
- Multiplayer: simular lag, duplicados, desconexión y orden de mensajes; comprobar estado autoritativo y replay protection.

## Ejemplo D — UI y diseño original por género

- RPG: densidad controlada, estados del inventario, contadores legibles, layouts gamepad y opciones de subtítulo.
- Plataformas: HUD mínimo, feedback de daño y sonido opcional; soporte rebind y reduced motion cuando corresponda.
- Terror: contraste legible **aunque** la atmósfera sea oscura; no transmitir pistas críticas solo por audio o color.
- Estrategia: tooltips controlables por teclado/gamepad, zoom configurable, mapas de foco y presupuesto de draw calls.

## Matriz de prueba que debe ejecutar el consumidor

PR: parse/import + unit rules + scene integration + assets existe. Nightly: input grabado, física 2D/3D, gamepad, localización, pantallas escaladas, audio buses, performance. Release: export, instalación, licencias, accesibilidad manual y juego real. Para cada check reportar `PASS/FAIL/BLOCKED/NOT_RUN` y versión exacta de Godot. **Sin Godot aquí, el estado de ejecución gráfica sigue `NOT_RUN`.**

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Verificar salto/sonido en Godot real y reportar solo `PASS` tras ejecución.
- ❌ **Incorrecto:** Confundir referencias `.tscn` existentes con gameplay y audio verificados.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Usar una arquitectura universal para platformer, RPG y ritmo
- **❌ Incorrecto**: Usar una arquitectura universal para platformer, RPG y ritmo.
- **✅ Correcto**: Por género, elegir loop, estado y latencia dominante.

### 02. Prometer MMORPG por un RPC de chat funcional
- **❌ Incorrecto**: Prometer MMORPG por un RPC de chat funcional.
- **✅ Correcto**: Separar arquitectura online, escala y observabilidad de vertical slice.

### 03. Optimizar RPG 3D igual que un puzzle 2D
- **❌ Incorrecto**: Optimizar RPG 3D igual que un puzzle 2D.
- **✅ Correcto**: Presupuestos GPU/streaming versus accesibilidad de controles.

### 04. Mezclar economía singleplayer y microtransacción en una función
- **❌ Incorrecto**: Mezclar economía singleplayer y microtransacción en una función.
- **✅ Correcto**: Separar monedas del juego de pagos reales y políticas antifraude.

### 05. Marcar 10/10 con capturas y sin usuarios
- **❌ Incorrecto**: Marcar 10/10 con capturas y sin usuarios.
- **✅ Correcto**: Evidencia de pruebas repetibles, playtesting, export y métricas por plataforma.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

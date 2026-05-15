# Audio — música, SFX de salto, impacto, ambiente y mezcla

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** diseño sonoro jugable 2D/3D y accesible.

## Decisiones de arquitectura

1. Crear buses Master, Music, SFX, UI, Ambience; usar `AudioStreamPlayer` para UI/música, `AudioStreamPlayer2D/3D` para fuentes espaciales.
2. Eventos de gameplay (jumped/landed/attack) disparan sonidos con límites de instancias y variación moderada para evitar clipping. El silencio no debe romper gameplay.
3. Música por estado (menú, exploración, combate), transiciones con crossfade sin reiniciar el tema cada frame; volumen de usuario persistido en escala adecuada.
4. Respetar derechos/licencias y metadatos de audio (autor, licencia, uso, versión). Evaluar latencia/dispositivos, fallback sin audio y subtítulos/captions para sonidos críticos.

## Implementación de referencia

```gdscript
# Componente de audio en la escena del personaje.
extends Node
@onready var jump_sfx: AudioStreamPlayer2D = $JumpSfx
@onready var land_sfx: AudioStreamPlayer2D = $LandSfx

func on_player_jumped() -> void:
    if jump_sfx.stream != null:
        jump_sfx.pitch_scale = randf_range(0.97, 1.03)
        jump_sfx.play()

func on_player_landed() -> void:
    if land_sfx.stream != null:
        land_sfx.play()
```

El `JumpSfx` debe tener `bus = "SFX"` en la escena; audio de nivel ambientado puede usar `AudioStreamPlayer2D/3D`.

## Consideraciones Senior/Staff

**Matriz sugerida de autoría:** Evento | archivo | bus | ganancia objetivo | loop | prioridad | polifonía | variaciones | fallback | licencia. No agregar música de terceros sin confirmar derechos de distribución.

## Verificación obligatoria

- [ ] Revisar ruteo de buses y que Master/Music/SFX se controlen por separado.
- [ ] 100 saltos consecutivos no provocan clipping, filtración de nodes ni superposición excesiva.
- [ ] Música se pausa/reanuda coherentemente y no se duplica al recargar nivel.
- [ ] Una persona sin audio entiende los eventos clave por efectos visuales/subtítulos.

## Casos adversarios y revisión

- ❌ Reproducir el sonido desde `jump` modificando reglas de física.
- ❌ Ajustar volumen global de Master para mutear únicamente música.
- ❌ SFX con licencia desconocida.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — audio buses](https://docs.godotengine.org/en/stable/tutorials/audio/audio_buses.html)
- [Godot — audio streams](https://docs.godotengine.org/en/stable/tutorials/audio/audio_streams.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).

## Escenario adicional — bus de música y eventos de salto sin acoplamiento

```gdscript
# PlayerAudio.gd: observador; los nodos se conectan por escena/señal.
extends Node
@export var jump_sfx: AudioStreamPlayer2D
@export var music: AudioStreamPlayer
func on_jumped() -> void:
    if jump_sfx != null and jump_sfx.stream != null:
        jump_sfx.play()
func set_music_volume(linear: float) -> void:
    var idx := AudioServer.get_bus_index("Music")
    if idx >= 0:
        AudioServer.set_bus_volume_db(idx, linear_to_db(clampf(linear, 0.001, 1.0)))
```

El proyecto debe declarar realmente el bus `Music`; no confiar en nombre inventado. **Pruebas:** mute, master vs SFX, transición de escena, reinicio, sonidos simultáneos, subtítulos y fallback visual si el audio falla. **Negativo:** iniciar 30 instancias de música al abrir 30 escenas; controlar persistencia solo cuando corresponde.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Un AudioStreamPlayer creado para cada sonido cada frame
- **❌ Incorrecto**: Un AudioStreamPlayer creado para cada sonido cada frame.
- **✅ Correcto**: Reutilizar nodos/pool; medir voces simultáneas.

### 02. Salto produce sonido 20 veces al mantener tecla
- **❌ Incorrecto**: Salto produce sonido 20 veces al mantener tecla.
- **✅ Correcto**: Señal jumped emitida solo al aceptar el salto.

### 03. Música, diálogo y SFX en bus Master sin controles
- **❌ Incorrecto**: Música, diálogo y SFX en bus Master sin controles.
- **✅ Correcto**: Separar Music/SFX/Voice con volumen persistente y mute.

### 04. Audio 3D sin atenuación y posición espacial
- **❌ Incorrecto**: Audio 3D sin atenuación y posición espacial.
- **✅ Correcto**: AudioStreamPlayer3D con rango/atenuación y mix probado.

### 05. Depender solo de audio para indicar daño/objetivo
- **❌ Incorrecto**: Depender solo de audio para indicar daño/objetivo.
- **✅ Correcto**: Feedback visual y subtítulos/cues accesibles.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

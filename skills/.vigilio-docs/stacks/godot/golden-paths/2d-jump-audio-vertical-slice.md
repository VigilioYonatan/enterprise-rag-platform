# Golden path 2D — salto, animación, música y SFX

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** vertical slice de juego de plataformas 2D verificable.

## Decisiones de arquitectura

1. Fase 1: escena CharacterBody2D + colisión + plataforma + input; probar salto y aterrizaje antes de VFX.
2. Fase 2: signal `jumped` emite audio SFX/animación; bus SFX separado de Music y eventos idempotentes.
3. Fase 3: menú/pausa y audio mix, checkpoint, reintento y pruebas de accesibilidad.
4. Fase 4: importación, unit/smoke headless, jugabilidad real y release gate, sin falsos PASS.

## Implementación de referencia

```text
project.godot
scenes/world.tscn
scenes/player.tscn                 # CharacterBody2D + CollisionShape2D
scripts/player.gd                  # input, gravity, move_and_slide, jumped
scripts/player_audio.gd            # AudioStreamPlayer2D, bus SFX
assets/audio/sfx/jump.wav
assets/audio/music/level.ogg
tests/smoke_test.gd
```

La implementación de salto y audio se encuentra en las guías especializadas; para una referencia real consultar el proyecto de ejemplo incluido en el ZIP bajo `vigilio-docs/examples/godot-2d-jump-audio/`.

## Verificación obligatoria

- [ ] Probar salto sobre plataforma, no salto infinito, pausa y sonido exactamente una vez.
- [ ] Silenciar música y mantener SFX independiente, silenciar todo y conservar controles.
- [ ] Ejecutar script de prueba headless; jugar el binario con ventana en dispositivo objetivo.

## Casos adversarios y revisión

- ❌ Declarar completado el golden path si solo aparece una escena vacía.
- ❌ Usar asset sin origen/licencia verificada.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — 2d movement](https://docs.godotengine.org/en/stable/tutorials/2d/2d_movement.html)
- [Godot — audio buses](https://docs.godotengine.org/en/stable/tutorials/audio/audio_buses.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Probar solo fórmula de salto sin instanciar Player.tscn
- **❌ Incorrecto**: Probar solo fórmula de salto sin instanciar Player.tscn.
- **✅ Correcto**: Cargar escena, comprobar colisión, salto y aterrizaje real.

### 02. Animación de salto se dispara incluso si cuerpo no saltó
- **❌ Incorrecto**: Animación de salto se dispara incluso si cuerpo no saltó.
- **✅ Correcto**: Señal jumped solo tras condición física válida.

### 03. Agregar SFX pero no conectar señal de jugador a nodo audio
- **❌ Incorrecto**: Agregar SFX pero no conectar señal de jugador a nodo audio.
- **✅ Correcto**: Integración escena/señales y prueba de cantidad de reproducciones.

### 04. Pausar juego y dejar SFX o física inconsistentes
- **❌ Incorrecto**: Pausar juego y dejar SFX o física inconsistentes.
- **✅ Correcto**: Definir process mode y verificar pause/resume.

### 05. Marcar export 2D aprobada tras validar texto de escena
- **❌ Incorrecto**: Marcar export 2D aprobada tras validar texto de escena.
- **✅ Correcto**: Ejecutar Godot real y export en runner objetivo.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Godot UX — HUD, accesibilidad, personalidad y controles

**Estado:** norma vigente, no certificación de implementación. **Owner:** `stacks/`. **Alcance:** Diseñar interfaces originales para plataformas, RPG, FPS, simulación, puzzle, estrategia, carreras y móvil..

## Decisiones arquitectónicas y de producto

- Genre-first: plataformas pide feedback inmediato de salto/colisión/respawn; RPG pide inventario y legibilidad de ítems; FPS prioriza crosshair/no obstaculización; estrategia busca densidad/táctica, filtros y atajos; móvil toca thumbs/safe area; horror usa tensión sin negar subtítulos o enfoque. - Proporcionar gamepad/teclado/touch y remapeo conforme contexto; separar entrada `ui_*` de acciones de gameplay. - Ofrecer tamaño HUD, contraste, sensibilidad, subtítulos/captions, volumen por bus, alternativa al color, reducción de flashes/camera shake. - El arte diegético no justifica botones invisibles o feedback solo sonoro. - Probar pantallas de fail/retry y pérdida de mando/red.

## Contrato implementable / ejemplo verificable

**Matriz de escenarios**:
```text
plataformas 2D: salto → SFX + partícula breve + aterrizaje → pausa → reanudar
RPG 3D: loot → inventario → tooltip accesible → equipar → guardar
carreras: cambio de vuelta → audio + texto/HUD → low visibility → replay
online: desconexión → aviso accionable → reconectar o salir
```

Cada género exige dirección visual de marca distinta. La IA puede proponer, no certificar playtest.

## Testing, revisión y criterios de aceptación

- [ ] Control remapping real + foco y menús con gamepad.
- [ ] Toggle subtítulos y reducción camera shake/motion, audio mixer separado.
- [ ] Localización, dificultad, opciones de asistencia cuando corresponda.
- [ ] Pruebas en dispositivo de entrada objetivo; status `NOT_RUN` si no se ejecuta.

## Anti-patrones y riesgos

- FPS con crosshair que tapa avisos indispensables.
- Modo horror que no permite leer menús por estética.
- Botón de salto solo táctil sin alternativa de controlador declarado.



## Referencias oficiales y fuentes canónicas

- [Godot focus](https://docs.godotengine.org/en/stable/tutorials/ui/gui_navigation.html)
- [Audio](../audio/music-sfx-and-mixing.md)
- [Normas UX](../../../standards/experience/README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** FPS con crosshair que tapa avisos indispensables.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Copiar HUD de RPG a juego musical por moda
- **❌ Incorrecto**: Copiar HUD de RPG a juego musical por moda.
- **✅ Correcto**: Dirección de arte y lenguaje de interacción según género y ritmo.

### 02. Diseñar VFX que impiden leer proyectiles o plataformas
- **❌ Incorrecto**: Diseñar VFX que impiden leer proyectiles o plataformas.
- **✅ Correcto**: Jerarquía visual según tarea, contraste y pruebas de gameplay.

### 03. Indicar ataque enemigo solo con audio
- **❌ Incorrecto**: Indicar ataque enemigo solo con audio.
- **✅ Correcto**: Preaviso visual y opción de subtítulos/cues alternativos.

### 04. Usar motion blur/flash obligatorio en cada daño
- **❌ Incorrecto**: Usar motion blur/flash obligatorio en cada daño.
- **✅ Correcto**: Ajustes de flashes, cámara y motion con límites.

### 05. Usar solo click/tap para flujo en consola
- **❌ Incorrecto**: Usar solo click/tap para flujo en consola.
- **✅ Correcto**: Plan de gamepad, focus y navegación cross-device desde inicio.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

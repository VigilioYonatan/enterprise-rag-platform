# Godot QA UX/UI — evaluación de menú, HUD, sonido y jugabilidad

**Estado:** norma vigente, no certificación de implementación. **Owner:** `stacks/`. **Alcance:** Matrices reales de tests visuales, motor, audio, controlador y accesibilidad..

## Decisiones arquitectónicas y de producto

- Separar tests de lógica GDScript de interacción real con renderer, audio, mando y periféricos. - Validar navegación con teclado/mando, cambios de foco entre menús, pausa, escena, textos dinámicos y game over. - Probar mix de música/SFX y categorías, subtítulos, localización, vibración opcional. - Verificar frame pacing, HUD escalado y ausencia de información crítica oculta. - Toda evidencia incluye motor/build, OS, renderer, resolución, entrada, idioma, resultado y captura/logs autorizados.

## Contrato implementable / ejemplo verificable

| Escenario | Runner | Éxito verificable |
|---|---|---|
| menú con gamepad | Godot GUI | llegar a jugar sin ratón |
| salto + aterrizaje | Godot con físicas | transición/sfx exactos y estados coherentes |
| audio silenciado | audio real + manual | ninguna pista crítica exclusivamente acústica |
| texto largo | Godot GUI | no clipping ni botón invisible |
| 3D low-end | máquina objetivo | FPS/latencia dentro del presupuesto aprobado |
| headless import | CI | assets importan; **no** prueba UI/audio |

**Fixture negativos**: botón fuera de foco, clip de subtítulos, bus SFX muteado por error, HUD fuera de safe area.

## Testing, revisión y criterios de aceptación

- [ ] UI E2E y pruebas manuales de sonido NO deben decir PASS sin ejecución real.
- [ ] Registrar número de casos y fallos por plataforma.
- [ ] Describir excepciones de accesibilidad por input esencial de juego, con alternativa cuando viable.
- [ ] Release bloqueado si matriz crítica no aprobada.

## Anti-patrones y riesgos

- Tratar `godot --headless --import` como juego jugable.
- Screenshot perfecto con mando desconectado.
- Un sonido de salto WAV presente se confunde con reproducción real.



## Referencias oficiales y fuentes canónicas

- [Gates Godot](quality-gates.md)
- [UX QA](../../../standards/experience/ux-quality-gates-and-ci-cd.md)
- [Godot CLI](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Tratar `godot --headless --import` como juego jugable.

## Matriz de playtest instrumentada — ejemplo RPG 3D

| Paso | Dispositivo y criterio de aprobación | Estado inicial de evidencia |
|---|---|---|
| Abrir inventario durante combate | Gamepad permite cerrar sin perder foco de gameplay | `NOT_RUN` hasta test real |
| Cambiar idioma | Texto largos permanece visible a escalas UI diferentes | `NOT_RUN` |
| Activar subtítulos y desactivar SFX | La misión se comprende sin audio y con cues visuales | `NOT_RUN` |
| Aumentar tamaño de UI | HUD crítico sigue legible en pantalla pequeña | `NOT_RUN` |
| Pausar/reanudar con teclado y mando | Tiempo y foco restaurados correctamente | `NOT_RUN` |
| FPS reducido | Menús siguen operables y lógica de salto no depende del frame | `NOT_RUN` |

**Correcto:** registrar configuración, hardware, input, vídeo/replay y resultado de cada criterio. **Incorrecto:** marcar todos PASS porque una escena contiene un botón `Button`.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Validar menús solo con ratón
- **❌ Incorrecto**: Validar menús solo con ratón.
- **✅ Correcto**: Matriz teclado, gamepad, touch y rebind según plataforma.

### 02. Comprobar contraste con captura estática y olvidar acción in-game
- **❌ Incorrecto**: Comprobar contraste con captura estática y olvidar acción in-game.
- **✅ Correcto**: Test de HUD en gameplay intenso con overlays y fondos dinámicos.

### 03. Afirmar audio accesible tras existir bus Music
- **❌ Incorrecto**: Afirmar audio accesible tras existir bus Music.
- **✅ Correcto**: Evaluar cues alternativos, mute y subtítulos con participantes.

### 04. Usar cinco testers desarrolladores como representación de todos
- **❌ Incorrecto**: Usar cinco testers desarrolladores como representación de todos.
- **✅ Correcto**: Reclutar perfiles relevantes y registrar método/limitaciones.

### 05. Resolver feedback con promedio de satisfacción únicamente
- **❌ Incorrecto**: Resolver feedback con promedio de satisfacción únicamente.
- **✅ Correcto**: Usabilidad por tarea: fallos, tiempo, abandono y evidencia cualitativa.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

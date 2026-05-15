# Rendimiento Godot — FPS, memoria, audio, 2D/3D

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** desktop, mobile, web y hardware acotado.

## Decisiones de arquitectura

1. Definir presupuesto objetivo por plataforma (FPS, p95 frame time, memory, draw calls, audio voices, size); medir antes y después de optimizar.
2. 2D: TileMaps, overdraw, partículas, colisiones y señales; 3D: draw calls, meshes, LOD, luces, sombras, streaming y VRAM.
3. No descargar todo al inicio; gestionar assets de niveles/transiciones, evitar escenas y buffers retenidos. Medir stutters de compilación de shaders donde corresponda.
4. Audio: controlar voces concurrentes, streaming de música, latencia y budgets en móviles; probar devices de baja gama.

## Implementación de referencia

```text
Budget ejemplo (NO requisito universal):
PC 60 FPS -> 16.67 ms/frame; 3D mobile 30 FPS -> 33.33 ms/frame.
Medir: p50/p95/p99 frame time, CPU main thread, GPU frame,
VRAM, RAM, draw calls, número de audio voices y tiempo de carga.
Escenario de referencia: nivel_01 + 12 enemigos + partículas + música.
```

No declarar metas universales sin conocer hardware y género del juego.

## Verificación obligatoria

- [ ] Perfil con VSync/limitador según metodología y hardware documentados.
- [ ] Frame pacing y p95 al activar SFX/música y transicionar niveles.
- [ ] Comparar antes/después de cualquier optimización significativa.

## Casos adversarios y revisión

- ❌ 60FPS medidos en menú vacío equivalen a 60FPS en combate.
- ❌ Quitar accesibilidad o sonido de impacto para mejorar FPS sin analizar causa.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — general optimization](https://docs.godotengine.org/en/stable/tutorials/performance/general_optimization.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Determinar FPS por intuición desde PC de desarrollo
- **❌ Incorrecto**: Determinar FPS por intuición desde PC de desarrollo.
- **✅ Correcto**: Metas FPS y ms/frame por hardware objetivo, medir en export.

### 02. Optimizar cada escena sin profiling
- **❌ Incorrecto**: Optimizar cada escena sin profiling.
- **✅ Correcto**: Capturar CPU/GPU/memoria y priorizar top bottlenecks.

### 03. Usar demasiados lights 3D dinámicos en gama baja
- **❌ Incorrecto**: Usar demasiados lights 3D dinámicos en gama baja.
- **✅ Correcto**: Ajustar calidad con pruebas de compatibilidad.

### 04. Cargar todos los niveles de mundo de una vez
- **❌ Incorrecto**: Cargar todos los niveles de mundo de una vez.
- **✅ Correcto**: Streaming/LOD según profiling y experiencia.

### 05. Reducir resolución UI hasta ser ilegible para ahorrar GPU
- **❌ Incorrecto**: Reducir resolución UI hasta ser ilegible para ahorrar GPU.
- **✅ Correcto**: Optimizar draw calls sin sacrificar tamaños legibles.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

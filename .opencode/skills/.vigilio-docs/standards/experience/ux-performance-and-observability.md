# UX performance y observabilidad por plataforma

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Medir rapidez percibida, latencia de control y estabilidad visual..

## Decisiones arquitectónicas y de producto

1. Definir presupuesto de experiencia según plataforma, equipo y dispositivo de referencia, nunca copiar un SLA universal. 2. Web: instrumentar LCP, INP, CLS, carga de recursos y regresiones de rutas críticas; diagnosticar React renders, fuentes, imágenes y JS. 3. Desktop: first interactive frame, apertura archivo, latencia de comandos, memoria, bloqueo UI. 4. Mobile: TTI/first usable, cold start, jank, offline, batería y redes lentas. 5. Godot: frame pacing, CPU/GPU, sobrecoste Control/HUD, draw calls, audio voices, partículas y devices de gama baja. 6. Observabilidad debe anonimizar y respetar consentimiento; no capturar importes/pantallas sensibles por defecto.

## Contrato implementable / ejemplo verificable

```text
presupuesto: definido por producto
baseline: captura en entorno fijo (hardware, versión, escena, dataset)
gate: mismo experimento + distribución + tolerancia
resultado: PASS / FAIL / BLOCKED / NOT_RUN
```

Ejemplo Godot 60 fps implica ~16.7 ms de presupuesto medio por frame, pero la meta real depende de plataforma y experiencia; no confundir promedio con p95/p99 de frame pacing.

## Testing, revisión y criterios de aceptación

- [ ] Registrar baseline, dispositivo, versión, método, muestras y ruido.
- [ ] Performance CI no compara portátiles distintos sin normalizar.
- [ ] Instrumentar errores de operación crítica sin exponer PII.
- [ ] Rendimiento medido en UI real, no deducido por número de nodos.

## Anti-patrones y riesgos

- Declarar "optimizado" tras eliminar sombras sin medición.
- Capturar movimientos/valores bancarios de usuarios en telemetría.
- Usar 60 FPS como único indicador UX.



## Referencias oficiales y fuentes canónicas

- [Web Vitals](https://web.dev/articles/vitals)
- [Godot profiler](https://docs.godotengine.org/en/stable/tutorials/scripting/debug/the_profiler.html)
- [Guía UX/UI transversal](README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Declarar "optimizado" tras eliminar sombras sin medición.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Optimizar Lighthouse y olvidar input latency en desktop IDE
- **❌ Incorrecto**: Optimizar Lighthouse y olvidar input latency en desktop IDE.
- **✅ Correcto**: Medir latencia de interacción real por plataforma.

### 02. Skeleton que parpadea 100 ms por todas partes
- **❌ Incorrecto**: Skeleton que parpadea 100 ms por todas partes.
- **✅ Correcto**: Threshold y feedback sólo cuando evita incertidumbre.

### 03. Cargar cientos de imágenes hero full-res en móvil
- **❌ Incorrecto**: Cargar cientos de imágenes hero full-res en móvil.
- **✅ Correcto**: Responsive images/compresión y métricas de memoria/tiempo.

### 04. Instrumentar funnels enviando PII al tracker
- **❌ Incorrecto**: Instrumentar funnels enviando PII al tracker.
- **✅ Correcto**: Telemetría minimizada con consentimiento y sin secretos.

### 05. Animación GPU intensa en dispositivo de gama baja
- **❌ Incorrecto**: Animación GPU intensa en dispositivo de gama baja.
- **✅ Correcto**: Budget de frames y modo reducido testeado.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

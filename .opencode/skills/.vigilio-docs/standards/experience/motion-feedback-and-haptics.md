# Motion, microinteracciones, feedback y háptica

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Respuesta rápida, expresiva, consistente, accesible y con presupuesto de render..

## Decisiones arquitectónicas y de producto

1. Cada motion debe comunicar causa/estado/relación espacial; si es decorativo, puede eliminarse. 2. Definir duraciones como tokens + curvas justificadas; entrada, salida y cancelación coherentes. 3. Reducir movimiento según preferencia del usuario; no sustituir feedback crítico por sonido/vibración solamente. 4. Web: priorizar propiedades compositables, medir INP y evitar layout thrash; desktop: no bloquear UI thread ni main loop; móvil: respetar batería/percepción; Godot: `AnimationPlayer`, `Tween` o `AnimationTree` con ownership explícito, sin race al cambiar escenas. 5. Feedback debe funcionar en éxito, error, loading, pérdida de red y acciones repetidas.

## Contrato implementable / ejemplo verificable

```text
acción usuario → estado `pending` → feedback no bloqueante
               → success: confirmación + persistencia
               → fail: mensaje accionable + reintento / deshacer
               → cancel: revertir transitorio y liberar recursos
```

**Salto 2D:** efecto visual breve al despegar + SFX en bus `SFX` + aterrizaje detectable; evitar duplicar sonido cuando un evento se emite varias veces en un frame. Probar sin audio y con prefers-reduced-motion o equivalente de preferencias de juego.

## Testing, revisión y criterios de aceptación

- [ ] Animación no bloquea click, foco, movimiento ni navegación.
- [ ] Probar spam de acciones, pausa, pérdida de foco y cambio de escena.
- [ ] Asegurar fallback visual/textual y reducción de movimiento.
- [ ] Medir latencia de interacción o fotogramas en el dispositivo objetivo.

## Anti-patrones y riesgos

- Animaciones largas de 800 ms en acciones frecuentes.
- Usar haptics o audio como única señal de error.
- Crear un Tween por frame sin cancelar y sin comprobar ownership.



## Referencias oficiales y fuentes canónicas

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Godot Animation](https://docs.godotengine.org/en/stable/tutorials/animation/index.html)
- [Guía UX/UI transversal](README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Animaciones largas de 800 ms en acciones frecuentes.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Animar números bancarios con scroll parallax durante confirmación
- **❌ Incorrecto**: Animar números bancarios con scroll parallax durante confirmación.
- **✅ Correcto**: Feedback de estado inmediato sin ambigüedad en operaciones críticas.

### 02. Haptics obligatoria para único aviso en móvil
- **❌ Incorrecto**: Haptics obligatoria para único aviso en móvil.
- **✅ Correcto**: Combinar semántica accesible con vibración opcional.

### 03. Agregar camera shake y flash por daño sin configuración
- **❌ Incorrecto**: Agregar camera shake y flash por daño sin configuración.
- **✅ Correcto**: Límites de intensidad, reduced motion y alternativas.

### 04. Crear spinner infinito sin timeout/error
- **❌ Incorrecto**: Crear spinner infinito sin timeout/error.
- **✅ Correcto**: Progreso y opción de recuperación, comunicación de latencia.

### 05. Usar transiciones que bloquean input en gamepad
- **❌ Incorrecto**: Usar transiciones que bloquean input en gamepad.
- **✅ Correcto**: Cancelación y foco estables durante transiciones.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

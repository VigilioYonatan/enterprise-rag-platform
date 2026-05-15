# Discovery UX, usuarios y validación de hipótesis

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Partir del problema y el trabajo real, no de pantallas copiadas..

## Decisiones arquitectónicas y de producto

1. Redactar `jobs-to-be-done`, segmentos/contextos, tareas frecuentes, consecuencias del fallo, riesgos éticos, necesidades de privacidad y criterios de negocio medibles. 2. Separar supuestos de hallazgos: entrevista y observación solo son evidencia si fueron realizadas; no inventar cifras de conversión. 3. Explorar accesibilidad y diversidades desde el descubrimiento; no agregarla al final. 4. Establecer métricas: tasa de finalización, error, tiempo de tarea, abandono por paso, percepción de confianza y frustración; registrar línea base si existe.

## Contrato implementable / ejemplo verificable

**Ficha de hipótesis** (registro ejemplo, no investigación ejecutada): `Usuario: analista financiero`; `situación: revisa transferencias atípicas`; `hipótesis: una vista de anomalías por prioridad reduce errores`; `métrica: precisión y tiempo de triage`; `riesgo: falsa confianza`; `prueba: prototipo moderado con 5–8 perfiles representativos, tamaño ajustado al objetivo`; `estado: PENDIENTE DE VALIDAR`.

Descubrir restricciones antes de elegir herramientas: offline/online, teclado/touch, idiomas, autenticación, coste de interacción y política de datos.

## Testing, revisión y criterios de aceptación

- [ ] Documentar muestreo, consentimiento, método, tareas y sesgos cuando exista investigación.
- [ ] Diferenciar entrevistas reales de usuarios simulados por IA.
- [ ] Probar tareas representativas y registrar fallos, no solo opiniones.
- [ ] Evidencia por hipótesis: `CONFIRMADA/REFUTADA/INCONCLUSA/NOT_RUN`.

## Anti-patrones y riesgos

- Inventar testimonios o resultados para justificar una decisión visual.
- Validar solamente con diseñadores, sin usuarios que realizan la tarea.
- Reproducir dashboards populares como sustituto de discovery.



## Referencias oficiales y fuentes canónicas

- [Guía UX/UI transversal](README.md)
- [WCAG: necesidades de usuario](https://www.w3.org/WAI/fundamentals/accessibility-intro/)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Inventar testimonios o resultados para justificar una decisión visual.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Empezar fintech con dashboard oscuro copiado de tendencia
- **❌ Incorrecto**: Empezar fintech con dashboard oscuro copiado de tendencia.
- **✅ Correcto**: Investigar confianza, tareas, roles y miedo a transferencias erróneas.

### 02. Usar perfil inventado como si fuera investigación real
- **❌ Incorrecto**: Usar perfil inventado como si fuera investigación real.
- **✅ Correcto**: Distinguir hipótesis, datos observados y entrevistas consentidas.

### 03. Preguntar solo colores preferidos
- **❌ Incorrecto**: Preguntar solo colores preferidos.
- **✅ Correcto**: Descubrir flujos críticos, accesibilidad, frecuencia y errores costosos.

### 04. Validar prototipo solo con equipo de desarrollo
- **❌ Incorrecto**: Validar prototipo solo con equipo de desarrollo.
- **✅ Correcto**: Pruebas de tarea con perfiles representativos y limitaciones documentadas.

### 05. Medir satisfacción sin completar tareas
- **❌ Incorrecto**: Medir satisfacción sin completar tareas.
- **✅ Correcto**: Medir éxito, errores, tiempo y abandono con consentimiento.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

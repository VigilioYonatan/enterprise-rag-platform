# Diseño asistido por IA — originalidad, procedencia y control

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Asistencia con IA para investigación, variantes y QA sin inventar autoridad ni copiar identidad..

## Decisiones arquitectónicas y de producto

1. IA puede proponer flujos, alternativas de jerarquía, microcopy, componentes y casos adversarios; el humano decide y valida con usuarios cuando corresponde. 2. No usar capturas de terceros como diseño final, no copiar assets sin permiso; registrar procedencia y licencias. 3. Si pide generar imagen visual estática, tratarla como artefacto visual y diferenciarlo de código funcional. 4. No subir tokens, datos financieros, diseños confidenciales ni credenciales a plataformas no autorizadas. 5. Guardar briefs, decisiones, versiones de tokens, deltas respecto a baseline y evaluación manual; evitar «AI slop» y falsas métricas.

## Contrato implementable / ejemplo verificable

**Evaluación de dos propuestas**: matriz ponderada con originalidad contextual, jerarquía, consistencia, accesibilidad, coste de implementación, rendimiento y cercanía al usuario. Registrar razones y limitaciones. No afirmar ganador universal ni nota 10/10 por estética pura.

Salida requerida: `alternatives[]`, `decision`, `rejected_patterns[]`, `accessibility_risks[]`, `validation_plan`, `status`.

## Testing, revisión y criterios de aceptación

- [ ] Revisión de derechos de assets y prompt provenance si fue generado.
- [ ] Revisión manual de legibilidad, patrones manipulativos y preferencias.
- [ ] Identificar hipótesis sin prueba como hipótesis.
- [ ] No declarar evaluación heurística como estudio de usuarios.

## Anti-patrones y riesgos

- Galería de pantallas bonitas sin flujo funcional.
- Atribuir feedback generado por IA a usuarios reales.
- Reciclar marca o copyright de ejemplos ajenos.



## Referencias oficiales y fuentes canónicas

- [Figma: variables y modos](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [Privacidad](../security/secrets-and-privacy.md)
- [Guía UX/UI transversal](README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Galería de pantallas bonitas sin flujo funcional.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Copiar output IA que replica UI de otra marca
- **❌ Incorrecto**: Copiar output IA que replica UI de otra marca.
- **✅ Correcto**: Revisar originalidad, licencia y rediseño ajustado al brief.

### 02. Usar imágenes generadas con texto ilegible como interfaz
- **❌ Incorrecto**: Usar imágenes generadas con texto ilegible como interfaz.
- **✅ Correcto**: Componentes reales, texto editable y contraste verificable.

### 03. Pedir diseño a IA sin datos de usuario ni restricciones
- **❌ Incorrecto**: Pedir diseño a IA sin datos de usuario ni restricciones.
- **✅ Correcto**: Brief con usuarios, plataforma, tareas, marca y riesgos.

### 04. Dejar IA inventar métricas de investigación o tests
- **❌ Incorrecto**: Dejar IA inventar métricas de investigación o tests.
- **✅ Correcto**: Distinguir hipótesis, simulación y evidencia medida.

### 05. Implementar HTML de IA directamente sin seguridad/a11y
- **❌ Incorrecto**: Implementar HTML de IA directamente sin seguridad/a11y.
- **✅ Correcto**: Code review de semántica, dependencias, sanitización y tests.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

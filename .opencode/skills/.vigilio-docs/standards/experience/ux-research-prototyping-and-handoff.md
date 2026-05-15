# Prototipos, Figma y handoff de diseño a ingeniería

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Puente trazable idea → decisiones → tokens → componentes → implementación..

## Decisiones arquitectónicas y de producto

1. Sketches y wireframes para estructura; prototipos de alta fidelidad solo cuando resuelvan hipótesis relevantes. 2. Documentar rutas de prototipo y restricciones: mock no es dato real; transiciones son propuestas hasta su implementación. 3. Figma: componentes, Auto Layout, variantes, variables, modos, librerías y versionado si el equipo lo usa; no confundir captura con especificación funcional. 4. Handoff incluye comportamiento, estados, spacing/tokens, focus, error, responsive, copy, entradas y métricas; referenciar issue y commit de la implementación. 5. La IA puede explorar alternativas y resumir feedback, nunca inventar que entrevistó usuarios ni exportar datos privados sin permisos.

## Contrato implementable / ejemplo verificable

**Contrato handoff por pantalla**:
```yaml
screen: transaction-review
platform: desktop
intent: confirmar importe/destinatario
states: [loading, ready, validation_error, pending, success]
a11y: [keyboard_order, focus_visible, sr_labels, high_contrast]
tokens: [color.text.primary, color.action.primary, space.md]
contracts: [POST /transfers idempotent]
tests: [keyboard, screen_reader, async_error, visual_regression]
status: PROPOSED
```
El contrato no presupone que exista integración Figma ni conexión backend.

## Testing, revisión y criterios de aceptación

- [ ] Cada variante visible tiene estados y contratos anotados.
- [ ] Componentes implementados referencian tokens/versiones; diferencias justificadas.
- [ ] Design QA en ejecutable/browser real, no solo pixel matching.
- [ ] Prototipo etiquetado `MOCK`; nada de PASS sin ejecución.

## Anti-patrones y riesgos

- Entregar solo una imagen sin especificar errores, navegación o focus.
- Exportar HTML sin revisar accesibilidad ni ownership.
- Usar Figma como fuente de verdad de contratos backend.



## Referencias oficiales y fuentes canónicas

- [Figma: variables y modos](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [Figma: variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
- [Guía UX/UI transversal](README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Entregar solo una imagen sin especificar errores, navegación o focus.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Entregar solo screenshot a frontend
- **❌ Incorrecto**: Entregar solo screenshot a frontend.
- **✅ Correcto**: Especificar comportamiento, tokens, focus, states y casos de error.

### 02. Usar prototipo generado por IA como evidencia de usuarios
- **❌ Incorrecto**: Usar prototipo generado por IA como evidencia de usuarios.
- **✅ Correcto**: Marcar propuesta como hipótesis y probarla con personas.

### 03. No versionar decisiones de UI
- **❌ Incorrecto**: No versionar decisiones de UI.
- **✅ Correcto**: ADR de diseño con racional y alternativas rechazadas.

### 04. Medir A/B sin hipótesis ni guardrail
- **❌ Incorrecto**: Medir A/B sin hipótesis ni guardrail.
- **✅ Correcto**: KPI principal, accesibilidad, latencia y tamaño de muestra.

### 05. Entregar assets Figma sin ownership/licencia
- **❌ Incorrecto**: Entregar assets Figma sin ownership/licencia.
- **✅ Correcto**: Tokens y exportables versionados con proveniencia.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Sistema UX/UI transversal — diseño original por producto

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Orientar el diseño profesional para web, desktop, móvil y videojuegos sin convertir un estilo de moda en norma universal..

## Decisiones arquitectónicas y de producto

1. Para una idea sin repositorio, descubrir contexto: usuarios, trabajo principal, entorno, riesgo, plataformas, accesibilidad, identidad, modelo mental y recursos. Comparar opciones y proponer una dirección original. 2. Para una base existente, inventariar tokens, componentes, estados, patrones y deuda visual ANTES de cambiar estilos. 3. Separar **normas universales** de **adaptadores por plataforma**: Web DOM, Expo/React Native, GPUI, Qt Widgets, Godot Control/HUD. 4. No imponer Figma ni frameworks; se utiliza cuando existe flujo de diseño/handoff compatible. 5. El mismo patrón visual no debe saltarse reglas nativas de input, focus, tipografía, safe areas o mandos.

## Contrato implementable / ejemplo verificable

**Mapa de ownership**: esta carpeta es fuente canónica para UX; `stacks/*/ui` solo implementa particularidades de su stack. El agente recomienda, después confirma restricciones bloqueantes, diseña con objetivos de negocio, instrumenta pruebas y reporta lo no medido.

**Ejemplo fintech desktop**: prioridad a saldos y estados verificados, operaciones reversibles, lectura densa controlada y confirmación de transferencias; **ejemplo juego 2D**: prioridad a legibilidad del HUD, latencia, foco gamepad, pistas visuales/sonoras y ritmo. No comparten automáticamente paleta, iconografía ni jerarquía.

## Testing, revisión y criterios de aceptación

- [ ] El brief evidencia tipo de usuario, tarea crítica, pantallas y plataformas.
- [ ] Distinguir `DISEÑO PROPUESTO` frente a captura/prototipo/implementación probada.
- [ ] Entregar tokens semánticos, mapa de estados, keyboard/mando, contraste, responsive, motion, criterios de aceptación y costes de renderizado.
- [ ] Revisión manual con personas y dispositivos reales según criticidad.

## Anti-patrones y riesgos

- Clonar una captura de Dribbble sin estudiar el problema, licencia, datos o ergonomía.
- Introducir 15 componentes base sin usuarios ni flujo.
- Confundir Figma exportado, test automático o IA generativa con accesibilidad garantizada.



## Referencias oficiales y fuentes canónicas

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Figma: variables y modos](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [Impacto y review](../engineering/change-impact-and-review-gates.md)
- [Descubrimiento de capacidades](../ai/dynamic-capability-discovery.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Clonar una captura de Dribbble sin estudiar el problema, licencia, datos o ergonomía.

## Blueprints por tipo de producto

- [UX/UI personalizado Web/Mobile/Desktop/Game](product-originality-and-platform-blueprints.md) — briefs, diseño no genérico, controles, tokens, rendimiento y matriz de pruebas.

## Ejemplos con criterios de aceptación

- [Catorce casos UX/UI por producto](platform-specific-design-examples.md)


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Usar el mismo kit visual fintech en RPG y dashboard
- **❌ Incorrecto**: Usar el mismo kit visual fintech en RPG y dashboard.
- **✅ Correcto**: Partir de usuarios, riesgos, plataforma e identidad propia.

### 02. Confundir cumplimiento WCAG con una revisión de colores
- **❌ Incorrecto**: Confundir cumplimiento WCAG con una revisión de colores.
- **✅ Correcto**: Incluir foco, semántica, teclado, voice/screen reader y estados.

### 03. Crear componentes sin intención ni owner
- **❌ Incorrecto**: Crear componentes sin intención ni owner.
- **✅ Correcto**: Design system con variantes por producto y contratos por feature.

### 04. Hacer mockup sin estados error/pending/empty
- **❌ Incorrecto**: Hacer mockup sin estados error/pending/empty.
- **✅ Correcto**: Prototipar todas las transiciones críticas y resultados.

### 05. Entregar Figma sin probar front real
- **❌ Incorrecto**: Entregar Figma sin probar front real.
- **✅ Correcto**: QA visual, accesibilidad y UX con ingeniería/dispositivos.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

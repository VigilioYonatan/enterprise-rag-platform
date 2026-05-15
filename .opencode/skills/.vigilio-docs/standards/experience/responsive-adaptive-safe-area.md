# Responsive, adaptive, safe areas y densidad

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Diseñar para tareas, capacidades y tamaños cambiantes, no dispositivos de marketing..

## Decisiones arquitectónicas y de producto

1. Distinguir **responsive** (adaptación fluida) de **adaptive** (estructura ajustada según condiciones). 2. Elegir breakpoints donde el contenido/flujo falla, no copiar cortes arbitrarios. 3. Web: flex/grid, container queries cuando sea compatible, overflow y reflow; desktop: redimensionamiento de ventanas, paneles, docking y pantallas múltiples; móvil: orientación, notch, teclado virtual, navegación del sistema, safe areas; juegos: HUD 16:9, 4:3, ultrawide, handheld y HUD escalable. 4. Informaciones esenciales nunca deben ocultarse por tamaños reducidos. 5. RTL, idiomas de texto largo y densidad de datos bajo stress.

## Contrato implementable / ejemplo verificable

**Matriz de ejemplo**: móvil estrecho + teclado abierto; tablet split view; escritorio 800×600 y 3440×1440; juego 16:9, 4:3 y ultrawide. Medir clipping real con capturas, no inferir por CSS semántico.

No convertir la misma tabla de escritorio en diez columnas minúsculas en móvil: decidir resumen/acción esencial y drill-down accesible.

## Testing, revisión y criterios de aceptación

- [ ] Validar resize sin reinicio, enfoque conservado, contenido visible y scroll razonable.
- [ ] Controlar safe area y overlays en móvil.
- [ ] Validar HUD no tapa la acción o los subtítulos en videojuegos.
- [ ] Sin scroll horizontal obligatorio para lectura general salvo contenido esencialmente bidimensional.

## Anti-patrones y riesgos

- Dar por responsive porque se usa `width:100%`.
- Esconder acciones imprescindibles en mobile.
- Breakpoints basados solo en modelo de teléfono popular.



## Referencias oficiales y fuentes canónicas

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Guía UX/UI transversal](README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Dar por responsive porque se usa `width:100%`.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Copiar grid de desktop en móvil reduciendo escala
- **❌ Incorrecto**: Copiar grid de desktop en móvil reduciendo escala.
- **✅ Correcto**: Recomponer prioridades y navegación según tamaño/entrada.

### 02. Ignorar safe area en iPhone con notch
- **❌ Incorrecto**: Ignorar safe area en iPhone con notch.
- **✅ Correcto**: Insets nativos y test con teclados/rotación.

### 03. Fijar widths absolutos en modal de gestión financiera
- **❌ Incorrecto**: Fijar widths absolutos en modal de gestión financiera.
- **✅ Correcto**: Layout adaptable, zoom, texto largo y locales.

### 04. Esconder acción principal al abrir teclado móvil
- **❌ Incorrecto**: Esconder acción principal al abrir teclado móvil.
- **✅ Correcto**: Ajustar teclado virtual, scroll/viewport y focus.

### 05. Diseñar tablet como móvil gigante con mucho vacío
- **❌ Incorrecto**: Diseñar tablet como móvil gigante con mucho vacío.
- **✅ Correcto**: Breakpoints por contenido/densidad, no solo device names.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

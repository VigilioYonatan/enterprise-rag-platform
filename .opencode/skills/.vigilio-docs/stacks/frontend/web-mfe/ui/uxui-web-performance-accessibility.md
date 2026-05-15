# UX/UI web — React y MFE: semántica, diseño y rendimiento

**Estado:** norma vigente, no certificación de implementación. **Owner:** `stacks/`. **Alcance:** Sitios, SaaS, dashboards, MFE, ecommerce y apps web..

## Decisiones arquitectónicas y de producto

- Priorizar etiquetas HTML nativas, enlaces reales y formularios semánticos; `div role=button` solo en caso muy justificado. - Propagar tokens de marca a CSS variables/tailwind config sin duplicar roles ni suponer shared UI kit entre microfrontends. - Rutas MFE deben preservar teclado, título, foco tras navegación y límites de ownership. - Diferenciar landing editorial, dashboard denso, checkout y formulario de fintech. - Instrumentar Core Web Vitals y formularios reales; los estilos de checkout no validan transacciones.

## Contrato implementable / ejemplo verificable

```css
:root { --color-action: #F6D87A; --color-on-action: #171B25; --focus-ring: #F6D87A; }
.button-primary { background: var(--color-action); color: var(--color-on-action); }
.button-primary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .button-primary { transition: none; } }
```
Ejemplo ilustrativo: no equivale a un kit productivo ni cubre todos los estados de botón.

## Testing, revisión y criterios de aceptación

- [ ] Playwright/DOM: keyboard, aria-name, disabled/loading, error states, reflow y foco post-router.
- [ ] Contrast check + revisión manual (lector pantalla) + RUM/perf budget.
- [ ] No asumir compatibilidad completa MFE sin tests integrados.

## Anti-patrones y riesgos

- Duplicar diez kits de botones por MFE sin contrato semántico.
- Desactivar scroll/zoom del navegador para imitar app nativa.
- Reescribir focus a `outline: none`.



## Referencias oficiales y fuentes canónicas

- [Tokens canónicos](../../../../standards/experience/design-tokens-modes-and-theming.md)
- [Accesibilidad](../../../../standards/experience/accessibility-inclusive-interactions.md)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Duplicar diez kits de botones por MFE sin contrato semántico.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Botón con div onClick sin teclado
- **❌ Incorrecto**: Botón con div onClick sin teclado.
- **✅ Correcto**: button semántico con focus y estados.

### 02. Tabla completa de 50 mil filas en DOM
- **❌ Incorrecto**: Tabla completa de 50 mil filas en DOM.
- **✅ Correcto**: Paginación/virtualización y keyboard navigation accesible.

### 03. Imagen hero sin sizes, alt ni compresión
- **❌ Incorrecto**: Imagen hero sin sizes, alt ni compresión.
- **✅ Correcto**: srcset/sizes, alt según contenido y budget LCP.

### 04. Formulario web renderiza contraseña en URL de navegación
- **❌ Incorrecto**: Formulario web renderiza contraseña en URL de navegación.
- **✅ Correcto**: POST controlado, no logs y contenido sensible protegido.

### 05. Grid de dashboard que se rompe a zoom 200%
- **❌ Incorrecto**: Grid de dashboard que se rompe a zoom 200%.
- **✅ Correcto**: Responsive content-first y test WCAG reflow.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Design tokens, variables, modos y theming

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Tokens reutilizables independientes de tecnología; integración web, native, Qt y Godot..

## Decisiones arquitectónicas y de producto

1. Organizar **primitivos → semánticos → componentes → modos**. Las pantallas consumen roles, no literales hex sueltos. 2. Modo oscuro/claro/alto contraste no es invertir colores automáticamente: validar estados, bordes y focus en cada modo. 3. Tokens versionados; cambios incompatibles con migración y visual regression. 4. Diseño de marca específico, escalas coherentes, no imponer paleta de moda. 5. Figma es editor opcional; el JSON canónico y sus adaptadores viven junto al producto. 6. Tratar spacing tipográfico y tamaño mínimo con plataforma propia, no convertir dp en px de forma acrítica.

## Contrato implementable / ejemplo verificable

```json
{
  "color": {
    "surface": {"default": "#101927", "raised": "#1D2B3B"},
    "text": {"primary": "#FFFFFF", "secondary": "#D4E0EF"},
    "action": {"primary": "#F6D87A", "onPrimary": "#171B25"},
    "focus": {"ring": "#F6D87A"}
  },
  "space": {"xs": 4, "sm": 8, "md": 12, "lg": 20},
  "motion": {"shortMs": 120, "normalMs": 220}
}
```

En el consumidor, resolver aliases sin ciclos, convertir formatos con herramientas versionadas y calcular contraste desde los pares reales de componentes. El ejemplo tiene estética editorial propia; cada producto debe escoger tokens mediante su brief.

## Testing, revisión y criterios de aceptación

- [ ] Ninguna referencia circular, token faltante ni nombre ambiguo.
- [ ] Validar contraste de texto (AA 4.5:1 normal; 3:1 grande) en cada modo; UI no textual según criterio aplicable.
- [ ] Revisión visual de estados, overlays, barras, fondos y componentes de excepción.
- [ ] Actualizar Figma si es parte del workflow; la integración no debe exigir conector.

## Anti-patrones y riesgos

- `#fff` disperso en 50 pantallas; interpolar hex al azar para errores.
- Renombrar token semántico destruyendo su significado.
- Confundir token correctamente parseado con cumplimiento WCAG completo.



## Referencias oficiales y fuentes canónicas

- [Figma: variables y modos](https://help.figma.com/hc/en-us/articles/14506821864087-Overview-of-variables-collections-and-modes)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Guía UX/UI transversal](README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** `#fff` disperso en 50 pantallas; interpolar hex al azar para errores.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Hardcodear #00ff00 en cada botón React y Godot
- **❌ Incorrecto**: Hardcodear #00ff00 en cada botón React y Godot.
- **✅ Correcto**: Definir tokens de intención propios y adapters por plataforma.

### 02. Forzar una sola escala tipográfica para juego, desktop y móvil
- **❌ Incorrecto**: Forzar una sola escala tipográfica para juego, desktop y móvil.
- **✅ Correcto**: Escalas por plataforma y contextos de uso.

### 03. Crear dark mode con inversor CSS universal
- **❌ Incorrecto**: Crear dark mode con inversor CSS universal.
- **✅ Correcto**: Paleta de superficies, bordes, estados y elevación por modo.

### 04. Cambiar token global y romper checkout crítico
- **❌ Incorrecto**: Cambiar token global y romper checkout crítico.
- **✅ Correcto**: Versionar tokens, revisar snapshots y visual regression relevante.

### 05. Usar token de marca para error/éxito
- **❌ Incorrecto**: Usar token de marca para error/éxito.
- **✅ Correcto**: Tokens semánticos accesibles desacoplados de marketing.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

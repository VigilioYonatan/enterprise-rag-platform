# UX/UI Qt Widgets — productividad, eficiencia y accesibilidad

**Estado:** norma vigente, no certificación de implementación. **Owner:** `stacks/`. **Alcance:** C++20 Qt Desktop: menús, tablas, shortcuts, focus, densidad y temas..

## Decisiones arquitectónicas y de producto

- Widgets usan ownership de QObject y event loop: estado de dominio fuera de la ventana. - `QAction`/shortcut, focus policy y orden de tab coherentes; diálogos modales no pierden tareas. - `QAccessible` y propiedades accesibles según componente: no asumir lector pantalla por etiqueta visible. - Theme/QPalette/Stylesheet consumen paleta semántica, test claro/oscuro/high contrast; usar modelos para tablas grandes y virtualization cuando aplique. - Toolbars, ventanas y paneles densos favorecen teclado y comandos, no botones gigantes para todo.

## Contrato implementable / ejemplo verificable

```cpp
// Fragmento Qt Widgets: semantics y acceso por teclado, no app completa.
auto *submit = new QPushButton(tr("Confirmar"), parentWidget);
submit->setAccessibleName(tr("Confirmar operación"));
submit->setToolTip(tr("Confirma la operación actual"));
```

Acción debe invocar servicio desde controller/coordinador, nunca SQL desde callback del botón.

## Testing, revisión y criterios de aceptación

- [ ] Qt Test: tab order, atajos, nombre accesible, invalid states, mensajería de errores.
- [ ] Manual: Windows/macOS/Linux según soporte, scaling DPI, RTL, navegación screen reader.
- [ ] Verificar feedback y que UI thread no bloquea con I/O.

## Anti-patrones y riesgos

- `QStyleSheet` global con strings hardcodeados y colores ilegibles en modo oscuro.
- Diálogo modal que obliga a ratón para cerrarse.
- Widget que conserva datos de contraseña al cerrar.



## Referencias oficiales y fuentes canónicas

- [Qt Widgets](../desktop/qt-widgets-architecture.md)
- [Normas UX](../../../standards/experience/README.md)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** `QStyleSheet` global con strings hardcodeados y colores ilegibles en modo oscuro.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Clonar un dashboard genérico web dentro de ERP Qt
- **❌ Incorrecto**: Clonar un dashboard genérico web dentro de ERP Qt.
- **✅ Correcto**: Diseñar densidad de tabla, atajos y orientación de operador.

### 02. Usar solo color rojo para movimientos fallidos
- **❌ Incorrecto**: Usar solo color rojo para movimientos fallidos.
- **✅ Correcto**: Icono, texto legible, explicación y foco al error.

### 03. Recrear 10 mil QLabels para filas de transacciones
- **❌ Incorrecto**: Recrear 10 mil QLabels para filas de transacciones.
- **✅ Correcto**: Model/View + medición de latencia scroll.

### 04. Ignorar DPI y texto grande
- **❌ Incorrecto**: Ignorar DPI y texto grande.
- **✅ Correcto**: Escalado, high-DPI, layout adaptable y tests en resoluciones declaradas.

### 05. Un botón destructivo sin confirmación contextual
- **❌ Incorrecto**: Un botón destructivo sin confirmación contextual.
- **✅ Correcto**: Resumen de acción, confirmación proporcional y undo cuando sea posible.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

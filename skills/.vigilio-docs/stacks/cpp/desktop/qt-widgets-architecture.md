# Qt Widgets: arquitectura Desktop

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Widgets enfocan UI; Core/Application conservan invariantes y casos de uso.

## Política y decisiones de diseño

1. Ui view/controladores enlazan signals y commands; no SQL, migraciones o red en slots de widgets.
2. Propiedad QObject y thread-affinity explícitas; componentes comunes según reutilización real.
3. Model/view de Qt cuando hay tablas/árboles complejos; no recrear un listado masivo de widgets a mano.
4. Settings, recursos y localización con ownership del producto; assets/ y tests/ viven en apps/desktop.

## Ejemplo técnico específico — UI no conoce SQL

```cpp
// Señal UI -> caso de uso, usando conexión QObject real.
// connect(saveButton, &QPushButton::clicked, controller,
//         &DocumentController::saveRequested);
```

**Criterio de aprobación:** Mockear puerto de persistencia, no simular UI exitosa para probar SQL.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Qt Test valida keyboard/focus, señales, modelos y cierre.
- **Gate 2:** UI smoke exige QApplication/display real, no exit(0) cuando falta display.
- **Gate 3:** Pruebas DPI, internacionalización y accesibilidad.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Ui view/controladores enlazan signals y commands; no SQL, migraciones o red en slots de widgets. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Chromium obligatorio para widget nativo.
- ❌ **Incorrecto:** Slot UI sincroniza base remota bloqueando pantalla.
- ❌ **Incorrecto:** Tests unitarios presentados como E2E UI.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [qt](https://doc.qt.io/qt-6/qtwidgets-index.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [qttest](https://doc.qt.io/qt-6/qttest-overview.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. BrowserWindow ejecuta SQL y decide autorización
- **❌ Incorrecto**: BrowserWindow ejecuta SQL y decide autorización.
- **✅ Correcto**: Presenter/coordinador UI invoca aplicación y storage adapter.

### 02. Dibujar tablas grandes con miles de QWidget por fila
- **❌ Incorrecto**: Dibujar tablas grandes con miles de QWidget por fila.
- **✅ Correcto**: Model/View y virtualización con QAbstractItemModel.

### 03. Personalizar todos los controles con stylesheet único global frágil
- **❌ Incorrecto**: Personalizar todos los controles con stylesheet único global frágil.
- **✅ Correcto**: Theme/tokens y estados por control/rol.

### 04. Manipular ventanas fuera del hilo GUI
- **❌ Incorrecto**: Manipular ventanas fuera del hilo GUI.
- **✅ Correcto**: Actualizar UI mediante signal/slot queued.

### 05. Pruebas UI solo comprueban construcción de QWidget
- **❌ Incorrecto**: Pruebas UI solo comprueban construcción de QWidget.
- **✅ Correcto**: Probar focus, tab order, atajos, errores y lectores de pantalla.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

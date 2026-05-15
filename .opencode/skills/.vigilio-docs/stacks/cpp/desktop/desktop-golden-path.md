# Golden path Qt Desktop: formulario y SQLite

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Feature vertical verificable para ERP/POS/cliente administrativo.

## Política y decisiones de diseño

1. Abrir ventana; capturar datos; validar en Application; guardar transacción; recuperar y presentar el registro.
2. Widgets no crean tablas automáticamente; separar conexión y migración del caso de uso.
3. Comportamiento de errores y cierre de aplicación con trabajo pendiente definido.
4. Probar validación de entradas, estados vacíos, accesibilidad y localización.

## Ejemplo técnico específico — Desktop completo

```text
Open window -> edit form -> validate -> save to SQLite -> close
 -> restart -> restore -> assert contents, no duplicated record
```

**Criterio de aprobación:** Pruebas Qt Test + E2E con display, shutdown del worker y escritura correcta.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** CTest + Qt Test con GUI real; probar persistencia entre dos ejecuciones.
- **Gate 2:** Simular schema viejo, DB bloqueada y escrituras concurrentes.
- **Gate 3:** Medir arranque y tamaño de dataset representativo.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Abrir ventana; capturar datos; validar en Application; guardar transacción; recuperar y presentar el registro. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Screenshot de UI como evidencia de transacción.
- ❌ **Incorrecto:** Acoplar todo a BrowserWindow.
- ❌ **Incorrecto:** Desconocer permisos de escritura en directorio usuario.

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

### 01. Declarar golden path por mostrar MainWindow
- **❌ Incorrecto**: Declarar golden path por mostrar MainWindow.
- **✅ Correcto**: Crear, validar, guardar, cerrar y reabrir datos.

### 02. Permitir doble submit de operación financiera
- **❌ Incorrecto**: Permitir doble submit de operación financiera.
- **✅ Correcto**: Estado pending con operación idempotente y confirmación humana.

### 03. Ignorar ESC/focus en modal crítico
- **❌ Incorrecto**: Ignorar ESC/focus en modal crítico.
- **✅ Correcto**: Control de navegación, cierre y estados accesibles.

### 04. Guardar configuración inválida sin señalar errores
- **❌ Incorrecto**: Guardar configuración inválida sin señalar errores.
- **✅ Correcto**: Validar inputs/errores antes de persistir.

### 05. Dar PASS a snapshot visual sin ejecutar workflows
- **❌ Incorrecto**: Dar PASS a snapshot visual sin ejecutar workflows.
- **✅ Correcto**: UI test real y smoke de artefacto instalado.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

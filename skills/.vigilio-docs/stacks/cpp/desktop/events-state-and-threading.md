# Eventos, estado y threading de Qt

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Separar QObjects, workers y estado persistente para UI responsiva y segura.

## Política y decisiones de diseño

1. Modelos observables con eventos precisos; evitar duplicación de fuentes de verdad entre widgets.
2. QThread no vuelve automáticamente thread-safe un objeto; respetar affinity y lifecycle.
3. Señales queued para resultados y contexto receptor válido; cancelar cuando se destruye ventana.
4. Evitar reentrada impredecible con llamadas de event loop anidadas; diseñar shutdown.

## Ejemplo técnico específico — Signals y GUI thread

```cpp
// Un callback del worker emite señal; conexión Qt::QueuedConnection
// envía la actualización al hilo GUI que posee el widget.
// Evitar referencias a widgets destruidos desde callbacks tardíos.
```

**Criterio de aprobación:** Revisar carrera al cerrar ventana con trabajos concurrentes y `deleteLater` en owner thread.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de señales asíncronas con QSignalSpy/fixtures.
- **Gate 2:** Cierre mientras worker contesta; ausencia de señales hacia receptores destruidos.
- **Gate 3:** Tiempos de event loop y memoria medidos.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Modelos observables con eventos precisos; evitar duplicación de fuentes de verdad entre widgets. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** QWidget modificado desde worker.
- ❌ **Incorrecto:** Mantener lock mientras emite señal reentrante.
- ❌ **Incorrecto:** Salvar UI en DB desde render.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [qthread](https://doc.qt.io/qt-6/threads-qobject.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [qttest](https://doc.qt.io/qt-6/qttest-overview.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Conectar signal duplicada en cada render
- **❌ Incorrecto**: Conectar signal duplicada en cada render.
- **✅ Correcto**: Declarar conexión en ciclo de vida controlado y verificar duplicados.

### 02. Actualizar progreso desde thread de descargas en QLabel directo
- **❌ Incorrecto**: Actualizar progreso desde thread de descargas en QLabel directo.
- **✅ Correcto**: Qt signals al GUI thread.

### 03. Cerrar ventana mientras tarea captura this crudo
- **❌ Incorrecto**: Cerrar ventana mientras tarea captura this crudo.
- **✅ Correcto**: Cancelar o guard lifetime con contexto de QObject.

### 04. Bloquear main thread guardando SQLite
- **❌ Incorrecto**: Bloquear main thread guardando SQLite.
- **✅ Correcto**: Worker y estado de UI pending/error/ready.

### 05. Acumular eventos sin backpressure
- **❌ Incorrecto**: Acumular eventos sin backpressure.
- **✅ Correcto**: Coalescer de eventos y medir input latency.


## Ejemplo implementable y revisión del riesgo
### Ejemplo Qt: entregas al hilo propietario

```cpp
// ❌ Incorrecto: un std::thread secundario llama label->setText(...)
// ✅ Correcto: la worker emite una señal y el receiver del hilo UI la consume.
connect(worker, &Worker::progressChanged, label,
        [label](int value) { label->setText(QString::number(value)); },
        Qt::QueuedConnection);
```

El receiver `label` actúa como contexto de vida para la conexión. Revisar destrucción/cancelación del `worker`, afinidad de objetos y pruebas con event loop Qt real; esto es un fragmento de integración para un proyecto donde `Worker` define la señal correspondiente.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

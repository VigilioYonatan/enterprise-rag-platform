# Concurrencia C++ y threading Qt

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Evitar UI bloqueada, data races, callbacks fuera de ciclo de vida y procesos huérfanos.

## Política y decisiones de diseño

1. Usar `std::jthread`/stop tokens donde sea apropiado y disponible; Qt thread-affinity para QObject.
2. No mutar QWidget desde worker; usar señales/slots/queued connections de manera controlada.
3. Locks breves; no mantener mutex durante señales reentrantes o llamadas potencialmente bloqueantes.
4. Cancelación cooperativa, timeouts, cierre predecible y backpressure en descargas/indexación.

## Ejemplo técnico específico — Cancelación cooperativa

```cpp
#include <thread>
#include <stop_token>
std::jthread worker([](std::stop_token stop) {
    while (!stop.stop_requested()) { /* trabajar sin busy-loop */ break; }
});
worker.request_stop();
```

**Criterio de aprobación:** No actualizar QWidget fuera del hilo GUI; probar shutdown con trabajo en progreso.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de cierre mientras worker sigue trabajando, cancelación en timeout y warnings Qt de thread-affinity.
- **Gate 2:** TSan solo en configuraciones soportadas, de otro modo `NOT_RUN`.
- **Gate 3:** Medir latencia de event loop ante cargas.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Usar `std::jthread`/stop tokens donde sea apropiado y disponible; Qt thread-affinity para QObject. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Mover QWidget a worker.
- ❌ **Incorrecto:** Conectar lambda capturando `this` sin lifetime.
- ❌ **Incorrecto:** Esperar indefinidamente en destructor UI.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cpp](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — verificar compatibilidad con la versión efectiva del consumidor.
- [qthread](https://doc.qt.io/qt-6/threads-qobject.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Modificar QWidget desde std::thread de trabajo
- **❌ Incorrecto**: Modificar QWidget desde std::thread de trabajo.
- **✅ Correcto**: Comunicación queued signal/slot al hilo de UI.

### 02. Bloquear event loop con llamada de red
- **❌ Incorrecto**: Bloquear event loop con llamada de red.
- **✅ Correcto**: Trabajo asíncrono con timeout y cancelación.

### 03. Crear detached thread sin shutdown
- **❌ Incorrecto**: Crear detached thread sin shutdown.
- **✅ Correcto**: jthread/stop_token o supervisor propio con join probado.

### 04. Bloquear dos mutex en orden inconsistente
- **❌ Incorrecto**: Bloquear dos mutex en orden inconsistente.
- **✅ Correcto**: std::scoped_lock o orden total.

### 05. Capturar QObject destruido en callback tardío
- **❌ Incorrecto**: Capturar QObject destruido en callback tardío.
- **✅ Correcto**: Lifetime bound callbacks y QPointer/guards.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

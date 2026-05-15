# C++ testing nativo y puertas de calidad

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Unit, integración, CTest, Qt GUI, sanitizers y fuzz orientados a riesgo.

## Política y decisiones de diseño

1. Cada test existe como target CMake/CTest y se ejecuta en CI; contar archivos no demuestra cobertura.
2. Qt Test/QSignalSpy para UI, servidor HTTP fixture para WebEngine; no ejecutar UI `return 0` si no hay display.
3. ASan/UBSan/TSan compatibles según OS/toolchain y no como gate ficticio.
4. Fuzzing de inputs hostiles como URLs/CSV/metadata y pruebas de memoria en rutas críticas.

## Ejemplo técnico específico — CTest ejecutable

```bash
cmake --preset ci
cmake --build --preset ci --parallel
ctest --preset ci --output-on-failure
```

**Criterio de aprobación:** Comprobar CTest cuenta >0, usar sanitizers en plataformas compatibles y tests negativos.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** `ctest --test-dir build --output-on-failure`; detectar 0 tests y rechazarlo cuando el gate es requerido.
- **Gate 2:** Medir escenarios de memoria/performance en hardware de referencia.
- **Gate 3:** Pruebas de Qt WebEngine/privacidad realmente ejecutadas.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Cada test existe como target CMake/CTest y se ejecuta en CI; contar archivos no demuestra cobertura. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Retornar 0 ante test omitido.
- ❌ **Incorrecto:** Compilar solo Core cuando release pide navegador.
- ❌ **Incorrecto:** Silenciar fallos de CTest con `|| true`.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [ctest](https://cmake.org/cmake/help/latest/manual/ctest.1.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [qttest](https://doc.qt.io/qt-6/qttest-overview.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. ctest termina 0 aunque no descubre pruebas
- **❌ Incorrecto**: ctest termina 0 aunque no descubre pruebas.
- **✅ Correcto**: Verificar --show-only=json-v1 y count mínimo obligatorio.

### 02. Probar QObject UI sin loop/signal real
- **❌ Incorrecto**: Probar QObject UI sin loop/signal real.
- **✅ Correcto**: Qt Test con QSignalSpy y runner gráfico.

### 03. Executar ASan únicamente en build optimizada con incompatibilidad
- **❌ Incorrecto**: Executar ASan únicamente en build optimizada con incompatibilidad.
- **✅ Correcto**: Matriz sanitizer/compilador soportada.

### 04. Desactivar flaky test sin evidencias de incidente
- **❌ Incorrecto**: Desactivar flaky test sin evidencias de incidente.
- **✅ Correcto**: Aislar timing, fixtures deterministas y corrección.

### 05. Compilar core y afirmar que navegador pasó
- **❌ Incorrecto**: Compilar core y afirmar que navegador pasó.
- **✅ Correcto**: Exigir target GUI/Qt/Engine y tests propios.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

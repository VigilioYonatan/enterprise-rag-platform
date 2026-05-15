# CMake, targets y dependencias reproducibles

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Arquitectura target-based sin include global ni dependencias fantasma.

## Política y decisiones de diseño

1. Usar `target_link_libraries`, `target_include_directories` y `target_compile_features` con visibilidad PRIVATE/PUBLIC/INTERFACE correcta.
2. Presets versionados para configurar, construir y probar; `CMakeUserPresets.json` es local y no versionado.
3. Versionar dependencias con lockfiles/manifest y controlar actualizaciones de Qt/Chromium; no asumir que las libs del sistema son idénticas.
4. Separar opciones de proyecto de configuración del consumidor, sin mutar flags globalmente en bibliotecas publicadas.

## Ejemplo técnico específico — Targets en lugar de flags globales

```cmake
cmake_minimum_required(VERSION 3.24)
project(example LANGUAGES CXX)
add_library(example_core src/core.cpp)
target_compile_features(example_core PUBLIC cxx_std_20)
target_include_directories(example_core PUBLIC include)
```

**Criterio de aprobación:** Verificar CMakePresets, toolchain, lock de dependencias y builds en runner limpio.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** `cmake --preset ci` / `cmake --build --preset ci` / `ctest --preset ci` con los presets reales.
- **Gate 2:** Export/Install target cuando se publica librería; inspeccionar dependencias transitorias.
- **Gate 3:** Fail cuando falta Qt y el producto requiere GUI.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Usar `target_link_libraries`, `target_include_directories` y `target_compile_features` con visibilidad PRIVATE/PUBLIC/INTERFACE correcta. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** `include_directories` global indiscriminado.
- ❌ **Incorrecto:** FetchContent a rama `main` como release.
- ❌ **Incorrecto:** Workflow green con target GUI omitido.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cmake](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [presets](https://cmake.org/cmake/help/latest/manual/cmake-presets.7.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Poner include_directories y flags globales a todos los targets
- **❌ Incorrecto**: Poner include_directories y flags globales a todos los targets.
- **✅ Correcto**: target_include_directories con PUBLIC/PRIVATE/INTERFACE justificados.

### 02. Descargar última versión de dependency en CI
- **❌ Incorrecto**: Descargar última versión de dependency en CI.
- **✅ Correcto**: Versiones fijadas en vcpkg/Conan/lockfiles y comprobadas.

### 03. Compilar tests sin añadirlos a CTest
- **❌ Incorrecto**: Compilar tests sin añadirlos a CTest.
- **✅ Correcto**: enable_testing/CTest, add_test y descubrimiento mayor que cero.

### 04. Codificar rutas absolutas locales en CMakePresets compartido
- **❌ Incorrecto**: Codificar rutas absolutas locales en CMakePresets compartido.
- **✅ Correcto**: Presets portables; rutas personales en CMakeUserPresets.json ignorado.

### 05. Mezclar library Qt y CLI core en dependencia cíclica
- **❌ Incorrecto**: Mezclar library Qt y CLI core en dependencia cíclica.
- **✅ Correcto**: Grafo dirigido y targets pequeños cohesionados.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

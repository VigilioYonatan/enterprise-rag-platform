# C++ — guía de entrada y selección de stack

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** C++ Core es general: biblioteca, CLI, simulación, backend nativo, Qt Widgets y Qt WebEngine son especializaciones opcionales.

## Política y decisiones de diseño

1. Descubrir CMake targets, compiladores, presets, fuentes, vcpkg/Conan y versiones.
2. No instalar Qt/Chromium para parsers, SDK o CLI que no lo necesitan.
3. Reutilizar DDD/SOLID/seguridad/testing canónicos; estas guías añaden prácticas idiomáticas y ejecutables C++.

## Ejemplo técnico específico — C++ core, Qt Desktop y WebEngine opcional

```text
CLI C++: target pequeño, sin Qt.
POS con Qt: Qt6::Widgets, SQLite local, tests CTest/Qt Test.
Browser: Qt6::WebEngineWidgets + políticas perfiles + E2E privacidad.
```

**Criterio de aprobación:** No añadir Chromium/Qt a todo proyecto CMake.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Configurar el proyecto real y observar targets; `cmake --build` no demuestra la GUI si fue omitida.
- **Gate 2:** Verificar OS/toolchain declarados y bibliotecas realmente enlazadas.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Descubrir CMake targets, compiladores, presets, fuentes, vcpkg/Conan y versiones. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Confundir `CMakeLists.txt` con uso obligatorio de Qt.
- ❌ **Incorrecto:** Crear DLL por clase.
- ❌ **Incorrecto:** Marcar GUI PASS por construir solo core.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cpp](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — verificar compatibilidad con la versión efectiva del consumidor.
- [cmake](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html) — verificar compatibilidad con la versión efectiva del consumidor.

## Ejemplo compilable vinculado

- [cpp-core golden path](../../examples/cpp-core-golden-path/README.md). Verificar estado de ejecución en ese README; nunca extrapolar tests del ejemplo a GPUI o WebEngine.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Agregar Qt6 y Chromium a cada librería C++
- **❌ Incorrecto**: Agregar Qt6 y Chromium a cada librería C++.
- **✅ Correcto**: C++ Core sin Qt; Desktop/Qt y WebEngine seleccionados por producto.

### 02. Aplicar exceptions/RTTI distintos entre targets ABI compatibles
- **❌ Incorrecto**: Aplicar exceptions/RTTI distintos entre targets ABI compatibles.
- **✅ Correcto**: Fijar políticas de compilación públicas por target.

### 03. Usar includes privados como API pública
- **❌ Incorrecto**: Usar includes privados como API pública.
- **✅ Correcto**: Definir includes exportados y testear consumidor externo.

### 04. Considerar tests CTest equivalentes a UX/E2E
- **❌ Incorrecto**: Considerar tests CTest equivalentes a UX/E2E.
- **✅ Correcto**: Combinar unit C++ con UI y E2E gráficos cuando aplique.

### 05. Permitir CI verde compilando solo core si el producto es browser
- **❌ Incorrecto**: Permitir CI verde compilando solo core si el producto es browser.
- **✅ Correcto**: Exigir ejecutable y dependencias WebEngine en release.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

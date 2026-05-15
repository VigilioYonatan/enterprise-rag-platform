# Contratos y errores de aplicaciones C++

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Errores explícitos y contratos estables sin excepciones filtradas a C ABI o UI.

## Política y decisiones de diseño

1. Definir estrategia explícita de excepciones vs tipos de resultado según proyecto; nunca asumir exceptions enabled en todo el producto.
2. Errores de negocio separados de I/O y del motor WebEngine; mensajes de UI localizables y datos sensibles omitidos.
3. No convertir cada componente a interface virtual; usar interfaces cuando hay adaptadores o pruebas independientes reales.
4. Versionar IPC, formatos en disco y contratos externos con estrategia de migración.

## Ejemplo técnico específico — Errores verificables

```cpp
#include <optional>
#include <string>
std::optional<int> parse_positive(std::string_view input) {
    if (input == "1") return 1; // ilustrativo, parser real valida enteros
    return std::nullopt;
}
```

**Criterio de aprobación:** Distinguir errores de usuario, I/O, red y bugs; evitar false success al ignorar errores.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Pruebas de error paths por IO, permisos y corrupción de archivo.
- **Gate 2:** Compatibilidad de ABI y exportación en biblioteca pública.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Definir estrategia explícita de excepciones vs tipos de resultado según proyecto; nunca asumir exceptions enabled en todo el producto. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** `catch (...) {}` sin log/evidencia.
- ❌ **Incorrecto:** Error UI expone ruta con secreto.
- ❌ **Incorrecto:** Clase virtual trivial por clase.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cpp](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — verificar compatibilidad con la versión efectiva del consumidor.
- [cmake](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Devolver false para todos los fallos sin contexto
- **❌ Incorrecto**: Devolver false para todos los fallos sin contexto.
- **✅ Correcto**: Tipo de error con categoría, operación y manejo en frontera.

### 02. Lanzar excepción dentro de callback Qt que nadie captura
- **❌ Incorrecto**: Lanzar excepción dentro de callback Qt que nadie captura.
- **✅ Correcto**: Convertir fallos en resultados/señales controlados en frontera.

### 03. Permitir que read-only API mutile archivo
- **❌ Incorrecto**: Permitir que read-only API mutile archivo.
- **✅ Correcto**: Contrato const-correct y tests de efectos.

### 04. Exponer std::filesystem::path sin validar raíz al sistema de plugins
- **❌ Incorrecto**: Exponer std::filesystem::path sin validar raíz al sistema de plugins.
- **✅ Correcto**: Validar alcances y permisos antes de usar path.

### 05. Cambiar ABI binaria silenciosamente al publicar
- **❌ Incorrecto**: Cambiar ABI binaria silenciosamente al publicar.
- **✅ Correcto**: Versionado ABI/API y prueba de consumidor.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

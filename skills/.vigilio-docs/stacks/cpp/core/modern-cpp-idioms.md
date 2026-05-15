# C++20 idiomático, contratos y tipos

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Utilizar RAII y biblioteca estándar antes de inventar frameworks internos.

## Política y decisiones de diseño

1. Tipos semánticos para unidades/dinero cuando su validación importa; `std::optional`, `std::variant`, `std::span` cuando mejoran contratos.
2. `std::string_view` solo si se conoce lifetime del buffer; `std::span` requiere vigencia de almacenamiento.
3. `enum class`, const-correctness, move semántico y return-by-value; medir copias grandes antes de optimizar.
4. Concepts/templates donde hay operaciones genéricas reales, evitando crecimiento descontrolado de tiempos de compilación.

## Ejemplo técnico específico — Tipos de datos no ambiguos

```cpp
#include <optional>
#include <string_view>
std::optional<std::string_view> head(std::string_view input) {
    auto pos = input.find('/');
    if (pos == std::string_view::npos) return std::nullopt;
    return input.substr(0, pos);
}
```

**Criterio de aprobación:** Evitar `string_view` que sobreviva a datos temporales; auditar lifetimes y ownership.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Compilar con warnings altos adecuados al compilador; sanitizers en matrices compatibles.
- **Gate 2:** Tests de valores límite y ownership cuando se usan vistas no propietarias.
- **Gate 3:** Revisar compatibilidad binaria cuando cambian estructuras en APIs externas.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Tipos semánticos para unidades/dinero cuando su validación importa; `std::optional`, `std::variant`, `std::span` cuando mejoran contratos. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** `new`/`delete` manual sin necesidad.
- ❌ **Incorrecto:** `string_view` guardado sobre temporal.
- ❌ **Incorrecto:** Silenciar warnings de conversión masivamente.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cpp](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Usar new/delete manual en todos los objetos
- **❌ Incorrecto**: Usar new/delete manual en todos los objetos.
- **✅ Correcto**: RAII y smart pointers según ownership.

### 02. Pasar vector por valor en hot path de lectura
- **❌ Incorrecto**: Pasar vector por valor en hot path de lectura.
- **✅ Correcto**: std::span<const T> o const& mientras duren los datos.

### 03. Usar magic ints para estados de transacción
- **❌ Incorrecto**: Usar magic ints para estados de transacción.
- **✅ Correcto**: enum class y conversión validada de entrada.

### 04. Copiar objetos costosos por descuido
- **❌ Incorrecto**: Copiar objetos costosos por descuido.
- **✅ Correcto**: Medir move/reference sin introducir vistas colgantes.

### 05. Usar casts C para silenciar advertencias
- **❌ Incorrecto**: Usar casts C para silenciar advertencias.
- **✅ Correcto**: Tipos correctos y casts explícitos sólo justificados.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

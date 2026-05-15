# C++20 — archivos, ownership RAII, interfaces y configuración

**Owner:** `stacks/cpp/core/`, [estándar compartido](../../../standards/engineering/file-and-symbol-ownership.md).

```text
apps/desktop/src/
├── app/
├── features/auth/
│   ├── AuthService.hpp
│   ├── AuthService.cpp
│   ├── AuthConfig.hpp
│   └── IAuthStore.hpp
└── ui/
```

Un `constexpr` interno a la unidad de traducción pertenece normalmente al `.cpp` o namespace anónimo. Extraer a `AuthConfig.hpp` **solo** si configura la política pública o es reutilizado; no imponer `constants/` a cada local. Headers públicos mínimos; implementación interna en `src/`. Preferir RAII/`std::unique_ptr` cuando hay ownership exclusivo, referencias para préstamos y lifetime de `QObject` parent-owned según Qt; jamás transferir a `shared_ptr` un `QObject` que ya tiene padre Qt sin política clara.

```cpp
namespace auth {
struct SessionPolicy { std::chrono::seconds ttl{3600}; };
} // namespace auth
```

**Gates:** CMake targets solo si hay consumidores/reutilización, clang-format, clang-tidy, compiler warnings, ASan/UBSan donde soportados, CTest y UI Qt real si aplica. No mover símbolos ABI/publicados sin plan de versión y tests de dependientes.

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Usar constexpr privado y configuración por feature si se reutiliza; probar ABI.
- ❌ **Incorrecto:** Colocar todo en headers globales e introducir shared_ptr sobre QObjects parent-owned.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Un header global Constants.h para todas las features
- **❌ Incorrecto**: Un header global Constants.h para todas las features.
- **✅ Correcto**: constexpr por namespace/feature dueño con linkage claro.

### 02. Poner DTO HTTP en clase Qt BrowserWindow
- **❌ Incorrecto**: Poner DTO HTTP en clase Qt BrowserWindow.
- **✅ Correcto**: Contratos en límite de transporte y modelos de presentación independientes.

### 03. Guardar todo en utils.cpp sin contrato semántico
- **❌ Incorrecto**: Guardar todo en utils.cpp sin contrato semántico.
- **✅ Correcto**: Helpers locales o servicios con nombre de capacidad.

### 04. Repetir un enum en dominio, UI y persistencia
- **❌ Incorrecto**: Repetir un enum en dominio, UI y persistencia.
- **✅ Correcto**: Un tipo dueño con adapters de conversión explícita.

### 05. Mover variables temporales a shared/ para seguir convención literal
- **❌ Incorrecto**: Mover variables temporales a shared/ para seguir convención literal.
- **✅ Correcto**: Variables locales cerca del uso, extraer solo política reusada.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

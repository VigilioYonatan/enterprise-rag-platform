# Rust — ownership de módulos, `const`, traits y crates

**Owner:** `stacks/rust/core/`. Ver [estándar transversal](../../../standards/engineering/file-and-symbol-ownership.md) y [crates/boundaries](crates-and-boundaries.md).

```text
crates/auth-core/src/
├── lib.rs
├── domain.rs
├── ports.rs         # Traits externas solo cuando hacen falta
├── config.rs        # Política validada y defaults
├── session.rs
└── tests.rs         # Test privado colocalizado, o tests/ público
```

```rust
// src/config.rs — pertenece al módulo auth
pub const SESSION_TTL_SECS: u64 = 60 * 60;
#[derive(Debug, Clone)]
pub struct PasswordHashPolicy { pub memory_kib: u32, pub iterations: u32 }
impl Default for PasswordHashPolicy {
    fn default() -> Self { Self { memory_kib: 65_536, iterations: 3 } }
}
```

Un `const` privado dentro de una función o módulo es correcto cuando no es contrato externo. Usar `pub(crate)` antes de `pub`; `mod` + APIs mínimas; `traits` solo para abstracciones de dependencias o comportamiento polimórfico real. Los parámetros de Argon2 se revisan por entorno/latencia, no son exigencia universal. Una app Cargo pequeña puede tener solo `src/lib.rs` + `src/main.rs`, no requiere `crates/` ni `shared/`.

**Pruebas:** `cargo fmt --check`, `cargo check --workspace --all-targets --locked`, `cargo clippy`, `cargo test --locked`; usar `--locked` solo cuando el lockfile existe y es aplicable al tipo de proyecto. Para secretos, usar provider/entorno validado, no `pub const`. Probar API pública, errores y contratos antes de mover módulos.

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Dejar const privado en módulo, exponer `pub(crate)` y refactorizar crates por frontera.
- ❌ **Incorrecto:** Crear crate para cada tipo o publicar secretos en `pub const`.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Mover cada const local a constants.rs global
- **❌ Incorrecto**: Mover cada const local a constants.rs global.
- **✅ Correcto**: Mantener variables locales junto al uso y extraer políticas compartidas al módulo dueño.

### 02. Crear types.rs monolítico con conceptos de todos los bounded contexts
- **❌ Incorrecto**: Crear types.rs monolítico con conceptos de todos los bounded contexts.
- **✅ Correcto**: Tipos por feature; reexportar contratos estables desde la frontera.

### 03. Guardar puertos de dominio dentro de la crate GPUI
- **❌ Incorrecto**: Guardar puertos de dominio dentro de la crate GPUI.
- **✅ Correcto**: Declarar puertos en application/domain, adaptarlos desde Desktop.

### 04. Introducir crate shared para reutilizar dos líneas triviales
- **❌ Incorrecto**: Introducir crate shared para reutilizar dos líneas triviales.
- **✅ Correcto**: Compartir solamente abstracciones estables y con consumidores reales.

### 05. Exponer tokens de usuario desde un singleton global
- **❌ Incorrecto**: Exponer tokens de usuario desde un singleton global.
- **✅ Correcto**: Inyectar capacidades restringidas por flujo y no exponer secretos en tipos globales.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

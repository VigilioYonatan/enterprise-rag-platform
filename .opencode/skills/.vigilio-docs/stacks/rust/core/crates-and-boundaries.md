# Crates, ownership y límites de arquitectura

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Construir monolitos modulares Rust con dependencia estable y mínima superficie pública.

## Política y decisiones de diseño

1. Extraer un crate cuando hay reutilización real, ciclo de release distinto, seguridad aislada o dependencias que no deben contaminar a otros consumidores.
2. Separar dominio y políticas puras de adaptadores I/O solo donde existan invariantes o interfaces que merezcan ser probadas sin hardware/GUI.
3. La UI GPUI y CLI llaman a application; los adaptadores implementan puertos definidos hacia el interior. Evitar dependencias circulares, en particular crates core con dev-dependency a apps.
4. Mantener `pub(crate)` y `pub(super)` antes de abrir APIs `pub`; preservar semver cuando hay consumidores externos.

## Ejemplo técnico específico — Dependency rule

```text
apps/desktop ----> crates/application ----> crates/core
     |                     ^
     +----> crates/layout  |-- ports consumidos por adapters
apps/cli -------> application

Incorrecto: vigilio-core -> apps/desktop (ciclo conceptual).
```

**Criterio de aprobación:** Revisar `cargo tree -p vigilio-core`; mover pruebas GUI que introducen dependencia inversa al Desktop.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** `cargo metadata` para grafo y `cargo tree -p <paquete>` para explicar dependencias y features.
- **Gate 2:** Tests del crate de layout sin arrancar Desktop; E2E visuales en Desktop.
- **Gate 3:** En reviews comprobar cambios en API pública, features, nuevos ciclos y duplicación entre apps.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Extraer un crate cuando hay reutilización real, ciclo de release distinto, seguridad aislada o dependencias que no deben contaminar a otros consumidores. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Dividir código por límite arbitrario de líneas.
- ❌ **Incorrecto:** Hacer `vigilio-core` dependiente de GPUI.
- ❌ **Incorrecto:** Suponer que `tests/` raíz virtual es descubierto automáticamente.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cargo](https://doc.rust-lang.org/cargo/reference/workspaces.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Crear un crate por componente de UI
- **❌ Incorrecto**: Crear un crate por componente de UI.
- **✅ Correcto**: Separar crates por API estable, ownership y necesidades reales de compilación.

### 02. Hacer que core dependa del ejecutable Desktop
- **❌ Incorrecto**: Hacer que core dependa del ejecutable Desktop.
- **✅ Correcto**: Mantener dirección de dependencias core -> sin UI; desktop depende de core.

### 03. Exponer todo con pub indiscriminadamente
- **❌ Incorrecto**: Exponer todo con pub indiscriminadamente.
- **✅ Correcto**: Exportar solo contratos necesarios y ocultar detalles con pub(crate).

### 04. Replicar types y enums de dominio en tres crates
- **❌ Incorrecto**: Replicar types y enums de dominio en tres crates.
- **✅ Correcto**: Definir el tipo en la crate propietaria y usar reexports específicos.

### 05. Crear dependencias circulares entre application y adapters
- **❌ Incorrecto**: Crear dependencias circulares entre application y adapters.
- **✅ Correcto**: Definir ports en el dueño del caso de uso y adapters fuera.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

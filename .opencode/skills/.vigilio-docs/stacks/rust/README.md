# Rust — guía de entrada y selección de arquitectura

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Todos los proyectos Rust: librería, CLI, backend, desktop GPUI o sistemas. Las especializaciones se seleccionan por dependencias y tarea, no por nombre del repositorio.

## Política y decisiones de diseño

1. Comenzar leyendo Cargo manifests, toolchain, lockfile, targets y tests. Elegir monopaquete si el problema cabe en uno.
2. Seleccionar Rust Core para todo; Desktop, Backend, CLI y Systems solo si esas capacidades existen o se planean.
3. Seguir estándares universales de DDD pragmático, SOLID, Clean, comentarios, testing y seguridad por enlaces, sin reescribirlos.

## Ejemplo técnico específico — Elige solo las capacidades necesarias

```text
CLI pequeña: Cargo.toml + src/ + tests/; sin crates/ artificial.
IDE con Desktop+CLI: apps/{desktop,cli}/ + crates/ compartidos con ownership.
Backend Rust: servidor HTTP + contratos + data ports solo cuando aporta.
```

**Criterio de aprobación:** Prueba de selección: una CLI pura no recibe GPUI ni E2E de ventanas.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Enumerar paquetes y features con `cargo metadata --locked --no-deps --format-version 1` si Cargo está instalado.
- **Gate 2:** Inventariar binarios, librerías, tests, integración nativa y plataformas soportadas.
- **Gate 3:** Marcar `BLOCKED` si faltan crates internos, lockfile o toolchain necesarios.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Comenzar leyendo Cargo manifests, toolchain, lockfile, targets y tests. Elegir monopaquete si el problema cabe en uno. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Imponer GPUI a una CLI o biblioteca.
- ❌ **Incorrecto:** Crear un crate por botón o tipo de DTO.
- ❌ **Incorrecto:** Declarar compilación PASS a partir de un árbol de archivos.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cargo](https://doc.rust-lang.org/cargo/reference/workspaces.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.

## Ejemplo compilable vinculado

- [rust-cli golden path](../../examples/rust-cli-golden-path/README.md). Verificar estado de ejecución en ese README; nunca extrapolar tests del ejemplo a GPUI o WebEngine.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Usar GPUI como dependencia de cualquier crate Rust
- **❌ Incorrecto**: Usar GPUI como dependencia de cualquier crate Rust.
- **✅ Correcto**: Mantener Cargo Core independiente; seleccionar GPUI solo para Desktop con UI real.

### 02. Crear cinco crates para una CLI de una orden
- **❌ Incorrecto**: Crear cinco crates para una CLI de una orden.
- **✅ Correcto**: Empezar con un binario y módulos, extraer crate al surgir una frontera compartida.

### 03. Un único comando de CI que solo compila
- **❌ Incorrecto**: Un único comando de CI que solo compila.
- **✅ Correcto**: Separar fmt, clippy, test, build y E2E específico del ejecutable.

### 04. Publicar notas de compatibilidad sin toolchain fijado
- **❌ Incorrecto**: Publicar notas de compatibilidad sin toolchain fijado.
- **✅ Correcto**: Versionar toolchain, Cargo.lock de aplicaciones y matriz de plataformas.

### 05. Calificar como PASS un flujo no ejecutado
- **❌ Incorrecto**: Calificar como PASS un flujo no ejecutado.
- **✅ Correcto**: Distinguir pruebas de Rust ejecutadas y verificaciones GUI bloqueadas.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

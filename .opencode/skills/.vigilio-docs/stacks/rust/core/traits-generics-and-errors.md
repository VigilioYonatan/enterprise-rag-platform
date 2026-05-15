# Traits, genéricos, errores y APIs públicas

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Producir interfaces idiomáticas con mínima ceremonia y contratos fáciles de cambiar.

## Política y decisiones de diseño

1. Usar enums cuando el conjunto de estados sea cerrado; traits cuando haya implementaciones alternativas reales o aislación de un límite externo.
2. Errores de dominio tipados y errores de infraestructura con contexto, sin exponer rutas sensibles o secretos en respuestas.
3. `Result<T,E>` en operaciones recuperables; `panic!` únicamente ante invariantes de programación claramente imposibles y fuera de inputs no confiables.
4. Elegir monomorfización (`impl Trait`/genéricos) vs despacho dinámico (`dyn Trait`) por propiedad, binario, testabilidad y APIs.

## Ejemplo técnico específico — Errores con contexto

```rust
#[derive(Debug)]
pub enum SaveError { PermissionDenied, Conflict, Io(std::io::Error) }

pub fn write_document(path: &std::path::Path, bytes: &[u8]) -> Result<(), SaveError> {
    std::fs::write(path, bytes).map_err(SaveError::Io)
}
```

**Criterio de aprobación:** El snippet es simplificado: escritura atómica exige archivo temporal, fsync, rename y tratamiento de conflictos probado.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de cada error relevante: permisos, archivo desaparecido, decodificación y cancelación.
- **Gate 2:** Verificación semver/ABI cuando se publica SDK o FFI.
- **Gate 3:** Inspeccionar propagación con `?` sin pérdida de contexto ni logs con secretos.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Usar enums cuando el conjunto de estados sea cerrado; traits cuando haya implementaciones alternativas reales o aislación de un límite externo. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Trait universal para todo struct.
- ❌ **Incorrecto:** `unwrap()` sobre entradas externas.
- ❌ **Incorrecto:** Errores `String` sin contrato en bibliotecas públicas.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [rust_api](https://doc.rust-lang.org/std/) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Un anyhow::Error opaco atraviesa dominio, CLI y HTTP sin contrato
- **❌ Incorrecto**: Un anyhow::Error opaco atraviesa dominio, CLI y HTTP sin contrato.
- **✅ Correcto**: Errores de dominio tipados; anyhow para límites ejecutables donde tenga sentido.

### 02. Implementar traits por cada struct concreta aunque haya un solo consumidor
- **❌ Incorrecto**: Implementar traits por cada struct concreta aunque haya un solo consumidor.
- **✅ Correcto**: Usar métodos concretos hasta requerir polimorfismo verificable.

### 03. Capturar todo error y retornar Ok(None)
- **❌ Incorrecto**: Capturar todo error y retornar Ok(None).
- **✅ Correcto**: Diferenciar NotFound de infraestructura y autorización.

### 04. Deserializar sin validar semántica y aceptar cantidades negativas
- **❌ Incorrecto**: Deserializar sin validar semántica y aceptar cantidades negativas.
- **✅ Correcto**: Validar invariantes en tipos de dominio/conversores.

### 05. Usar unwrap sobre archivos de usuario o red
- **❌ Incorrecto**: Usar unwrap sobre archivos de usuario o red.
- **✅ Correcto**: Propagar Result y contextualizar rutas sin filtrar secretos.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

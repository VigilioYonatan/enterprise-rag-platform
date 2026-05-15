# Rust backend: APIs, servicios y contratos semánticos

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Aplicable si existen librerías HTTP reales; usar estándares REST vigentes, no las convenciones de NestJS.

## Política y decisiones de diseño

1. HTTP boundary mapea request/response y errores; Application lleva reglas de negocio y autorización; Domain conserva invariantes.
2. Operaciones semánticas (`registerEndorsement`, etc.); DTOs de serialización Rust sin exigir Zod.
3. OpenAPI/Scalar solo cuando el proyecto expone HTTP; verificar compatibilidad/consumidores antes de cambiar esquema.
4. Idempotencia en pagos y reintentos, límites de petición, backpressure y observabilidad sin PII.

## Ejemplo técnico específico — API y contratos semánticos

```text
POST /v1/documents -> registerDocument (contrato HTTP)
                -> RegisterDocument (caso de uso)
                -> DocumentRepository (port) -> SQL adapter

Evitar transportar `axum::Json` al dominio.
```

**Criterio de aprobación:** Probar errores, autorización recurso, idempotencia, clientes y compatibilidad OpenAPI.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Tests de contratos success/error, permisos multi-tenant y payloads inválidos.
- **Gate 2:** Probar cancelación de requests y timeouts upstream; métricas por endpoint.
- **Gate 3:** Cambios en OpenAPI deben tener diff y estrategia de evolución.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** HTTP boundary mapea request/response y errores; Application lleva reglas de negocio y autorización; Domain conserva invariantes. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Forzar controller/service/repository si feature es trivial.
- ❌ **Incorrecto:** Poner DB queries en handler HTTP.
- ❌ **Incorrecto:** Copiar `index/store/destroy` a código Rust.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust_api](https://doc.rust-lang.org/std/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Hacer que handler HTTP decida invariantes financieros
- **❌ Incorrecto**: Hacer que handler HTTP decida invariantes financieros.
- **✅ Correcto**: Validar transporte y autorización antes de caso de uso transaccional.

### 02. Un endpoint POST retry produce doble cargo
- **❌ Incorrecto**: Un endpoint POST retry produce doble cargo.
- **✅ Correcto**: Exigir clave de idempotencia en acciones financieras reintentables.

### 03. Retornar estructura DB o secretos en JSON
- **❌ Incorrecto**: Retornar estructura DB o secretos en JSON.
- **✅ Correcto**: Mapear DTO de salida con datos permitidos.

### 04. Acoplar dominio a Axum extractors
- **❌ Incorrecto**: Acoplar dominio a Axum extractors.
- **✅ Correcto**: Mantener dominio separado y pruebas sin servidor.

### 05. Tests unitarios que nunca hacen HTTP real
- **❌ Incorrecto**: Tests unitarios que nunca hacen HTTP real.
- **✅ Correcto**: Integración HTTP sobre servidor/fixture con estados 4xx y 5xx.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

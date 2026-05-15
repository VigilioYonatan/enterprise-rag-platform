# Persistencia y transacciones en servicios Rust

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** SQL, pools y migraciones verificables conforme a invariantes, sin copiar Eloquent o Drizzle.

## Política y decisiones de diseño

1. Verificar DB y migraciones existentes antes de crear tablas; respetar ownership y claves foráneas reales.
2. Modelo de dominio distinto de fila SQL cuando hay razón; transacciones acotadas, locks y retries idempotentes.
3. Dinero en entero de unidad mínima o decimal exacto según dominio; nunca floats indiscriminados.
4. Expand→backfill→contract con controles de compatibilidad; aislamiento por tenant con DB constraints cuando viable.

## Ejemplo técnico específico — Integridad en base de datos

```sql
CREATE TABLE documents (
    tenant_id uuid NOT NULL,
    id uuid NOT NULL,
    version bigint NOT NULL CHECK (version > 0),
    PRIMARY KEY (tenant_id, id)
);
```

**Criterio de aprobación:** Probar concurrencia optimistic locking, tenant isolation, forward migration y rollback operativo.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** E2E real de migración y reversión operativa planificada, no mock de DB.
- **Gate 2:** Tests negativos de FK, duplicación, tenant cruzado, errores de red y carreras.
- **Gate 3:** Medir consultas e índices con data representativa, sin N+1.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Verificar DB y migraciones existentes antes de crear tablas; respetar ownership y claves foráneas reales. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Asumir PostgreSQL para una CLI simple.
- ❌ **Incorrecto:** Migrar producción desde tests.
- ❌ **Incorrecto:** Aprobar esquema por compilar consultas.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.
- [sqlite](https://www.sqlite.org/wal.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Ejecutar débito y crédito en transacciones distintas
- **❌ Incorrecto**: Ejecutar débito y crédito en transacciones distintas.
- **✅ Correcto**: Usar transacción única y consistencia de saldos/invariantes.

### 02. Publicar un evento externo antes del commit
- **❌ Incorrecto**: Publicar un evento externo antes del commit.
- **✅ Correcto**: Outbox transaccional y consumidor idempotente.

### 03. Construir SQL concatenando la petición
- **❌ Incorrecto**: Construir SQL concatenando la petición.
- **✅ Correcto**: Queries parametrizadas y límites para filtros/sort.

### 04. Migración destructiva sin rollback/backup ensayado
- **❌ Incorrecto**: Migración destructiva sin rollback/backup ensayado.
- **✅ Correcto**: Expand/contract con compatibilidad y prueba de restauración.

### 05. Usar conexión global compartida bloqueada entre awaits
- **❌ Incorrecto**: Usar conexión global compartida bloqueada entre awaits.
- **✅ Correcto**: Pool apropiado y límites de concurrencia.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

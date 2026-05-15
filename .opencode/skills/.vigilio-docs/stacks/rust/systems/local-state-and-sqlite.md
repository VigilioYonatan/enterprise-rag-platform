# Estado local Rust/SQLite y recuperación

**Estado:** norma específica del stack RUST, 2026. **Owner:** `stacks/rust/`. **Alcance:** Preferir persistencia local para editor cuando no se requiere servidor de backend.

## Política y decisiones de diseño

1. Separar schema SQLite de modelo de dominio y estado efímero UI. WAL con política de locking y backups apropiada a la carga.
2. Versionar migraciones locales; compatibilidad upgrade y no downgrade ciego.
3. Transacciones para persistir grupos de cambios; recuperar snapshots sin ejecutar side effects.
4. Cifrar datos sensibles según amenaza y OS keystore; no introducir clave hardcode en app.

## Ejemplo técnico específico — SQLite local con versión de esquema

```sql
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
PRAGMA user_version = 1;
```

**Criterio de aprobación:** Probar migraciones con datos antiguos, busy timeout, corrupción controlada, backup y recuperación.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Abrir DB antigua y migrarla sin pérdida en fixture versionado.
- **Gate 2:** Probar corrupción, disco lleno, concurrencia de procesos y locks.
- **Gate 3:** Comprobar que estado privado/sensible no se persiste involuntariamente.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Separar schema SQLite de modelo de dominio y estado efímero UI. WAL con política de locking y backups apropiada a la carga. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** PostgreSQL remoto obligatorio para abrir IDE.
- ❌ **Incorrecto:** Usar SQLite `:memory:` como única prueba.
- ❌ **Incorrecto:** Guardar tokens en settings JSON.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [sqlite](https://www.sqlite.org/wal.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [rust](https://doc.rust-lang.org/book/) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Guardar preferencias y tokens en el mismo JSON plano
- **❌ Incorrecto**: Guardar preferencias y tokens en el mismo JSON plano.
- **✅ Correcto**: Separar secretos en keychain/almacén autorizado y prefs no sensibles.

### 02. Usar SQLite WAL sin plan de checkpoint y respaldo
- **❌ Incorrecto**: Usar SQLite WAL sin plan de checkpoint y respaldo.
- **✅ Correcto**: Configurar WAL y pruebas de recuperación/backup con estado consistente.

### 03. Persistir cada keystroke síncronamente
- **❌ Incorrecto**: Persistir cada keystroke síncronamente.
- **✅ Correcto**: Debounce razonado y journal recuperable según riesgo de pérdida.

### 04. Deserializar settings incompatibles silenciosamente
- **❌ Incorrecto**: Deserializar settings incompatibles silenciosamente.
- **✅ Correcto**: Versionado de esquema y migraciones verificadas.

### 05. Aceptar corrupción y sobreescribir el archivo al arrancar
- **❌ Incorrecto**: Aceptar corrupción y sobreescribir el archivo al arrancar.
- **✅ Correcto**: Recuperación segura con copia y diagnóstico visible.

### Política de pruebas y optimización

**Gate del stack:** `cargo fmt --all -- --check`, `cargo check --workspace --all-targets --locked`, Clippy y tests apropiados; en GPUI añadir E2E gráfico real. Si Cargo/GUI faltan, `BLOCKED`/`NOT_RUN`, nunca `PASS`.

**Optimización:** medir latencia, asignaciones, memoria y contention antes de introducir caches, crates, locks o unsafe; justificar perfiles de release y feature flags.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# SQLite local, migraciones y recuperación para Qt

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Estado local verificable y transaccional, sin PostgreSQL obligatorio.

## Política y decisiones de diseño

1. Versionar esquema de SQLite con `PRAGMA user_version` u otro mecanismo documentado y migraciones idempotentes.
2. Usar prepared statements, transacciones y política WAL conforme a concurrencia y filesystem.
3. Distinguir cookie jar de WebEngine de SQLite del historial UI: no asumir aislamiento por usar DB en memoria.
4. Config sensible cifrada/protegida por OS keystore; no almacenar PII sin retención.

## Ejemplo técnico específico — Migración local

```sql
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY, url TEXT NOT NULL, visited_at INTEGER NOT NULL
);
```

**Criterio de aprobación:** Probar transacción migración, corrupción, versionado, backup y diferencias Windows/Linux.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Migración desde DB fixtures de versiones anteriores y pruebas de corrupción.
- **Gate 2:** Tests de locks, reintentos, disco lleno y cierre accidental.
- **Gate 3:** Integridad/backup/restore medidos.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Versionar esquema de SQLite con `PRAGMA user_version` u otro mecanismo documentado y migraciones idempotentes. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Tablas sin versión como release definitivo.
- ❌ **Incorrecto:** Confundir `:memory:` con privacidad de Chromium.
- ❌ **Incorrecto:** Passwords planas en QSettings.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [sqlite](https://www.sqlite.org/wal.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [qt](https://doc.qt.io/qt-6/qtwidgets-index.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Construir sentencia SQL por concatenación
- **❌ Incorrecto**: Construir sentencia SQL por concatenación.
- **✅ Correcto**: Prepared statements y parámetros vinculados.

### 02. Salto de esquema destructivo al abrir app antigua
- **❌ Incorrecto**: Salto de esquema destructivo al abrir app antigua.
- **✅ Correcto**: Migraciones versionadas y backup/rollback donde sea viable.

### 03. Guardar contraseñas/cookies en preferencias SQLite planas sin política
- **❌ Incorrecto**: Guardar contraseñas/cookies en preferencias SQLite planas sin política.
- **✅ Correcto**: Separar secretos y storage WebEngine por perfil.

### 04. Usar una conexión SQLite desde varios hilos indiscriminadamente
- **❌ Incorrecto**: Usar una conexión SQLite desde varios hilos indiscriminadamente.
- **✅ Correcto**: Conexiones por hilo o sincronización de ownership explícita.

### 05. Solo probar tabla nueva vacía
- **❌ Incorrecto**: Solo probar tabla nueva vacía.
- **✅ Correcto**: Pruebas de upgrade con base previa y datos representativos.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

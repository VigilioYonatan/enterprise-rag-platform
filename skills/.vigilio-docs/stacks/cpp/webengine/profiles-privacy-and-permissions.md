# Perfiles Chromium, privacidad, cookies y permisos

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Prioridad P0 para navegador multiperfil o incógnito.

## Política y decisiones de diseño

1. Perfil normal: storage name persistente, rutas controladas y cookies policy declarada; privado: QWebEngineProfile off-the-record aislado.
2. Perfiles/páginas tienen ownership y orden de destrucción explícito. Evitar compartir el mismo objeto entre modos.
3. Permisos por origen y tipo: pedir, denegar por defecto lo sensible, revocar y auditar; API exacta depende de Qt fijado.
4. Historial, QSettings, logs y descargas del navegador deben respetar aislamiento privado, no solo SQLite `:memory:`.

## Ejemplo técnico específico — Privado no persistente

```text
NORMAL: QWebEngineProfile("primary") -> storage persistente
PRIVATE: QWebEngineProfile() -> off-the-record aislado
CADA QWebEnginePage se construye con el perfil correcto.
```

**Criterio de aprobación:** Prueba cookies normales persistentes y cero contaminación en modo privado, incluyendo QSettings y logs.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Servidor local Set-Cookie: persistencia normal tras reinicio, cero cookie cruzada hacia privado.
- **Gate 2:** En privado comprobar session/caché/permiso sin disco, y no recuperación indebida de pestañas.
- **Gate 3:** HTTPS, certificados, permisos y descargas con casos adversarios.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Perfil normal: storage name persistente, rutas controladas y cookies policy declarada; privado: QWebEngineProfile off-the-record aislado. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Incógnito solo cambiando DB a memoria.
- ❌ **Incorrecto:** `new QWebEngineView` sin perfil explícito.
- ❌ **Incorrecto:** Prometer anonimato de red por off-the-record.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [qtprofile](https://doc.qt.io/qt-6/qwebengineprofile.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [qtperm](https://doc.qt.io/qt-6/qwebenginepermission.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Reutilizar cookies del perfil normal en ventana incógnito
- **❌ Incorrecto**: Reutilizar cookies del perfil normal en ventana incógnito.
- **✅ Correcto**: Perfil off-the-record separado y aislamiento demostrado.

### 02. Persistir URL privada en historial SQLite común
- **❌ Incorrecto**: Persistir URL privada en historial SQLite común.
- **✅ Correcto**: Guardado condicionado por tipo de perfil y tests tras reinicio.

### 03. Persistir permiso de cámara sin origen ni expiración
- **❌ Incorrecto**: Persistir permiso de cámara sin origen ni expiración.
- **✅ Correcto**: Decidir por origen/tipo/perfil con revocación.

### 04. Dejar páginas vivas tras destruir perfil
- **❌ Incorrecto**: Dejar páginas vivas tras destruir perfil.
- **✅ Correcto**: Orden de destrucción perfil/parejas de páginas probado.

### 05. Prometer anonimato completo por activar incognito
- **❌ Incorrecto**: Prometer anonimato completo por activar incognito.
- **✅ Correcto**: Comunicar límites frente a red, servidor y SO.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

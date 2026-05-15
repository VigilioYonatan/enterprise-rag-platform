# Seguridad C++ nativa: memoria, filesystem y contenido no confiable

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Boundary para C++ genérico, Qt y WebEngine según dependencia real.

## Política y decisiones de diseño

1. RAII y herramientas de memoria; evitar UAF/callbacks capturando `this` tras destrucción.
2. Path traversal/symlink: APIs por descriptor, control de TOCTOU y permisos; no solo comparar strings.
3. Sandbox y permiso por origen cuando WebEngine; contenido web nunca autoridad del agente.
4. Subprocesos con argv separados, allowlist de entornos, expiración/cancelación; logs sin secretos.

## Ejemplo técnico específico — Seguridad del navegador nativo

```text
HTTP/Web content untrusted -> QWebEngineProfile/permission policy
Downloads -> path validation -> safe writer (TOCTOU-aware)
IPC/CLI -> fixed command + input validation -> no shell injection
```

**Criterio de aprobación:** Fuzz entradas, ASAN/UBSAN compatible, symlink escape, certificados y secrets redaction.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** ASan/UBSan y pruebas negativas de lifetime en rutas sensibles.
- **Gate 2:** Probar escape de rutas y cambios concurrentes de symlink.
- **Gate 3:** Auditoría de dependencias Qt/Chromium y plan de parches.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** RAII y herramientas de memoria; evitar UAF/callbacks capturando `this` tras destrucción. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Pedir permisos desde cualquier origen sin validación.
- ❌ **Incorrecto:** Escribir archivos fuera del directorio permitido.
- ❌ **Incorrecto:** Guardar claves privadas en repo.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cpp](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) — verificar compatibilidad con la versión efectiva del consumidor.
- [qtperm](https://doc.qt.io/qt-6/qwebenginepermission.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Aceptar file URL de origen web sin política
- **❌ Incorrecto**: Aceptar file URL de origen web sin política.
- **✅ Correcto**: Restringir navegación a archivos locales y permisos por contexto.

### 02. Permitir shell command construido desde input
- **❌ Incorrecto**: Permitir shell command construido desde input.
- **✅ Correcto**: argv fijo y autorización por acción.

### 03. Mantener secreto de autenticación en QSettings plano
- **❌ Incorrecto**: Mantener secreto de autenticación en QSettings plano.
- **✅ Correcto**: Almacén seguro apropiado y minimización de logs.

### 04. Cargar plugins DLL arbitrarios sin verificación
- **❌ Incorrecto**: Cargar plugins DLL arbitrarios sin verificación.
- **✅ Correcto**: Política de firma/origen y sandbox según amenaza.

### 05. Omitir parcheo del Chromium integrado
- **❌ Incorrecto**: Omitir parcheo del Chromium integrado.
- **✅ Correcto**: Inventario de versión Qt WebEngine y rutina de actualización de CVEs.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

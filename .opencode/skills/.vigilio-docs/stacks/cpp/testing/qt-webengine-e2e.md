# E2E de navegador Qt WebEngine y privacidad

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Un navegador procesando webs no confiables necesita pruebas end-to-end reales, no solo carga local de HTML.

## Política y decisiones de diseño

1. Fixtures HTTPS/HTTP locales controladas; endpoint login que emite cookie y muestra sesión.
2. Perfiles normal/privado con storage paths aislados y test post-restart.
3. Escenarios de permiso a cámara/ubicación, descargas, certificados, URLs externos y caídas de renderer.
4. Gate marca `BLOCKED` si Qt/WebEngine/display no están disponibles; el test requerido no puede skippear con exit 0.

## Ejemplo técnico específico — Prueba de descubrimiento E2E

```bash
python3 scripts/vigilio-ctest-required.py   --build build/native-e2e --name-pattern 'browser.*e2e' --min-tests 1
```

**Criterio de aprobación:** El helper falla si no hay coincidencias reales; un CTest exit 0 con “No tests were found” es incorrecto.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** Aserciones de cookies, datos on-disk y ubicación de descargas.
- **Gate 2:** Captura de reportes CTest/Qt Test trazables y versión Chromium.
- **Gate 3:** Ejecutar plataforma realmente soportada.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Fixtures HTTPS/HTTP locales controladas; endpoint login que emite cookie y muestra sesión. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Verificar solo título de una página.
- ❌ **Incorrecto:** Confundir tests UI con pruebas seguridad browser.
- ❌ **Incorrecto:** Conceder todos los permisos por defecto.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [qtprofile](https://doc.qt.io/qt-6/qwebengineprofile.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [qttest](https://doc.qt.io/qt-6/qttest-overview.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Filtrar BrowserE2E con regex case-sensitive browser.*e2e
- **❌ Incorrecto**: Filtrar BrowserE2E con regex case-sensitive browser.*e2e.
- **✅ Correcto**: Etiquetar TEST LABELS y comprobar al menos una ejecución.

### 02. Usar URL de internet pública en test de login
- **❌ Incorrecto**: Usar URL de internet pública en test de login.
- **✅ Correcto**: HTTP fixture local y perfil temporal limpio.

### 03. Comprobar incognito mirando icono solamente
- **❌ Incorrecto**: Comprobar incognito mirando icono solamente.
- **✅ Correcto**: Verificar cookies y storage antes/después de reinicio.

### 04. Omitir permisos de origen/certificados
- **❌ Incorrecto**: Omitir permisos de origen/certificados.
- **✅ Correcto**: Casos de denegación, cancelación y error de certificado.

### 05. Asumir headless sin compositor compatible
- **❌ Incorrecto**: Asumir headless sin compositor compatible.
- **✅ Correcto**: Configurar runner soportado y reportar BLOCKED si falta.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Golden path Browser: login, persistencia y privado

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** Verificación funcional real para navegador, kiosk o cliente web embebido.

## Política y decisiones de diseño

1. Arrancar navegador con perfil normal nuevo; cargar servidor HTTP local fixture; login y establecer cookie.
2. Cerrar y reiniciar proceso; comprobar que una cookie persistente esperada persiste.
3. Abrir perfil privado: no reutiliza cookies del normal y sus datos no se persisten.
4. Probar descarga segura, permiso por sitio, URL maliciosa y recuperación tras cierre inesperado.

## Ejemplo técnico específico — Journey E2E del navegador

```text
Launch normal -> local HTTP login -> Set-Cookie -> restart -> session persists
Launch private -> cannot read normal cookies -> close -> no private resume
```

**Criterio de aprobación:** E2E con servidor HTTP local y múltiples orígenes/ventanas; smoke HTML local no cuenta.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** E2E con ejecutable real y Qt WebEngineProcess empacado; no cuenta smoke de HTML solo.
- **Gate 2:** Capturar logs, estado storage y resultado de prueba; fail si no hay display.
- **Gate 3:** Validar en cada plataforma declarada antes de release.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Arrancar navegador con perfil normal nuevo; cargar servidor HTTP local fixture; login y establecer cookie. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Tratar test que carga `about:blank` como browser E2E completo.
- ❌ **Incorrecto:** Compartir profile entre normal e incognito.
- ❌ **Incorrecto:** Hacer click en GUI sin verificar efectos externos.

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
- [qtdeploy](https://doc.qt.io/qt-6/deployment.html) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Probar navegación con archivo local solamente
- **❌ Incorrecto**: Probar navegación con archivo local solamente.
- **✅ Correcto**: Servidor HTTP de prueba: login, cookies y reinicio.

### 02. No verificar descarga real en carpeta aislada
- **❌ Incorrecto**: No verificar descarga real en carpeta aislada.
- **✅ Correcto**: Descargar fixture, comprobar bytes y limpiar ruta.

### 03. Error SSL presentado como página vacía
- **❌ Incorrecto**: Error SSL presentado como página vacía.
- **✅ Correcto**: UI de certificado y política de no bypass por defecto.

### 04. Cerrar tab sin cancelar permisos/descargas
- **❌ Incorrecto**: Cerrar tab sin cancelar permisos/descargas.
- **✅ Correcto**: Probar lifecycle con tareas en curso y resultados tardíos.

### 05. No probar persistencia entre ejecuciones
- **❌ Incorrecto**: No probar persistencia entre ejecuciones.
- **✅ Correcto**: E2E browser normal y privado en procesos independientes.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

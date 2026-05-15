# C++/Qt CI/CD, supply chain y distribución

**Estado:** norma específica del stack CPP, 2026. **Owner:** `stacks/cpp/`. **Alcance:** PR, nightly, release con verificación real de ejecutable Qt y licencias.

## Política y decisiones de diseño

1. PR: clang-format, clang-tidy selectivo, configure/build/CTest y E2E afectado. Nightly: matrices OS, sanitizers y estabilidad; Release: installer smoke, SBOM, firma y artefactos.
2. Preset de producto requiere Qt y componentes exactos (p.ej., Qt6::WebEngineWidgets), nunca pase silencioso solo por core.
3. Revisar licencias de Qt/Chromium y dependencias conforme distribución, firma y actualización de seguridad.
4. Verificar QtWebEngineProcess, resources, plugins y ABI en máquina limpia; no publicar build sin smoke post-instalación.

## Ejemplo técnico específico — Release verificable

```bash
# Pipeline del consumidor debe aportar artefactos y scripts reales
bash scripts/vigilio-release-gate.sh
# Verifica binario, package, checksum, SBOM, firma y smoke de instalación.
```

**Criterio de aprobación:** No declarar firmado un artefacto por tener variable de firma: ejecutar verificador que falla cerrado.

**Revisión adversaria:** alterar un valor/archivo/permiso crítico y comprobar que la prueba correspondiente falla. Solo elevar a PASS si el proyecto consumidor ejecutó realmente el comando o el flujo nativo.

## Procedimiento de implementación

1. **DISCOVER:** abrir manifests reales, versiones, código consumidor y pruebas existentes; identificar qué ya está construido. No imponer carpetas por moda.
2. **DECIDE:** comparar dos soluciones razonables, explicitar tradeoffs, compatibilidad, seguridad, estado y ownership. Documentar ADR solo cuando la decisión afecte varias capacidades o sea difícil de revertir.
3. **BUILD:** modificar el conjunto mínimo de archivos con tests de comportamiento, manteniendo contratos y cambios ajenos.
4. **VERIFY:** ejecutar checks disponibles, documentar comando + exit code + entorno; clasificar `PASS`, `FAIL`, `BLOCKED` o `NOT_RUN`.
5. **REVIEW:** revisión independiente de diff, consumidores afectados, seguridad y calidad; correcciones fuera de fase REVIEW.

## Quality gates específicos

- **Gate 1:** `ctest --preset ci --output-on-failure` con tests reales; fail si cero registrados.
- **Gate 2:** Required checks en reglas de rama del consumidor.
- **Gate 3:** Guardar provenance de toolchain/dependencias/artefactos.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** PR: clang-format, clang-tidy selectivo, configure/build/CTest y E2E afectado. Nightly: matrices OS, sanitizers y estabilidad; Release: installer smoke, SBOM, firma y artefactos. Registrar la evidencia, no solo la intención.
- ❌ **Incorrecto:** Borrar secretos de firma desde PR.
- ❌ **Incorrecto:** Usar estado verde de core como release del navegador.
- ❌ **Incorrecto:** Asumir licencia comercial automáticamente.

## Riesgos y fallos a anticipar

- **Integridad:** identificar contratos de fichero, persistencia o API que cambian; diseñar reversión operativa antes de desplegar.
- **Concurrencia:** modelar cierre, cancelación, recursos retenidos y operaciones simultáneas, sin asumir éxito de callbacks futuros.
- **Cadena de suministro:** resolver dependencias de la versión fijada, licencias y actualizaciones de seguridad; un `README` no sustituye lockfiles o artefactos.
- **Proporcionalidad:** evitar interfaces, crates, targets o servicios que no se justifican por complejidad real.

## Estándares generales relacionados

[solid.md](../../../foundations/architecture/solid.md), [code-comments-and-docstrings.md](../../../standards/engineering/code-comments-and-docstrings.md), [e2e-quality-gates.md](../../../standards/testing/e2e-quality-gates.md), [change-impact-and-review-gates.md](../../../standards/engineering/change-impact-and-review-gates.md). Mantener esos documentos como propietarios de sus reglas; esta guía solo añade decisiones especializadas.

## Fuentes técnicas oficiales

- [cmake](https://cmake.org/cmake/help/latest/manual/cmake-buildsystem.7.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [qtdeploy](https://doc.qt.io/qt-6/deployment.html) — verificar compatibilidad con la versión efectiva del consumidor.
- [github](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) — verificar compatibilidad con la versión efectiva del consumidor.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Declarar RELEASE_READY solo porque VIGILIO_NATIVE_BINARY no está vacío
- **❌ Incorrecto**: Declarar RELEASE_READY solo porque VIGILIO_NATIVE_BINARY no está vacío.
- **✅ Correcto**: Comprobar archivo existente y arrancarlo tras instalación.

### 02. Empaquetar Qt ejecutable sin QtWebEngineProcess y recursos
- **❌ Incorrecto**: Empaquetar Qt ejecutable sin QtWebEngineProcess y recursos.
- **✅ Correcto**: Verificar dependencias/plugins/Chromium en ambiente limpio.

### 03. Publicar con action tags mutables sin controles
- **❌ Incorrecto**: Publicar con action tags mutables sin controles.
- **✅ Correcto**: Versiones fijadas y permisos mínimos de workflow.

### 04. Firmar release sin SBOM ni hash contrastado
- **❌ Incorrecto**: Firmar release sin SBOM ni hash contrastado.
- **✅ Correcto**: Checksum, SBOM, licencia, firma y verificación conjunta.

### 05. Compilar solo Linux y prometer Windows/macOS
- **❌ Incorrecto**: Compilar solo Linux y prometer Windows/macOS.
- **✅ Correcto**: Ejecutar matrices de plataformas soportadas y firma específica.

### Política de pruebas y optimización

**Gate del stack:** `cmake --preset ci`, build y `ctest --preset ci --output-on-failure` en un consumidor con presets reales; exigir descubrimiento de tests >0 y, para browser, QtWebEngine + tests de perfiles/privacidad.

**Optimización:** perfilar memoria/CPU/latencia de UI; ownership RAII y QObject antes que microoptimizaciones; medir renderer/QtWebEngine si aplica.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

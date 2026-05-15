# CI/CD — Godot, 2D/3D, exportación y publicación

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** PR, nightly, release multiplataforma y recursos licenciados.

## Decisiones de arquitectura

1. Fijar versión Godot exacta (referencia estable 4.7.2, verificar compatibilidad), hash binario, import presets, addons y export templates correspondientes; never usar `latest` silenciosamente.
2. PR: validar archivos proyecto, importar, ejecutar suite headless real y pruebas estáticas; UI y jugabilidad críticas en runners preparados.
3. Nightly: escenas con assets reales, regresión rendimiento, audio, controles, 2D/3D y matriz de plataformas. Medir regresiones en hardware fijo.
4. Release: export presets confirmados, templates instaladas, comprobar fichero final, smoke del binario exportado, versiones y licencias; firma/tiendas según plataforma. Android/iOS/consola tienen SDK/acuerdos específicos.

## Implementación de referencia

```bash
# Ejemplo de comprobaciones reales y export controlado.
set -euo pipefail
GODOT_BIN="${GODOT_BIN:-godot}"
"$GODOT_BIN" --headless --path . --editor --import
"$GODOT_BIN" --headless --path . --script res://tests/smoke_test.gd
[[ -f export_presets.cfg ]] || { echo 'BLOCKED export_presets.cfg missing'; exit 2; }
mkdir -p dist
"$GODOT_BIN" --headless --path . --export-release "Linux" dist/game.x86_64
[[ -s dist/game.x86_64 ]] || { echo 'FAIL no export artifact'; exit 1; }
```

Preset «Linux» es ejemplo, debe coincidir con nombre instalado y recursos correspondientes. No entregar export sin ejecutar en OS objetivo.

## Verificación obligatoria

- [ ] Simular falta de export_presets y comprobar BLOCKED distinto de cero.
- [ ] Simular export que produce directorio vacío y comprobar FAIL.
- [ ] Distinguir PR sin release de release con smoke de binario real.

## Casos adversarios y revisión

- ❌ `godot --headless --quit` utilizado como gate de release.
- ❌ `export_presets.cfg` con credenciales incrustadas o addons sin licencias.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — command line tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
- [Godot — exporting projects](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Usar export preset no configurado y devolver código 0
- **❌ Incorrecto**: Usar export preset no configurado y devolver código 0.
- **✅ Correcto**: Validar preset, binario, tamaño y resultado de export.

### 02. Construir desde assets importados locales únicamente
- **❌ Incorrecto**: Construir desde assets importados locales únicamente.
- **✅ Correcto**: Headless import desde checkout limpio antes de export.

### 03. Publicar build desktop como Android sin SDK/keystore
- **❌ Incorrecto**: Publicar build desktop como Android sin SDK/keystore.
- **✅ Correcto**: Matrices y herramientas por plataforma con secretos aislados.

### 04. Poner claves de firma en PR abierto
- **❌ Incorrecto**: Poner claves de firma en PR abierto.
- **✅ Correcto**: Secretos solo en release protegido y firma posterior.

### 05. Entregar juego sin smoke tras instalación
- **❌ Incorrecto**: Entregar juego sin smoke tras instalación.
- **✅ Correcto**: Arrancar export y verificar menú/scene lifecycle por plataforma.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

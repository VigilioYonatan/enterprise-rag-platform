# Pipeline de assets — arte, música, modelos y licencias

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** sprites, audio, VFX, modelos glTF, fuentes y contenidos localizados.

## Decisiones de arquitectura

1. Cada asset incluye origen, licencia, autor, uso permitido, cambios realizados y versión; no asumir permiso comercial de assets gratuitos o generados externamente.
2. Para 3D preferir glTF/glb e importar mediante opciones versionadas; preservar modelo fuente y definir convenciones de escala, pivote, materiales, animaciones y rigs.
3. Para sprites/tiles: resolución base, atlas, filtros, escala, pivotes y reglas de compresión. Para música/SFX: volumen y formatos de streaming, canales y loop points.
4. Limitar tamaño de binarios en Git (evaluar LFS), excluir import cache `.godot/`, revisar recursos huérfanos y comprobar licencias antes de release.

## Implementación de referencia

```text
assets/audio/
├── music/exploration_loop.ogg
├── sfx/player_jump.wav
├── sfx/player_land.wav
└── AUDIO_LICENSES.md  # autor, licencia, fuente, permisos, cambios
assets/3d/
├── characters/hero.glb
└── SOURCE_LICENSES.md
```

Los nombres son ejemplos; no afirmar que esos recursos existan si no están incluidos.

## Verificación obligatoria

- [ ] Importar assets con Godot fijado y comprobar fallos/duplicados.
- [ ] Validar que faltan permisos de terceros antes de publicar.
- [ ] Prueba de audio loop: no click audible en hardware objetivo.

## Casos adversarios y revisión

- ❌ Copiar audio desde redes sociales sin licencia.
- ❌ Commitear `.godot/imported/` como requisito de código fuente.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — available formats](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html)
- [Godot — audio buses](https://docs.godotengine.org/en/stable/tutorials/audio/audio_buses.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Pegar sprite bajado sin licencia al repositorio
- **❌ Incorrecto**: Pegar sprite bajado sin licencia al repositorio.
- **✅ Correcto**: Registrar origen, licencia y restricciones de redistribución.

### 02. Reducir texturas únicamente por intuición
- **❌ Incorrecto**: Reducir texturas únicamente por intuición.
- **✅ Correcto**: Definir tamaño/compresión por plataforma y medir memoria GPU.

### 03. Reemplazar assets binarios sin conservar fuente editable
- **❌ Incorrecto**: Reemplazar assets binarios sin conservar fuente editable.
- **✅ Correcto**: Versionar fuente y ruta de export/import reproducible.

### 04. Cometer un import cache del editor como único recurso
- **❌ Incorrecto**: Cometer un import cache del editor como único recurso.
- **✅ Correcto**: Probar importación --headless desde checkout limpio.

### 05. Mezclar sprites con pivots/unidades inconsistentes
- **❌ Incorrecto**: Mezclar sprites con pivots/unidades inconsistentes.
- **✅ Correcto**: Convenciones de píxeles/escala, pivots y nombres verificadas.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

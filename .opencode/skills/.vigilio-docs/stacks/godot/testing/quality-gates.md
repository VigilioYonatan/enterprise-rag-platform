# Testing de videojuegos — pirámide por riesgo y evidencia

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** juegos Godot 2D/3D offline/online, gameplay y exportación.

## Decisiones de arquitectura

1. Separar: lógica pura (headless), escena/colisión (engine con físicas), input/jugabilidad (runner gráfico), backend/online (servicios de sandbox), desempeño (hardware real).
2. Un `--headless --editor --import` prueba importación, NO prueba interacción gráfica ni que el jugador salta bien. Ejecutar pruebas adecuadas a cada capa.
3. Usar fixtures deterministas, semillas fijas y escenas pequeñas; para física controlar delta/fixed timestep y tolerancias.
4. Estado explícito PASS/FAIL/BLOCKED/NOT_RUN; test obligatorio ausente o con cero escenarios = fallo de gate.

## Implementación de referencia

```bash
set -euo pipefail
: "${GODOT_BIN:=godot}"
"$GODOT_BIN" --version
"$GODOT_BIN" --headless --path . --editor --import
"$GODOT_BIN" --headless --path . --script res://tests/smoke_test.gd
# Export requiere export_presets.cfg + templates. No confundir con build ejecutable.
```

Pruebas de audio real, interacción de mando y frame pacing requieren dispositivos/runner preparado; headless no ofrece esa evidencia.

## Verificación obligatoria

- [ ] Después de import, comprobar parser y exit 0 de tests con >=1 assertion.
- [ ] Prueba de salto y aterrizaje con límites de frame/tiempo.
- [ ] SFX de salto se invoca 1 vez y buses correctos (lógica); audición real en dispositivo según plan.
- [ ] Caso offline: no se intenta conectar a AWS/DB por defecto.

## Casos adversarios y revisión

- ❌ `godot --headless --quit` marcado como 100% E2E.
- ❌ Test sin assertions que devuelve código 0.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — command line tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
- [Godot — unit testing](https://docs.godotengine.org/en/stable/tutorials/testing/unit_testing.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Publicar juego con todos unit PASS pero sin export real
- **❌ Incorrecto**: Publicar juego con todos unit PASS pero sin export real.
- **✅ Correcto**: Probar imports, tests, export, instalación y smoke del artefacto.

### 02. No fallar pipeline cuando no descubre tests
- **❌ Incorrecto**: No fallar pipeline cuando no descubre tests.
- **✅ Correcto**: Contadores mínimos de pruebas y condición failure en ausencia.

### 03. Prueba de gameplay depende de red pública
- **❌ Incorrecto**: Prueba de gameplay depende de red pública.
- **✅ Correcto**: Backend fixture local y escenario de desconexión.

### 04. Omitir perfiles de rendimiento por plataforma
- **❌ Incorrecto**: Omitir perfiles de rendimiento por plataforma.
- **✅ Correcto**: Nightly con presupuestos y telemetría configurable.

### 05. Release sin comprobar permisos y contenido binario
- **❌ Incorrecto**: Release sin comprobar permisos y contenido binario.
- **✅ Correcto**: Firma/checksum y verificación de paquetes por plataforma.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

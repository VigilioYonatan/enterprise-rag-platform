# Pruebas automatizadas de Godot — CI reproducible

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** unit tests de scripts, escenas, integración y regressions.

## Decisiones de arquitectura

1. Usar script nativo `SceneTree` para smoke determinista si no hay framework; adoptar GUT/GdUnit4 solo tras fijar commit, licencia, compatibilidad y runner real.
2. Nunca declarar test ejecutado porque el addon está en `addons/`; CI debe descubrir y contar casos/afirmaciones, respetar exit codes y publicar logs.
3. Test harness de físicas: fixture pequeña, stepping consistente, verificar colisiones y estados. Para UI usar runner gráfico si el caso lo necesita.
4. Incluir test que falla intencionalmente para probar que CI realmente se bloquea.

## Implementación de referencia

```gdscript
# tests/smoke_test.gd — Godot --headless --script res://tests/smoke_test.gd
extends SceneTree

func _initialize() -> void:
    var success := 2 + 2 == 4
    if not success:
        push_error("Smoke assertion failed")
        quit(1)
    else:
        print("PASS godot smoke assertions=1")
        quit(0)
```

El ejemplo básico valida el harness, no reemplaza tests de gameplay. Un test de física debe crear un escenario y comprobar resultado esperado.

## Verificación obligatoria

- [ ] Ejecutar un test deliberadamente fallido: resultado distinto de cero.
- [ ] Eliminar archivo de tests requerido y verificar que CI no marca PASS.
- [ ] Comprobar importación y test suite después de renombrar un Resource.

## Casos adversarios y revisión

- ❌ Prueba ignorada porque un addon no se descargó.
- ❌ Contar el número de archivos `*_test.gd` como casos ejecutados.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — command line tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Dar PASS por analizar texto de .tscn sin motor
- **❌ Incorrecto**: Dar PASS por analizar texto de .tscn sin motor.
- **✅ Correcto**: Ejecutar godot --headless con importación y tests funcionales.

### 02. Usar asserts solo de velocidad constante y no de colisión
- **❌ Incorrecto**: Usar asserts solo de velocidad constante y no de colisión.
- **✅ Correcto**: Test de escenas reales con Player/Suelo y condiciones físicas.

### 03. Empezar tests desde estado guardado no determinista
- **❌ Incorrecto**: Empezar tests desde estado guardado no determinista.
- **✅ Correcto**: Fixture limpio y seed reproducible por caso.

### 04. Omitir fallos de parse de escenas cargadas dinámicamente
- **❌ Incorrecto**: Omitir fallos de parse de escenas cargadas dinámicamente.
- **✅ Correcto**: Importar recursos y cargar instancias críticas.

### 05. Confundir smoke headless con audio/UX validado
- **❌ Incorrecto**: Confundir smoke headless con audio/UX validado.
- **✅ Correcto**: QA gráfico/audio manual y device matrix separados.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# GDScript tipado, C# y límites de scripts

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** selección pragmática de lenguaje y código mantenible.

## Decisiones de arquitectura

1. Preferir GDScript tipado para iteración fluida, salvo razones reales de C#, equipos .NET o bibliotecas existentes. En plataformas destino, verificar soporte de C# y exportación.
2. Usar tipos, `class_name`, enums e interfaces implícitas con moderación. Separar cálculo puro (balance/combate) de integración con nodos.
3. Evitar `get_node()` en cada frame cuando pueda resolver la dependencia una vez, y no crear wrappers para cada propiedad simple.
4. Definir IDs/contratos estables entre scripts, guardado y backend. No introducir breaking changes en `Resource` versionados sin migración.

## Implementación de referencia

```gdscript
class_name DamageCalculator
extends RefCounted

static func apply_armor(raw_damage: int, armor: int) -> int:
    return maxi(0, raw_damage - maxi(0, armor))

# Verificar con pruebas de límites: armor < 0, daño 0, daño grande.
```

Una clase puramente funcional como esta puede probarse en modo headless; no necesita escena UI ni `autoload`.

## Verificación obligatoria

- [ ] Validar que GDScript se analiza después de importar recursos.
- [ ] Correr casos límites y regresiones en funciones puras.
- [ ] Documentar matriz de plataformas cuando se elija C#.

## Casos adversarios y revisión

- ❌ Elegir C# por costumbre ignorando soporte de exportación.
- ❌ Usar `Variant` para todo sin validar claves o tipos.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — static typing](https://docs.godotengine.org/en/stable/tutorials/scripting/gdscript/static_typing.html)
- [Godot — index](https://docs.godotengine.org/en/stable/tutorials/scripting/c_sharp/index.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Godot signal con argumentos variant sin contrato
- **❌ Incorrecto**: Godot signal con argumentos variant sin contrato.
- **✅ Correcto**: Señales y variables tipadas con nombres consistentes en feature.

### 02. Usar _process para física y saltos
- **❌ Incorrecto**: Usar _process para física y saltos.
- **✅ Correcto**: Usar _physics_process para CharacterBody y cálculo físico.

### 03. Mezclar GDScript y C# arbitrariamente en una escena sin regla
- **❌ Incorrecto**: Mezclar GDScript y C# arbitrariamente en una escena sin regla.
- **✅ Correcto**: Elegir lenguaje por capacidades/plataformas y mantener contratos claros.

### 04. Poner 500 líneas de UI dentro de Player.gd
- **❌ Incorrecto**: Poner 500 líneas de UI dentro de Player.gd.
- **✅ Correcto**: Separar input, lógica gameplay y presentación por responsabilidades.

### 05. Usar @onready para nodo que cambia dinámicamente
- **❌ Incorrecto**: Usar @onready para nodo que cambia dinámicamente.
- **✅ Correcto**: Resolver lifecycle y validar existencia del nodo previo a uso.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

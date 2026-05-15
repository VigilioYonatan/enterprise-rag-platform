# Gameplay — input, state machines, inventario y reglas

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** gameplay 2D/3D, combate, RPG, roguelike, puzles y sistemas de progreso.

## Decisiones de arquitectura

1. Distinguir input/intención, transición de estado, simulación y feedback. No animar daños por sistema de salud que dependa de la UI.
2. Maquinas de estados: `idle`, `run`, `jump`, `attack`, `hurt`, `dead` según complejidad real. No crear un state pattern de 100 archivos para 3 estados sencillos.
3. Modelar cooldown, daño, invulnerabilidad, combo y estadísticas en datos Resources y lógica testeable con valores de borde.
4. Inventario/items: ID estable, stack size, límites, reglas de equipamiento y migraciones de datos de guardado.

## Implementación de referencia

```gdscript
class_name PlayerHealth
extends RefCounted

signal died
var current_hp: int

func _init(max_hp: int) -> void:
    assert(max_hp > 0)
    current_hp = max_hp

func take_damage(amount: int) -> void:
    if amount <= 0 or current_hp == 0: return
    current_hp = maxi(0, current_hp - amount)
    if current_hp == 0: died.emit()
```

La animación de muerte escucha `died` y nunca reescribe `current_hp`.

## Verificación obligatoria

- [ ] Daño cero, negativo, overflow, daño simultáneo y muerte solo una vez.
- [ ] Restauración de estado desde save y no duplicación de items.
- [ ] Input remapeado entre teclado y controller.

## Casos adversarios y revisión

- ❌ Vida y muerte controladas por sprite animation.finished.
- ❌ Inventario online confirmado únicamente desde el cliente.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — inputevent](https://docs.godotengine.org/en/stable/tutorials/inputs/inputevent.html)
- [Godot — resources](https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Consultar Input.is_action_pressed en UI y gameplay con reglas divergentes
- **❌ Incorrecto**: Consultar Input.is_action_pressed en UI y gameplay con reglas divergentes.
- **✅ Correcto**: Input actions centralizadas y contexto activo.

### 02. Atacar estando en estado Stunned
- **❌ Incorrecto**: Atacar estando en estado Stunned.
- **✅ Correcto**: Máquina de estados con transiciones permitidas.

### 03. Usar Timer compartido para todos los enemigos
- **❌ Incorrecto**: Usar Timer compartido para todos los enemigos.
- **✅ Correcto**: Cooldowns por entidad/configuración explícita.

### 04. Aplicar daño dos veces cuando se solapan hitboxes
- **❌ Incorrecto**: Aplicar daño dos veces cuando se solapan hitboxes.
- **✅ Correcto**: Registro de ventana de hit y pruebas por frame.

### 05. Resolver daño cliente como autoridad multijugador
- **❌ Incorrecto**: Resolver daño cliente como autoridad multijugador.
- **✅ Correcto**: Servidor decide estado y cliente representa feedback.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

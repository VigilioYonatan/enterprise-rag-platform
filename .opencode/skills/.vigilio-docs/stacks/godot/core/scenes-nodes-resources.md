# Escenas, nodos, señales y Resources

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** composición de gameplay y gestión de datos del juego.

## Decisiones de arquitectura

1. Una escena `.tscn` representa una entidad funcional cohesionada (jugador, nivel, HUD, proyectil). No heredar escenas por decoración: composición antes que jerarquías de herencia profundas.
2. Los `Resource` tipados `.tres` contienen configuración reutilizable (daño, salto, ítems) y no deben confundirse con estado persistente mutable de múltiples partidas.
3. Señales comunican eventos específicos entre nodos sin acoplarse a rutas absolutas frágiles. Validar desconexión/`queue_free` y lifecycle.
4. AutoLoads exclusivamente para servicios verdaderamente transversales (configuración/audio/escenas), no como contenedor universal de dominio.

## Implementación de referencia

```gdscript
# resources/weapon_stats.gd
class_name WeaponStats
extends Resource

@export_range(1, 1000) var base_damage: int = 12
@export_range(0.1, 10.0) var cooldown_seconds: float = 0.4

# scenes/player/player.gd
class_name PlayerCharacter
extends CharacterBody2D

signal damaged(amount: int)
@export var weapon: WeaponStats

func receive_damage(amount: int) -> void:
    if amount <= 0:
        return
    damaged.emit(amount)
```

La escena conecta `damaged` al HUD por su propietario; el HUD no consulta un singleton global de cada enemigo.

## Verificación obligatoria

- [ ] Duplicar instancias de jugador y verificar que no comparten accidentalmente estado mutable.
- [ ] Destruir el HUD durante una señal y comprobar que no queda callback inválido.
- [ ] Verificar referencias de Resources y escenas importadas en CI headless.

## Casos adversarios y revisión

- ❌ Un NodePath absoluto para comunicar 20 escenas.
- ❌ Un Resource mutable compartido como partida individual sin duplicarlo.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — scene organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html)
- [Godot — resources](https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Duplicar scripts y stats en cada enemigo
- **❌ Incorrecto**: Duplicar scripts y stats en cada enemigo.
- **✅ Correcto**: Recursos de configuración tipados y escenas reusables.

### 02. Crear dependencias get_node("../../../../Player")
- **❌ Incorrecto**: Crear dependencias get_node("../../../../Player").
- **✅ Correcto**: Usar señales, referencias exportadas o inyección en composición.

### 03. Modificar un Resource compartido sin duplicarlo
- **❌ Incorrecto**: Modificar un Resource compartido sin duplicarlo.
- **✅ Correcto**: Hacer instancias de estado mutable por entidad cuando corresponda.

### 04. Autoload para todos los componentes locales
- **❌ Incorrecto**: Autoload para todos los componentes locales.
- **✅ Correcto**: Autoload solo para capacidades globales justificadas.

### 05. Instanciar escenas en hot loop cada frame
- **❌ Incorrecto**: Instanciar escenas en hot loop cada frame.
- **✅ Correcto**: Pooling únicamente si profiling evidencia impacto.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

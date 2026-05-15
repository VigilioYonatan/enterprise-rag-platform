# Economía de juego, items, drops y balance

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** RPG, loot, experiencia, niveles y compras cuando corresponda.

## Decisiones de arquitectura

1. Definir IDs inmutables, reglas de stack/equipar, probabilidades y unidades antes de crear tablas o Resources.
2. Balance debe ser data-driven con rangos testeables y simulaciones reproducibles por semilla; no constantes dispersas en 20 nodos.
3. Compras y moneda premium se autorizan en servidor/servicio de tienda, nunca en UI Godot ni mediante validación puramente local.
4. Separar economía cosmética, progresión offline y economía online; auditar duplicaciones, replay y rollbacks.

## Implementación de referencia

```gdscript
class_name LootRoll
extends RefCounted

static func choose_drop(chance: float, rng: RandomNumberGenerator) -> bool:
    assert(chance >= 0.0 and chance <= 1.0)
    return rng.randf() < chance
```

Con `rng.seed` fija, una simulación de 10000 iteraciones detecta sesgos o regresiones; la probabilidad por sí sola no define políticas antifraude.

## Verificación obligatoria

- [ ] Drops a p=0 y p=1 siempre coherentes.
- [ ] Una compra no se concede dos veces con reintentos/idempotency key.
- [ ] Recuperar progreso luego de reinicio o caída de red.

## Casos adversarios y revisión

- ❌ Moneda premium calculada en el cliente como autoridad.
- ❌ Premios aleatorios sin auditoría ni posibilidad de reproducir semilla cuando hace falta.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — resources](https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html)
- [Godot — random number generation](https://docs.godotengine.org/en/stable/tutorials/math/random_number_generation.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Guardar precios de objetos dentro de controles de tienda
- **❌ Incorrecto**: Guardar precios de objetos dentro de controles de tienda.
- **✅ Correcto**: Item Resource/config de dominio y presentación separada.

### 02. Permitir monedas negativas por compra simultánea
- **❌ Incorrecto**: Permitir monedas negativas por compra simultánea.
- **✅ Correcto**: Validar fondos, transacción/idempotencia según modo juego.

### 03. Usar RNG global sin seed para pruebas de loot
- **❌ Incorrecto**: Usar RNG global sin seed para pruebas de loot.
- **✅ Correcto**: RNG inyectable/seed en simulaciones reproducibles.

### 04. Cambiar drop rates sin simulación
- **❌ Incorrecto**: Cambiar drop rates sin simulación.
- **✅ Correcto**: Monte Carlo y tests de distribución con tolerancias.

### 05. Confiar precio de compra enviado por cliente online
- **❌ Incorrecto**: Confiar precio de compra enviado por cliente online.
- **✅ Correcto**: Validar precio y saldo en servidor autoritativo.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

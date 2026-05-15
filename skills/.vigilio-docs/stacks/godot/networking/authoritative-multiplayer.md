# Multijugador — autoridad, predicción y anti-cheat

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** cooperativo, PvP, MMO-lite, lobby, dedicated server y partidas online.

## Decisiones de arquitectura

1. Comparar peer-to-peer, servidor dedicado y relay según género, presupuesto, NAT, tickrate y detección de trampas. No exigir multiplayer en juego offline.
2. El servidor decide estados sensibles (posiciones validadas, daño, inventario, recompensas) y comprueba RPC/inputs; no aceptar teletransporte del cliente como verdad.
3. Predicción/reconciliación solo donde la latencia y género lo justifiquen; presupuestos de tick/bandwidth y rate limits por conexión.
4. Diseñar reconexión, presencia/lobbies, compatibilidad de versión y graceful shutdown; evitar asumir que ENet equivale a backend HTTP y protección anti-DDoS.

## Implementación de referencia

```gdscript
# Ejemplo esquemático: intención y validación, nunca aceptar daño autoritativo.
@rpc("any_peer", "reliable")
func request_attack(target_network_id: int) -> void:
    if not multiplayer.is_server(): return
    var sender_id := multiplayer.get_remote_sender_id()
    if not _is_attack_allowed(sender_id, target_network_id):
        return
    _apply_server_authoritative_attack(sender_id, target_network_id)

# Implementar _is_attack_allowed/_apply_server_authoritative_attack
# con cooldown, proximidad, ownership y control de concurrencia reales.
```

Lo anterior es un **patrón ilustrativo**, no un servidor compilable sin esas funciones. Las APIs RPC concretas dependen de la versión fijada.

## Verificación obligatoria

- [ ] De forma adversaria mandar RPC desde un peer distinto al propietario.
- [ ] Enviar acciones demasiado rápido, latencias altas, pérdida de paquetes y replay.
- [ ] Matar servidor o perder internet y comprobar recuperación/timeout.

## Casos adversarios y revisión

- ❌ Cliente decide el oro, daño, respawn o recompensas premium.
- ❌ Un RPC sin límites ni validación de argumentos.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — high level multiplayer](https://docs.godotengine.org/en/stable/tutorials/networking/high_level_multiplayer.html)
- [DDD pragmático](../../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../../standards/engineering/change-impact-and-review-gates.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Dejar que cliente decida daño, economía y posiciones finales
- **❌ Incorrecto**: Dejar que cliente decida daño, economía y posiciones finales.
- **✅ Correcto**: Server authority con verificación de acciones y estado.

### 02. Enviar RPC para cada frame con paquetes ilimitados
- **❌ Incorrecto**: Enviar RPC para cada frame con paquetes ilimitados.
- **✅ Correcto**: Tick-rate, snapshots y budget de red definidos.

### 03. Reconectar enviando comandos duplicados sin idempotencia
- **❌ Incorrecto**: Reconectar enviando comandos duplicados sin idempotencia.
- **✅ Correcto**: Identificadores de secuencia y reconciliación.

### 04. Recibir identidad de jugador desde payload sin verificar canal
- **❌ Incorrecto**: Recibir identidad de jugador desde payload sin verificar canal.
- **✅ Correcto**: Validar autenticación/peer vinculado y permisos.

### 05. Asumir juego online inmune a cheating porque usa Godot
- **❌ Incorrecto**: Asumir juego online inmune a cheating porque usa Godot.
- **✅ Correcto**: Threat model, rate limiting y pruebas contra inputs hostiles.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Auto-Senior — doce decisiones de contexto y ubicación de símbolos

Este playbook complementa [context budget](../standards/ai/adaptive-context-budget-and-evidence.md), [skill reading](../standards/ai/precision-skill-reading-and-conflict-resolution.md) y [ownership](../standards/engineering/file-and-symbol-ownership.md). Los ejemplos son instrucciones de routing, no ejecuciones reales.

| Petición natural | Skills a considerar | Normas/criterios imprescindibles | Evitar |
|---|---|---|---|
| «quiero hacer un login» sin repo | Auto-Senior + UX Discovery | aclarar plataforma, auth real y seguridad, recomendar | elegir Nest o Laravel sin evidencia |
| «extrae HASH_OPTIONS de AuthService» Nest | Symbol Ownership + Nest Feature/Review | módulo auth/config + ports + DI token | mover todos los const locales |
| «organiza shared/ de una web» | Symbol Ownership + Web | feature ownership, segunda necesidad de reuso, tokens UI | shared utils universales |
| «haz botones reutilizables Expo» | UX Mobile + Design System | touch, focus, tokens, contratos | importar DOM o CSS |
| «separa enums de Eloquent Laravel» | Symbol Ownership + Laravel | PHP Enums, Contracts, FormRequests | TS types en PHP |
| «organiza crates Rust CLI» | Rust Workspace + Symbol Ownership | Cargo members, crates solo si frontera | crate por archivo |
| «extrae constants de Auth en Rust» | Symbol Ownership + Rust | `pub(crate)`, config local, no secret en const | globalizar políticas de auth |
| «añade sonido de salto en Godot 2D» | Godot gameplay/audio + UX game | signals, Resource, audio bus, input | tocar backend sin necesidad |
| «agrega cámara 3D al juego» | Godot gameplay + UX game | escena 3D, colisión, sensibilidad, input | usar Camera2D |
| «quiero un juego online» | Godot Backend + Security | auth servidor, replay, timeout, propiedad de datos | confiar en cliente |
| «optimiza contexto al revisar un monorepo» | Adaptive Budget + Precision Reader | module scope, full skill reads, SHA, evidence | abrir 83 cuerpos |
| «reestructura un proyecto Qt» | C++ Workspace + Symbol Ownership | RAII, QObject ownership, target boundaries | copiar GPUI/Rust |

**Testing:** routing por fixture, negativas de presupuestos, enlaces Docs, build/test de consumidor. Una skill sugerida no es una skill leída. Citar siempre versión y estados `PASS/FAIL/BLOCKED/NOT_RUN`.

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Registrar stack real, fuentes abiertas, tests y consumidor afectado antes de editar.
- ❌ **Incorrecto:** Seleccionar todas las tecnologías de un catálogo porque son candidatas.

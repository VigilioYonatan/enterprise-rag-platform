# De una idea a un videojuego 2D/3D — Vigilio Auto-Senior

**Estado:** guía operativa vigente. **Owner:** `playbooks/`. No impone Godot hasta conocer el proyecto.

## Descubrimiento sin repositorio

Cuando el usuario diga «quiero un videojuego», el agente debe:

1. Inferir género (plataformas, RPG, FPS, estrategia, simulador, carrera, puzzle, educativo), si será 2D, 2.5D, 3D, VR o mixto, y plataformas de distribución.
2. Comparar motores **instalados y cubiertos por skills** con criterios: licencia, assets, animación, red, consolas, experiencia de equipo, coste, hardware, soporte y time-to-first-playable. No elegir Godot simplemente porque exista la skill.
3. Preguntar solo decisiones irreversibles o con impacto: 2D/3D, offline/online, plataformas y monetización/datos cuando cambien la arquitectura. Recomendar una opción y explicar riesgos de otra.
4. Proponer vertical slice verificable: input, movimiento, cámara, colisiones, una interacción, animación, música+SFX, menú, fallo/reinicio y test. El resto en roadmap gradual.
5. Para juego online separar **cliente no confiable** de API HTTP/backoffice y servidor autoritativo de gameplay; no obligar infraestructura externa a un juego local.

## Routing automático

- `project.godot` o Godot mencionado: [Godot](../stacks/godot/README.md) y skills pertinentes.
- 2D y salto: [Plataformas](../stacks/godot/2d/platformer-controls-and-combat.md), [Animación](../stacks/godot/gameplay/animation-vfx-and-camera.md), [Audio](../stacks/godot/audio/music-sfx-and-mixing.md).
- 3D: [Personaje](../stacks/godot/3d/character-camera-and-physics.md), [Animación](../stacks/godot/3d/lighting-animation-ai-navigation.md).
- Backend/online: [Integración HTTP](../stacks/godot/networking/backend-api-integration.md), [Autoridad](../stacks/godot/networking/authoritative-multiplayer.md).
- Testing/release: [Gates](../stacks/godot/testing/quality-gates.md), [CI](../stacks/godot/delivery/ci-cd-export-and-release.md).

## Preguntas Senior que sí valen la pena

- ¿Es un juego para móvil táctil, consola con requisitos particulares, desktop con teclado/mando, web o múltiples plataformas? ¿Hay hardware objetivo y presupuesto de FPS?
- ¿Un solo jugador, coop local o competitivo online? Esto decide servidor, anti-cheat, latencia y persistencia.
- ¿Necesita música dinámica, voz, subtitles o licencia comercial específica de assets?

No preguntar las versiones si `project.godot`/lockfile y CLI resuelven el dato; verificarlo en el consumidor.

## Matriz de QA

| Capa | Gate | Evidencia |
|---|---|---|
| Gameplay | Movimiento, cámara, salto, colisiones y feedback | Test de escena + ejecución visible |
| Arte/audio | Importación, buses, copyrights, efectos | Log de import + inventario de licencias + prueba real |
| Persistencia | Guardado v1/v2/corrupto | Fixtures, migraciones y recovery |
| Online | Contract tests, RPC, anti-cheat | Servidor sandbox, credenciales de test, replay adversario |
| Release | Binario exportado, plataforma, assets | Artefacto, checksum, smoke de instalación |

✅ Correcto: recomendar con contexto, elegir y validar. ❌ Incorrecto: crear un backend, una máquina de estados compleja o una plataforma de microservicios para un runner 2D local.

## Fuentes

- [Godot documentación estable](https://docs.godotengine.org/en/stable/)
- [Godot descargas oficiales](https://godotengine.org/download/archive/)
- [Política transversal de skills](../standards/ai/dynamic-capability-discovery.md)

## Dirección UX/UI no genérica por género

Antes de proponer pantallas, leer [UX/UI transversal](../standards/experience/README.md) y [Godot UX por género](../stacks/godot/ui/game-ux-accessibility-and-art-direction.md). Plataformas requieren feedback inmediato de salto; RPG requiere inventarios legibles; estrategia requiere overview y atajos; FPS requiere información periférica compacta; juegos infantiles requieren legibilidad, guía y pruebas de comprensión. No imponer estética común ni backend por defecto.

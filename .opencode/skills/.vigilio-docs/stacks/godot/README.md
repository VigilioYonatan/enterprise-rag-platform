# Godot 4 — Desarrollo profesional de videojuegos 2D y 3D

**Estado:** norma activa Godot 4.x. **Owner:** `stacks/godot/`. **Alcance:** juegos offline/online, plataformas PC, web, mobile y otras según soporte/exportadores reales.

## Decisiones de arquitectura

1. Godot se selecciona según género, plataforma, equipo, fidelidad gráfica, plazos, runtime GDScript/C# y soporte actual. No recomendarlo automáticamente solo por leer la palabra «juego».
2. Partir de una *vertical slice jugable* con entrada, movimiento, feedback audiovisual, estados, fallo/reinicio, menú y evidencia. Definir sensación del control (game feel) antes que 50 clases.
3. Reutilizar estándares globales de DDD pragmático, seguridad, comentarios, CI/CD y code review; esta carpeta solo posee reglas específicas del motor.
4. Multijugador, monetización, live ops y conexión a backend son opcionales; por defecto un juego local no requiere PostgreSQL, AWS, Redis ni microservicios.

## Implementación de referencia

```text
mi-juego/
├── project.godot
├── export_presets.cfg           # Solo presets SIN secretos
├── addons/                      # Plugins fijados/licencias verificadas
├── assets/                      # Audio, texturas, fuentes, modelos y autoría
├── scenes/                      # .tscn: niveles, UI, personajes y prefabs
├── scripts/                     # GDScript por feature, no scripts globales gigantes
├── resources/                   # .tres: parámetros, items, balance, datos
├── tests/                       # Lógica + escenas + smoke de gameplay
├── docs/                        # ADR/contratos cuando aporten valor
└── .github/workflows/           # PR, nightly, release
```

Un juego pequeño puede agrupar `scenes/player/` y `scripts/player/`. Para uno grande preferir `features/player/{scenes,scripts,resources,tests}` si mejora ownership. Cada asset tiene origen y licencia; no se incluyen archivos `.godot/` ni secretos en Git.

## Consideraciones Senior/Staff

**Rutas de decisión:** plataforma 2D → [plataformas y salto](2d/platformer-controls-and-combat.md), RPG 3D → [personaje/cámara](3d/character-camera-and-physics.md), cualquiera → [audio](audio/music-sfx-and-mixing.md), [testing](testing/quality-gates.md) y [CI](delivery/ci-cd-export-and-release.md).

## Verificación obligatoria

- [ ] Crear un proyecto 2D y otro 3D mínimo, importar assets con motor fijado y abrir la escena inicial.
- [ ] Probar teclado/controlador, audio, pausa, resolución y guardado sin backend.
- [ ] Demostrar el routing «quiero un videojuego» sin repositorio: recomendar y preguntar plataforma/género antes de construir.

## Casos adversarios y revisión

- Un `autoload` global para todo estado del juego crea acoplamiento invisible.
- Una escena con nodos vacíos no prueba un juego jugable.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** comparar alternativas, justificar límites, usar la versión instalada, ejecutar pruebas con evidencia y revisar consumidores.
- ❌ **Incorrecto:** declarar funcional una animación, un audio, un test gráfico o un backend solo porque la escena o el archivo existe.

## Fuentes oficiales y normas compartidas

- [Godot — index](https://docs.godotengine.org/en/stable/getting_started/introduction/index.html)
- [Godot — scene organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html)
- [DDD pragmático](../../foundations/architecture/ddd.md) — aplicado solo donde existan invariantes reales.
- [Comentarios útiles](../../standards/engineering/code-comments-and-docstrings.md).
- [Gates E2E](../../standards/testing/e2e-quality-gates.md).
- [Impacto y revisión](../../standards/engineering/change-impact-and-review-gates.md).

## UX/UI propia de videojuegos (nuevas normas transversales)

- [Temas, variantes y controles reutilizables](ui/design-system-themes-and-reusable-controls.md).
- [Diseño HUD y accesibilidad por género](ui/game-ux-accessibility-and-art-direction.md).
- [Matriz QA de controles, audio y HUD](testing/uxui-accessibility-playtest-matrix.md).
- [Norma transversal UX/UI](../../standards/experience/README.md): exige identidad contextual, no la misma plantilla para RPG/FPS/fintech.
- [Proceso de diseño de producto](../../playbooks/uxui-product-design-auto-senior.md).

**Límite de evidencia:** una escena o archivo WAV no prueba ejecución, jugabilidad, mezcla auditable ni rendimiento. Requiere motor y hardware reales para afirmar E2E.

- [Ejemplo 3D mínimo para Godot](../../examples/godot-3d-movement-golden-path/README.md) — código fuente, pruebas básicas pendientes de ejecución con motor.

## Ejemplos con criterios de aceptación

- [Escenarios y pruebas Godot 2D/3D](golden-paths/production-scenarios-and-evidence.md)


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Usar una escena global Player para todos los géneros
- **❌ Incorrecto**: Usar una escena global Player para todos los géneros.
- **✅ Correcto**: Componer escenas pequeñas que representan la feature del género.

### 02. Guardar assets importados generados como única fuente
- **❌ Incorrecto**: Guardar assets importados generados como única fuente.
- **✅ Correcto**: Versionar fuentes originales y configurar importación reproducible.

### 03. Obligar multiplayer a un platformer local
- **❌ Incorrecto**: Obligar multiplayer a un platformer local.
- **✅ Correcto**: Agregar backend y networking solo por requisito real.

### 04. Calificar juego completo porque arranca ventana vacía
- **❌ Incorrecto**: Calificar juego completo porque arranca ventana vacía.
- **✅ Correcto**: Vertical slice jugable: menú -> acción -> feedback -> resultado.

### 05. Medir performance con FPS del editor únicamente
- **❌ Incorrecto**: Medir performance con FPS del editor únicamente.
- **✅ Correcto**: Benchmark exportación por plataforma y escena representativa.

### Política de pruebas y optimización

**Gate del stack:** abrir/importar `project.godot` con el Godot fijado, ejecutar tests de escenas/casos negativos y exportar cuando corresponda; audio, control y gameplay requieren también QA en dispositivos.

**Optimización:** perfilar FPS/ms-frame y CPU/GPU en build exportada según género/plataforma; usar pooling/LOD solo tras medir y proteger accesibilidad del HUD.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

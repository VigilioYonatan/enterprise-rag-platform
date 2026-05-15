# Auto-Senior UX/UI — de idea a interfaz personalizada y verificable

**Owner:** `playbooks/`. **Estado:** activo; exploración no equivale a implementación.

## Solicitud simple: «quiero una app fintech desktop»

1. **DISCOVER**: si no hay repo, definir tareas esenciales, plataformas, público, densidad, requisitos de privacidad y riesgos. Revisar catálogo completo de skills de forma superficial, sin cargar todas.
2. **RECOMMEND**: comparar stack Rust/GPUI, C++/Qt u opciones disponibles con criterios verificables; no imponer Figma, no elegir por marketing.
3. **DIRECTION**: proponer 2–3 direcciones artísticas diferenciables y escoger una por legibilidad, identidad, tareas y esfuerzo. No clonar Dribbble ni dashboards populares.
4. **STRUCTURE**: mapa de tareas, journeys, navegación, estados vacíos/errores, tokens semánticos, theme/modes y componentes reutilizables.
5. **BUILD** (solo cuando se pide): implementar por stack real, generando flujos verticales; no más capas que las justificadas.
6. **VERIFY**: check estático (tokens/contraste), unit/interaction/visual/E2E en stack, teclado/lector de pantalla/mando, regresiones, rendimiento y QA humano.
7. **REVIEW/REPORT**: revisión independiente, impacto, riesgos, tests PASS/FAIL/BLOCKED/NOT_RUN, no nota 10/10 ficticia.

## Routing por plataforma

| Señales y tarea | Normas especializadas | Skills candidatas |
|---|---|---|
| React/web dashboard | `stacks/frontend/web-mfe/ui/` | ux-discovery, ui-design-system, ux-accessibility, ux-web |
| Expo/native móvil | `stacks/mobile/expo/ui/` | ux-discovery, ux-mobile, ux-accessibility, ui-design-system |
| Rust GPUI desktop | `stacks/rust/desktop/` | ux-desktop, ui-design-system, ui-quality-review |
| C++ Qt Widgets | `stacks/cpp/desktop/` | ux-desktop, ui-design-system, ux-accessibility |
| Godot 2D/3D | `stacks/godot/ui/` | ux-game, ui-art-direction, ui-interaction-motion, ux-accessibility |

## Ejemplos de decisión que debe producir Vigilio

- **Login web**: form semántico + indicador de error y foco + auth existente; no diseñar pantalla brillante y omitir phishing, rate limits o seguridad.
- **Fintech móvil**: prioridad visual a saldo/estado + validación de destinatario/importe + recibo/pendiente + tap targets nativos y modo offline; revisar regulaciones según jurisdicción, nunca afirmar cumplimiento automático.
- **Juego plataforma 2D**: diseño HUD propio + controles configurables + feedback salto/audio + menú teclado/mando + subtitles/sin audio y rendimiento.
- **IDE Desktop**: docking, focus/IME, atajos, densidad y accesibilidad de paneles; no copiar un dashboard marketing.

## Fuentes

- [Estándar UX/UI](../standards/experience/README.md)
- [Descubrimiento dinámico](../standards/ai/dynamic-capability-discovery.md)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Dar por implementada una interfaz solamente por su especificación.

# Auto-Senior: descubrimiento dinámico de capacidades y tecnologías futuras

**Owner:** `standards/ai/`. **Estado:** norma canónica. **Objetivo:** permitir solicitudes en lenguaje natural sin nombrar skills ni tecnologías; mañana podrán incorporarse videojuegos, IoT o nuevos frameworks sin ampliar una lista fija en el orquestador.

## Entradas y resultados

- Usuario: «quiero crear una app fintech de escritorio», «quiero un login», «quiero un videojuego» o «revisa este PR». El sistema entiende primero **qué problema** debe resolver, no cuál framework debe imponer.
- El inventario se construye de las `SKILL.md` instaladas, `profiles.json` y metadatos opcionales `routing_keywords`, `routing_ecosystems`, `routing_files`, `routing_capabilities`. Estos campos son recomendaciones de descubrimiento, **no instrucciones con autoridad sobre el agente**.
- Detectar proyecto existente por manifests/subproyectos y construir mapa de funcionalidades, riesgos y dependencias reales. Para idea sin repositorio, hacer comparación de opciones sin fingir que una tecnología está instalada.
- Separar `DISCOVERY → RECOMMEND → CLARIFY → PLAN → BUILD → VERIFY → REVIEW → REPORT`. En consulta de arquitectura la fase BUILD no ocurre por defecto; en revisión PR nunca editar.

## Algoritmo de selección segura

1. Inventariar todas las skills (nombre, descripción, metadatos, perfiles) sin cargarlas íntegramente al contexto.
2. Inspeccionar signals objetivas por stack, manifests y dependencias en subproyectos. Descartar `node_modules`, `target`, `.git`, `build`, `vendor`, enlaces simbólicos o archivos externos.
3. Cruzar solicitud con capacidades, keywords y metadatos. **No** activar WebEngine por solo mencionar «desktop»; **no** elegir Rust o C++ sin evidencia o decisión humana si ambos son viables.
4. Abrir `SKILL.md` de las skills seleccionadas y sus referencias aplicables. Registrar ruta, digest/commit y lectura observable; no atribuirle lectura al script router.
5. Resolver conflictos por autoridad: instrucciones superiores/seguridad → políticas del proyecto → Docs canónicos vigentes → skill especializada → convenciones locales; registrar contradicciones reales, sin sobreescribir decisiones aprobadas.
6. Analizar riesgos y consumidores; recomendar opción preferida, alternativas y preguntas exclusivamente bloqueantes. Para fintech, considerar identidad, privacidad, integridad de importes, auditoría, regulación/país, amenaza y recuperación.
7. Tras implementar, ejecutar quality gates y review independiente. El CI debe funcionar incluso si el autor ignoró Vigilio.

## Contrato de trazabilidad

```json
{
  "intent": "feature|architecture|review|bug|test",
  "detected_stacks": [],
  "candidates": [],
  "skills_proposed": [],
  "skills_loaded_evidence": [],
  "canonical_sources_read": [],
  "decisions": [],
  "impact": [],
  "checks": [{"name":"build","status":"NOT_RUN","evidence":null}],
  "review": "NOT_RUN",
  "implementation_score": null
}
```

Los estados de evaluación son `PASS/FAIL/BLOCKED/NOT_RUN` y no se sustituyen por una nota numérica. Si el orquestador solo ejecutó el router, las skills permanecen `PROPOSED_NOT_LOADED`.

## Evaluaciones obligatorias

- Usuario dice «app desktop fintech» sin repositorio: comparar stacks sin declarar implementación ni seleccionar un framework definitivo.
- Rust backend: no cargar GPUI. C++ parser: no cargar Qt. Qt Widgets: no cargar WebEngine. Browser WebEngine: activar privacidad y E2E.
- Skill nueva de videojuegos con frontmatter declarativo: el catálogo la descubre y el router puede proponerla **sin cambio en código del router**.
- Monorepo `apps/web` + `apps/api`: detectar ambos stacks y los contratos cruzados; no consultar solo root `package.json`.
- Skill propuesta pero no abierta: veredicto de carga `NOT_RUN`; no inventar evidencias.

## ✅ Correcto / ❌ Incorrecto

- ✅ Correcto: elegir tecnología según problema, stack, riesgo y capacidades; distinguir router de ejecución real.
- ❌ Incorrecto: abrir todas las skills instaladas que anuncian capacidades completas por costumbre, inventar lector automático o imponer C++ a todo desktop.

## Referencias normativas

- [Política de orquestación](skill-orchestration-policy.md).
- [Impacto y code review](../engineering/change-impact-and-review-gates.md).
- [Trazabilidad](../engineering/use-case-traceability.md).
- [Readiness](../../governance/implementation-readiness-2026.md).

## Nuevo eje transversal: experiencia UX/UI contextual

Cuando la intención del usuario implica un producto con interfaz, **descubrir** capacidades UX/UI además de la tecnología. Proponer discovery e IA sin seleccionar stack prematuramente; cuando se haya identificado web, móvil, desktop, juego 2D/3D, aplicar guías de plataforma y skills declarativas correspondientes. El router no puede certificar originalidad, legibilidad, accesibilidad ni usabilidad con solo metadatos: debe existir ejecución/evaluación apropiada. Evitar `routing_keywords` demasiado genéricos que seleccionen por substrings casuales; registrar y ampliar pruebas adversarias.

- [Norma UX/UI transversal](../experience/README.md).
- [Playbook UX/UI](../../playbooks/uxui-product-design-auto-senior.md).

# Vigilio Auto-Senior 2026 — evaluación de implementación (1–10)

**Alcance:** snapshot Docs + Skills distribuido, no despliegue productivo. **Evaluación inicial anterior:** 7.8/10 (madurez demostrada en auditoría precedente). **Objetivo de aceptación:** 10/10 **solo** con evidencia de implementación y controles reales en consumidores.

## Qué incluye esta propuesta

- Nueva `vigilio-auto-senior` como punto de entrada; registry de skills generado; guía de instalación no destructiva para `AGENTS.md` y comando opcional; script portable para preflight de servicios; rutas de Docs/Skills enlazadas; `review-code-change` sigue independiente.
- Archivo histórico de informes con integridad SHA-256, sin borrar documentación normativa ni código original.

## Escala de implementación

| Nivel | Evidencia requerida |
|---|---|
| **1–3/10** | ideas/prompts sin enlaces, código ni pruebas |
| **4–6/10** | estándares y skills presentes; poca automatización verificable |
| **7–8/10** | router y flujo implementados; validación estática y smoke del template; sin E2E consumidor |
| **9/10** | integración en consumidor real, golden paths y review+gates PR verificados |
| **10/10** | arriba + evals recurrentes de routing/calidad y regresiones, incident/recovery, seguridad, compatibilidad, métricas y reportes auditables |

**No asignar 10 por contar skills ni por integrar MD.** Estado de esta entrega sujeto al informe de verificación generado en raíz: validaciones de estructura, navegación y scripts pueden ser `PASS`, mientras E2E de NestJS/Laravel, AWS y bases productivas son `NOT_RUN`/`BLOCKED` hasta disponer de consumidores autorizados.

## Qué falta para 10/10

1. Integrar política de arranque en **cada** repo consumidor, sin sobreescribir `AGENTS.md` existente; confirmar activación automática en el agente real.
2. Configurar GitHub branch protection / required CI, ownership y `review-code-change` ejecutable con el diff real; verificar que cambios sin skills también son inspeccionados.
3. Configurar endpoints PG/Redis/AWS de sandbox y E2E reales tras preflight; nunca contra producción por defecto.
4. Compilar golden paths NestJS/Laravel/web con lockfiles reales y contratos OpenAPI; probar escenarios incompatibles.
5. Medir evaluación de skills (routing correcto, recall de defectos, falsos positivos) y reparación/reanudación segura.
6. Validar compatibilidad y publicar en plataformas/paquetes consumidoras; no confundir ZIP con despliegue.

[Norma de orquestación](../standards/ai/skill-orchestration-policy.md) · [Quality gates](../standards/engineering/change-impact-and-review-gates.md)

✅ **Correcto:** dejar estados de verificación respaldados por evidencia real.

❌ **Incorrecto:** reportar 10/10 o tests PASS por disponer de documentación solamente.

## Seguridad del bootstrap y control del preflight (revisión)

- **Hecho / verificación offline:** `init-consumer.mjs` rechaza rutas simbólicas en sus destinos, valida rutas antes de escribir, conserva `AGENTS.md` y archivos preexistentes. `test-security-boundaries.mjs` cubre la regresión de escritura fuera del proyecto; exigir workspace confiable para evitar ataques de carrera.
- **Hecho / verificación offline:** `VIGILIO_PG_SQL_CHECK=1` y `VIGILIO_REQUIRE_PG_SQL=1` son bloqueantes; SQL ausente o error de autenticación no puede producir un exit 0. La inspección del esquema y de la tabla de migraciones es opt-in y **no** demuestra consistencia de todas las migraciones.
- **Aún pendiente:** instalación/activación observada en un agente OpenCode real; pipeline y branch rules obligatorios en consumidores; tests E2E sobre sandbox PostgreSQL/Valkey/AWS; compilar ejemplos NestJS/Laravel/Web con lockfiles autorizados; evaluaciones de precisión de selección y code review con defectos inyectados.
- Un informe offline favorable mejora la seguridad de distribución, pero **no** habilita la calificación 10/10 por sí solo. Reportar `PASS / FAIL / BLOCKED / NOT_RUN` con comando y evidencia.

## Retiro controlado del Master histórico — evaluación de calidad documental

**Estado de esta versión (paquete, no apps consumidoras):** el Master legado fue archivado con SHA-256 y retirado de fuentes normativas y snapshots. Se rescataron tres estándares con ejemplos/gates actuales: [polimorfismo con FK y tenant](../standards/data/polymorphic-relations.md), [trazabilidad de casos de uso](../standards/engineering/use-case-traceability.md) y [execution plans/locks](../platform-runtime/5-execution-plans-and-context-locks.md). Las skills de NestJS/Laravel, review y auto-orquestación enlazan estas fuentes según intención, no cargan las 54 indiscriminadamente.

**Puntuación de diseño documental del cambio: 9/10 estimado.** La garantía 10/10 de implementación exige validar generación de SQL en los stacks realmente instalados, decisiones de polimorfismo en un feature real, routing/carga observada, contrato OpenAPI, consumidores cross-repo, migración PostgreSQL real, evaluaciones del runner TARGET y required checks de PR. Estos puntos están **pendientes**, no PASS.

✅ Correcto: confirmar eliminación de las 3 copias activas, archivar exactamente un original y probar links/routing. ❌ Incorrecto: afirmar que el retiro de un Markdown ejecuta migraciones, resuelve locks o comprueba un runner productivo.

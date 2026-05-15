# Playbook — nueva feature mediante Vigilio Auto-Senior

**Propietario:** `playbooks/`. **Estado:** proceso propuesto para consumidor configurado. No ejecuta cambios por la sola presencia de este archivo.

1. **Discover:** inspeccionar Git, archivos fuente, tests, servicios, versiones, estándares locales y inventario de skills (sin asumir stack).
2. **Understand/Impact:** identificar dueño del módulo, contratos, dependencias e invariantes; comprobar riesgos de ruptura.
3. **Clarify:** recomendar solución y preguntar únicamente decisiones que bloquean arquitectura o requisitos.
4. **Route:** cargar completamente las skills pertinentes y sus fuentes canónicas; registrar las referencias leídas.
5. **Plan:** alcance mínimo, rutas, modificaciones, pruebas y rollback. OpenSpec para cambios de alcance real.
6. **Build:** implementar respetando fuentes y convenios; no tocar archivos fuera del alcance sin necesidad comprobada.
7. **Preflight:** comprobar servicios con `scripts/vigilio-services-check.sh` del consumidor (sin mutar estado).
8. **Verify:** ejecutar pruebas unitarias, integración, E2E y contratos realmente disponibles. Registrar bloqueos.
9. **Review:** aplicar `review-code-change` en modo lectura, corregir aparte y volver a revisar.
10. **Report:** resumen, dependencias, impacto, skills y fuentes leídas, checks `PASS/FAIL/BLOCKED/NOT_RUN`, calificación del plan o código con alcance explícito.

Si el usuario solo pregunta, parar antes de BUILD. Si falta un servicio imprescindible no dar por terminada la implementación; registrar `BLOCKED` y cómo habilitarlo. Si un repositorio consumidor no tiene instrucciones de arranque del agente, invocación manual sigue disponible y la activación automática no puede garantizarse.

[Orquestación canónica](../standards/ai/skill-orchestration-policy.md) · [Impacto](../standards/engineering/change-impact-and-review-gates.md) · [Preflight E2E](../standards/testing/environment-preflight-and-e2e.md)

✅ **Correcto:** dejar estados de verificación respaldados por evidencia real.

❌ **Incorrecto:** reportar 10/10 o tests PASS por disponer de documentación solamente.

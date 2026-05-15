# Política de cobertura documental — Complete Work

**Alcance:** cualquier solicitud y cualquier artefacto. La skill `complete-work-no-shortcuts` se aplica transversalmente en los perfiles de Vigilio; este Markdown solo documenta cómo auditar Docs sin duplicar los estándares por stack.

## Contrato de revisión por archivo

1. Inventariar archivos fuente, rutas publicadas y recursos instalados con hashes antes de editar.
2. Clasificar cada `.md` como norma canónica, implementación de stack, índice, referencia técnica, ADR histórico o artefacto generado.
3. Leer su objetivo y secciones: no juzgar completitud por número bruto de líneas.
4. Para normas, comprobar decisiones, límites, riesgos, casos negativos, pruebas y operación cuando apliquen.
5. Para implementaciones, comprobar contratos, dependencias, ejemplo adaptable, recuperación y test específico del framework.
6. Para índices, exigir navegación correcta; **no** añadir listas gigantes solo para inflar longitud.
7. Para referencias y ADR históricos, conservar texto y decisiones sin reescribir por tendencias nuevas.
8. Registrar gaps reales en una matriz y agregar conocimiento en su dueño único; enlazarlo desde otras guías.
9. Centralizar versiones en `technology/versions.md`; no fijar parches en otras guías.
10. Separar implementaciones NestJS, Laravel, frontend web y Expo, sin ejemplos de lenguajes distintos mezclados.
11. Comprobar 401/403, ACL/tenant, invariantes, idempotencia, caché y contratos si el documento trata esos riesgos.
12. Validar todos los enlaces locales, navegación del sitio y snapshot npm con SHA-256.
13. Ejecutar pruebas/CI reales cuando sean accesibles y distinguir `PASS`, `FAIL`, `NOT_RUN` y `BLOCKED`.
14. Exigir origen→destino y comparaciones byte a byte cuando se migre documentación, no confiar en resumen de líneas.
15. Documentar brechas que requieren servicios externos en vez de inventar resultados.
16. Revisar cobertura de datos y permisos por documento, no solo los casos felices.
17. Separar recomendaciones del ejemplo ilustrativo; no confundir snippets con binarios probados.
18. Entregar informe con estadísticas reales y límites de certificación reproducibles.

✅ **Correcto:** ampliar un capítulo que solo enumera tres controles E2E mediante un estándar de 56 prácticas, casos relevantes por stack y evidencia ejecutable.

❌ **Incorrecto:** duplicar las mismas 56 prácticas en cuatro stacks; modificar un ADR histórico para uniformar tono; marcar PASS por inspección de Markdown.

**Regla:** resumir redundancias sin recortar conocimiento esencial; no crear completitud artificial mediante boilerplate.

# Playbook: migración documental NestJS → arquitectura multistack

## Alcance

Este playbook convierte `stacks/backend/nestjs/` en ruta **canónica** de implementación y desplaza responsabilidades transversales a `foundations/`, `standards/`, `technology/` y `platform/`. No borra `stacks/backend/nestjs/` ni altera ADR/historial; los documentos originales siguen accesibles como fuente histórica y material detallado.

## Procedimiento de cambios

1. Inventario byte a byte de documentos y rutas anteriores; generar crosswalk con propietario canónico.
2. Extraer regla compartida sin copiarla a cada framework; referenciar estándares comunes.
3. Preservar código enriquecido del capítulo original y crear guía canónica con ejemplos ejecutables/adaptables.
4. Alinear índices, links de skills, `assets/docs` snapshot SHA y rutas instaladas `.vigilio-docs`.
5. Validar Markdown, links, sidebar, generación de `_site` y HTML original.
6. Probar instalación npm `sync` + `check` en consumidor aislado y links locales.
7. Verificar que no faltan archivos del ZIP anterior ni de los ZIP originales, registrar cambios y límites de pruebas.

## Reglas y gates

✅ Correcto: mover responsabilidad sin perder ejemplos: los capítulos heredados se mantienen intactos, indexados en [mapa completo](../stacks/backend/nestjs/migration-content-map.md).

❌ Incorrecto: borrar archivo original porque existe un nuevo resumen, copiar 2.400 líneas de versiones en cinco lugares o asegurar que los fragmentos aislados compilan sin tests.

`_site` es derivado y debe regenerarse; `index.html` conserva su contenido. Nuevas guías son `.md` con bloques de código; no se necesitan archivos nuevos `.sql`, `.ts` o `.php` para documentación.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../governance/complete-work-coverage-policy.md).


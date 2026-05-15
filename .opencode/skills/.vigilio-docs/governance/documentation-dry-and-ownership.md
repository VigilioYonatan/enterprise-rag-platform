# Política DRY para Docs y Skills — fuentes únicas y enlaces compatibles

**Propietario:** `vigilio-docs/governance`. Esta guía regula **cómo se escribe y enlaza** documentación; no reemplaza reglas técnicas de NestJS, Laravel, web, Expo, PostgreSQL o AWS.

## Una fuente normativa por responsabilidad

- **DDD, SOLID y nombres** → [convenciones compartidas](../standards/engineering/naming-and-boundaries.md), [DDD](../foundations/architecture/ddd.md), [SOLID](../foundations/architecture/solid.md).
- **DTO HTTP y Zod** → [contratos HTTP](../standards/api/http-dtos-and-contracts.md); `*.dto.ts` incluye contrato Zod y tipo derivado. **No** crear archivo HTTP `*.validator.ts` paralelo.
- **Diseño de endpoints REST/HTTP** → [estándar Senior/Staff](../standards/api/rest-endpoint-design.md); la implementación NestJS/Laravel **enlaza** esta norma, no la duplica.
- **Comentarios, JSDoc/TSDoc, PHPDoc y TODO/FIXME** → [comentarios y docstrings](../standards/engineering/code-comments-and-docstrings.md); [revisión de calidad](../software-factory/code-review-quality.md) aporta criterios de review e históricos IC sin reescribirlos.
- **SQL/bulk/índices** → [optimización SQL](../standards/data/sql-performance.md); la implementación NestJS pertenece a [Drizzle](../stacks/backend/nestjs/persistence/drizzle-postgresql.md) y Laravel a [Eloquent](../stacks/backend/laravel/persistence/bulk-ingest.md).
- **AWS** → [guías AWS](../platform/aws/finops.md), [operaciones Lambda](../platform/aws/lambda-operations.md) y [S3](../platform/aws/s3-uploads.md); no copiar la guía de AWS dentro de archivos PHP o NestJS.
- **NestJS** → [stack NestJS](../stacks/backend/nestjs/README.md); **Laravel/PHP** → [stack Laravel](../stacks/backend/laravel/README.md); **web** → [stack frontend](../stacks/frontend/web-mfe/README.md); **móvil** → [Expo](../stacks/mobile/expo/README.md).
- **Evidencia y cobertura** → [política de Complete Work](complete-work-coverage-policy.md). Registrar `PASS`, `FAIL`, `NOT_RUN` y `BLOCKED` con evidencia real.

## Enlaces Markdown portables

Usar `[Título de la norma](../standards/api/contracts.md)` y comprobar que el destino existe. El enlace debe funcionar en **GitHub, el portal Docs y el snapshot offline**. No utilizar rutas absolutas locales, URLs de archivos locales, enlaces a `main` remoto como única fuente, ni sintaxis de inclusión exclusiva de un renderizador.

En `vigilio-skills/assets/skills/<skill>/SKILL.md` o `references/*.md`, enlazar al snapshot de Docs mediante la ruta relativa hasta **`../.vigilio-docs/<ruta-canónica>.md`** desde el punto correcto. El paquete distribuye `.vigilio-docs` durante `sync`; el verificador `check-doc-references.mjs` confirma los destinos. Las skills dan instrucciones operativas específicas de su tarea; no redefinen el estándar global.

## Etiquetas de ejemplos

Para un ejemplo positivo usar **✅ Correcto**. Para un antipatrón usar **❌ Incorrecto**. No alternar títulos como `Bien`, `Mal`, `Aplicar`, `Evitar` o `Anti-pattern` como rótulos de estos dos ejemplos. Los textos en código, APIs de terceros, nombres históricos y citas no se renombran indiscriminadamente.

✅ **Correcto:** documentar una sola vez una regla de contrato HTTP y agregar desde las guías de React y Expo enlaces relativos al mismo Markdown, dejando en ellas solo el uso propio de plataforma.

❌ **Incorrecto:** pegar el mismo bloque de contrato en cinco skills, copiar un `pgEnum` dentro de una guía de frontend, o marcar `PASS` a partir de un validador de enlaces.

## Ownership y comparación multistack

Un documento de un stack solo contiene implementación y pruebas de ese stack. Una guía comparativa puede explicar diferencias breves en una tabla y enlazar las implementaciones propietarias; **no debe pegar tutoriales completos de NestJS y Laravel juntos**. Los catálogos son índices, no una segunda fuente técnica. Mantener ADR e históricos intactos, identificados como no normativos.

## Auditoría repetible

1. Inventariar todos los `.md` y medir duplicados exactos de secciones y de code fences; los parecidos semánticos requieren revisión humana.
2. Clasificar cada ocurrencia como norma, ejemplo específico, índice, histórico o generado.
3. Migrar cualquier detalle **único** al dueño de su tema antes de sustituir una copia por un enlace.
4. Revisar etiquetas, links, cross-stack e imports de contratos publicados (no asumir exports inexistentes).
5. Reconstruir `_site/` y `assets/docs/`; verificar checksums, skills sincronizadas y preservación contra ZIP original.
6. Reportar por separado cobertura automatizada y revisión manual; no certificar aplicaciones sin compilación/pruebas reales.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Copiar toda la regla de REST en cada Nest/React/Godot SKILL.md
- **❌ Incorrecto**: Copiar toda la regla de REST en cada Nest/React/Godot SKILL.md.
- **✅ Correcto**: Regla canónica REST y enlaces a implementaciones por stack.

### 02. Editar solamente vigilio-docs y olvidar assets/docs
- **❌ Incorrecto**: Editar solamente vigilio-docs y olvidar assets/docs.
- **✅ Correcto**: Regenerar bundle y comparar SHA-256 de fuentes y copias.

### 03. Introducir DRY de código dentro de guía de DRY documental
- **❌ Incorrecto**: Introducir DRY de código dentro de guía de DRY documental.
- **✅ Correcto**: Mantener norma de DRY de código separada y enlazada.

### 04. Dejar links absolutos de entorno local
- **❌ Incorrecto**: Dejar links absolutos como /workspace/docs/regla.md o rutas ligadas a un usuario particular.
- **✅ Correcto**: Enlaces Markdown relativos comprobables offline.

### 05. Actualizar 86 a 100 skills y conservar conteos hardcoded de 86
- **❌ Incorrecto**: Actualizar 86 a 100 skills y conservar conteos hardcoded de 86.
- **✅ Correcto**: Mostrar catálogo generado dinámico, no cifras en normativa.

### Política de pruebas y optimización

**Gate de arquitectura:** casos de uso con aceptación/rechazo, pruebas de contrato y de regresión, revisión de dependencias y evidencia de cambios observables.

**Optimización:** medir coste real y complejidad de cambio; elegir primero el diseño más sencillo que conserva invariantes y extensibilidad comprobable.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

### 06. Excepción de plataforma sin duplicar la norma general
- **❌ Incorrecto**: Copiar WCAG íntegro en `stacks/godot/`, `stacks/mobile/` y `stacks/frontend/` y modificarlo de manera divergente cada vez que cambia un requisito.
- **✅ Correcto**: Mantener requisitos de accesibilidad en su fuente transversal y enlazar desde Godot, Expo y web; registrar únicamente entrada, foco, lector de pantalla y pruebas particulares de cada plataforma en su propia guía.

**Verificación de esta decisión:** modificar una regla transversal y comprobar que sus consumidores continúan apuntando al mismo documento; ejecutar enlaces y pruebas particulares de los tres stacks sin reescribir la regla compartida.

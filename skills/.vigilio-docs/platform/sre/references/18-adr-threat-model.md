# ADR y Threat Modeling - `bus-impl` 2026

Este documento gobierna decisiones tecnicas y riesgos de seguridad.

Los nombres de ADRs y modulos mostrados son ejemplos. Cada proyecto registra solamente decisiones y
flujos que realmente existen.

Regla madre:

- decision importante sin ADR se vuelve folklore
- flujo critico sin threat model se vuelve punto ciego

---

## 1. ADRs

Ubicacion recomendada dentro del proyecto cuando exista una decision:

```text
docs/adr/
|-- 0001-use-node-24.md
|-- 0002-use-zod-over-joi.md
|-- 0003-use-drizzle-postgresql.md
|-- 0004-use-pino-logging.md
`-- 0005-use-http-api-vs-rest-api.md
```

El template reusable vive en `vigilio-docs/adr/0000-template.md`. No crear `docs/adr/` vacio solo
para anticipar decisiones.

Formato:

```markdown
# ADR 0001 - Usar Node 24

## Estado
Aceptado

## Contexto
...

## Decision
...

## Consecuencias
...

## Alternativas consideradas
...
```

Regla:

- todo cambio de stack base requiere ADR

---

## 2. Threat model

Ubicacion recomendada dentro del proyecto cuando exista un flujo modelado:

```text
docs/threat-model/
|-- product-create.example.md
|-- auth-login.md
|-- upload-document.md
`-- worker-procesar-movimiento.md
```

El template reusable vive en `vigilio-docs/threat-model/template.md`. No duplicar el catalogo
central dentro de cada proyecto.

Analizar:

- spoofing
- tampering
- repudiation
- information disclosure
- denial of service
- elevation of privilege

---

## 3. Flujos obligatorios

Threat model obligatorio para:

- login
- una operacion de negocio critica, por ejemplo la creacion de un product
- carga/descarga de documentos
- exportaciones
- workers que cambian estado
- integraciones externas
- endpoints publicos

---

## 4. Excepciones de seguridad

Toda excepcion debe tener:

- riesgo
- razon
- owner
- fecha de expiracion
- compensating control

Regla:

- excepcion sin fecha de expiracion es deuda permanente

---

## 5. Evidencia

Cada PR sensible debe enlazar:

- ADR si cambia decision
- threat model si cambia flujo critico
- evidencia de tests
- evidencia de security scans

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** AuthN + AuthZ de recurso/tenant; allowlist de salida, secretos fuera de logs y pruebas de acceso cruzado.
- ❌ **Incorrecto:** Permitir rutas públicas por comodidad, confiar sólo en `auth` o construir salida con `$request->all()`.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.

# Operaciones Swagger / Scalar — formato conciso Vigilio 2026

**Owner:** `standards/api/`. **Estado:** convención propuesta de documentación visual, compatible con la norma REST y contratos reales.

## Metadatos de cada operación

- `operationId`: `camelCase`, semántico, estable y único (`registerRrllEndorsement`, no `store`).
- `summary`: una línea breve con acción y recurso, sin repetir `operationId` literalmente.
- `description`: **máximo dos líneas funcionales** con lista Markdown, sin líneas vacías: 📦 Proceso y 🔧 Funcionalidad. No inventar comportamientos ni prometer permisos inexistentes.
- `@ApiBody`, DTO Zod → adaptador OpenAPI, parámetros y respuestas tipadas documentan el contrato estructurado; no describir todo dentro de `description`.
- `@ApiBearerAuth()` o `@ApiSecurity()` declara esquema; **no protege** el endpoint, que requiere guards/gateway/policy reales.
- `@ApiBadRequestResponse` y otros errores pueden encapsularse en decoradores compartidos con schema común, pero incluir solo códigos posibles. Los errores de dominio específicos conservan sus status y schema.
- Un `*.doc.ts` con `createZodDto` es un adaptador opcional cuando la integración lo necesita, no un contrato duplicado.
- SigV4 solo si el gateway lo exige; `sigv4` **no es** equivalente a JWT. No eliminar YAML existente si es la fuente de verdad o contrato publicado por otro servicio.

✅ Correcto

```ts
@ApiOperation({
  operationId: 'registerRrllEndorsement',
  summary: 'Registrar endoso RRLL',
  description: `- 📦 **Proceso:** Gestión de endosos RRLL.
- 🔧 **Funcionalidad:** Registra el endoso asociado a una póliza.`,
})
@ApiCreatedResponse({ type: RegisterRrllEndorsementResponseDocDto })
@ApiConflictError() // Solo si el dominio puede devolver 409.
```

❌ Incorrecto

```ts
@ApiOperation({ operationId: 'store', summary: 'Store', description: 'Crea. Crea de nuevo.' })
```

El formateo es una preferencia editorial común; las reglas de compatibilidad OpenAPI y HTTP prevalecen ante contratos heredados. No exigir emojis en rutas internas excluidas de publicación si el proyecto no los adopta.

[Norma de arquitectura de endpoints](rest-endpoint-design.md) · [Contratos Zod](http-dtos-and-contracts.md) · [Comentarios en código](../engineering/code-comments-and-docstrings.md)

# NestJS: errores de dominio y respuestas HTTP

Las reglas del dominio lanzan errores expresivos independientes del framework (`OrderAlreadyShippedError`, `ProductNotFoundError`). La frontera HTTP traduce a estado/API code e incorpora identificador de correlación, sin divulgar detalles de base de datos.

```typescript
// Boceto: filtro/adaptador HTTP, no importado por domain/
if (error instanceof OrderAlreadyShippedError) {
  throw new ConflictException({ code: 'ORDER_ALREADY_SHIPPED' });
}
```

- Errores no esperados → 500 genérico, log interno seguro y traceId.
- Auth no verificada → 401; denegada → 403; recurso inexistente o oculto por política → 404 según threat model.
- Validación → 400/422 según contrato vigente, nunca cambiar silenciosamente.
- Estandarizar formato entre NestJS, Laravel y frontend mediante OpenAPI.

✅ Correcto: traducir dominio una sola vez y testear cada status/error code.

❌ Incorrecto: `catch {return {success:false}}` con HTTP 200 o devolver `error.message` de la base de datos al cliente.

[Reglas comunes](../../../../standards/api/http-errors-and-pagination.md).

## Procedencia documental preservada

- [Capítulo heredado: 23-seguridad-hardening.md](../security/references/23-seguridad-hardening.md) — contenido íntegro conservado.
- [Capítulo heredado: 6-ejemplos-codigo.md](references/6-ejemplos-codigo.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).


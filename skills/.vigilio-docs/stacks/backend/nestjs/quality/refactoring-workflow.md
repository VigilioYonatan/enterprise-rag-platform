# Refactorización NestJS — flujo de trabajo comprobable

## Antes de cambiar código

Caracterizar contratos HTTP reales, schemas Zod, hooks/consumidores, tests, migraciones, alcance tenant, cache keys y tráfico. Comparar baseline de producción con la documentación canónica antes de aplicar reglas nuevas retroactivamente.

## Patrones de iteración

```typescript
// ✅ map transforma sin efectos
const product_ids = products.map(product => product.id);
// ✅ for...of secuencial para operaciones que deben esperar resultados
for (const product of products) await updateProduct(product);
// ❌ forEach(async ...) no espera a las promesas que crea
products.forEach(async product => { await updateProduct(product); });
```

Un `for(let i=...` **no es automáticamente malo**: conservarlo cuando el algoritmo depende de índices y es más legible; no usar `Promise.all` sin límite cuando un proveedor o BD tiene capacidad restringida.

## Refactor por fase

1. Añadir tests de caracterización y contrato, comprobar rutas y status.
2. Extraer schemas `.pick()` sin cambiar wire format; mover lógica de controller a casos de uso.
3. Agregar ports reales solo cuando reduzcan acoplamiento o permitan pruebas.
4. Eliminar N+1, filtrar SQL, separar cache, preservar comportamiento de reintentos.
5. Revisar logs por filtrado de PII, permisos y caché cross-tenant.
6. Migrar consumidores por pasos, con mediciones y rollback.

✅ Correcto: comparar OpenAPI previo/post y perf/errores con tests en CI.

❌ Incorrecto: reescritura masiva de 50 módulos sin protección de regresiones, renombrar todos los métodos CRUD a nombres aleatorios.

[Norma transversal](../../../../standards/engineering/refactoring-existing-code.md).

## Procedencia documental preservada

- [Capítulo heredado: 20-reglas-senior-codigo.md](references/20-reglas-senior-codigo.md) — contenido íntegro conservado.
- [Capítulo heredado: 36-deuda-tecnica.md](references/36-deuda-tecnica.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).


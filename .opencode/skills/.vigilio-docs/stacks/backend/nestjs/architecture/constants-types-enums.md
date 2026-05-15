# NestJS: constants, types, enums y value objects

Separar declaraciones **por dueño**, no por moda. Cada entidad/feature debe exportar únicamente los tipos y valores compartidos que usa otro archivo. `types/` contiene tipos de dominio significativos; `dtos/` contiene tipos inferidos de schemas; configuraciones de Redis y AWS no son constantes del dominio.

```typescript
// domain/enums/product-status.enum.ts — reutilizable también por schema Zod
export const PRODUCT_STATUS = {
  PENDING: 'pendiente', PROCESSED: 'procesado', CANCELLED: 'anulado',
} as const;
// ProductSchema['estado'] se deriva después de `productSchema`, para evitar duplicados.

// domain/constants/product-rules.constant.ts
export const PRODUCT_RULES = { MAX_NAME_LENGTH: 150 } as const;

// `ProductSchema['id']` se deriva del `ProductSchema` propietario, no de un tipo primitivo fijo.
```

```typescript
// domain/schemas/product.schema.ts
import { z } from 'zod';
export const productStatusSchema = z.enum(PRODUCT_STATUS);
export const productSchema = z.object({
  id: z.number().int().positive(),
  nro_poliza: z.string().min(1).max(30),
  estado: productStatusSchema,
});
export type ProductSchema = z.infer<typeof productSchema>;
```

No crear un estado paralelo en `status.ts` y otro enum incompatible en Zod; preferir una única fuente de valores. Tipos inferidos deben vivir junto al schema propietario. Un value object es pertinente si valida invariantes propias (por ejemplo `Money`), no para envolver cada string.

✅ Correcto: constants/enums usados por el dominio y schemas, sin dependencias de HTTP.

❌ Incorrecto: `constants/index.ts` global, `types/index.ts` global o DTO HTTP dentro de `domain/types`.

Prueba: TypeScript estricto y test que compruebe valores/transformaciones del contrato. [Guía común de calidad](../../../../foundations/engineering/code-quality.md).

## Procedencia documental preservada

- [Capítulo heredado: 1-estructura-archivos.md](references/1-estructura-archivos.md) — contenido íntegro conservado.
- [Capítulo heredado: 20-reglas-senior-codigo.md](../quality/references/20-reglas-senior-codigo.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Ownership:** Constantes globales, tipos compartidos y enums de dominio tienen dueños únicos.
2. **Tipos:** Evitar tipos duplicados donde Zod o un modelo de dominio canónico puede derivarlos.
3. **Invariantes:** Estados de negocio y transiciones validadas en dominio, no en strings de controller.
4. **Semántica:** Nombrar valores según contrato y no mezclar estado de persistencia con DTO público.
5. **Cambio:** Comprobar serialización y migración al añadir variante de enum.
6. **Test:** Probar estados desconocidos, compatibilidad y mapeos explícitos.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

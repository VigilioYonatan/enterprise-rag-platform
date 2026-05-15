# Calidad y Comentarios para Revision de Codigo

**Jerarquía documental vigente (2026-10-25):** esta guía conserva los criterios originales de code review y los ejemplos IC. La fuente normativa **detallada** para comentarios, JSDoc, PHPDoc, TODO/FIXME y su validación es [Comentarios de código y docstrings](../standards/engineering/code-comments-and-docstrings.md); los contratos HTTP públicos se gobiernan por [Diseño REST de endpoints](../standards/api/rest-endpoint-design.md). En caso de detalle contradictorio, usar la guía específica sin modificar por sorpresa el legado.

Esta guia es la fuente canonica transversal para calidad de codigo y comentarios. Aplicar solo los
criterios pertinentes al diff. La configuracion, formatter, linter, contratos y patrones vigentes del
repositorio tienen precedencia sobre preferencias genericas.

## Diseño y legibilidad

- Usar nombres que expresen responsabilidad y contenido; no reutilizar un termino para dos conceptos.
- Mantener una responsabilidad cohesiva y un nivel de abstraccion por funcion. Extraer cuando la
  complejidad o mezcla de I/O y dominio impida verificarla.
- No imponer maximos universales de lineas, columnas o tres parametros. Aplicar formatter y reglas reales.
- No dejar imports, variables, parametros, ramas, codigo inalcanzable o bloques comentados sin uso.
- Para unions discriminadas o enums cerrados, preferir exhaustividad verificable. Un `default` generico
  puede ocultar casos nuevos.

## Configuracion y hardcode

- No incrustar IPs, URLs de ambiente, credenciales, IDs operativos ni valores de DB en logica de negocio.
- Las constantes de dominio estables si pueden vivir en codigo cuando tienen owner, nombre y pruebas.
- No copiar el mismo literal entre contrato, implementacion y tests para fabricar coincidencia.

## Comentarios senior

Agregar comentarios cuando expliquen algo que el codigo no expresa bien:

- por que existe una decision o workaround;
- invariante, precondicion o restriccion no obvia;
- seguridad, concurrencia, idempotencia o compatibilidad;
- riesgo de migracion/recovery o comportamiento de una integracion;
- contrato publico cuando la herramienta genera OpenAPI/TypeDoc desde esa documentacion.

El comentario debe ser breve, actualizado y estar junto a la decision. Referenciar ADR, issue o contrato
cuando agregue contexto durable.

✅ Correcto:```ts
// El proveedor puede reenviar el evento. La clave externa evita duplicar el abono.
// Ver ADR-014 para la ventana de retencion y la estrategia de replay.
await ledger.applyOnce(event.externalId, event.amount);
```

```ts
/**
 * Mantiene el importe como decimal textual para no perder precision entre JSON y la DB.
 * Precondicion: el schema de entrada ya valido el valor.
 */
function toSettlementAmount(value: string): SettlementAmount {
  return SettlementAmount.fromDecimal(value);
}
```

No agregar comentarios que repitan la siguiente linea, codigo muerto, secretos/PII o `TODO` sin motivo
accionable. Git conserva autor e historial; no agregar autor/fecha manual en codigo de aplicacion salvo
que una plantilla corporativa vigente lo exija.

### Perfil corporativo IC

Cuando el checklist IC sea autoridad explicita, conservar su trazabilidad obligatoria:

```ts
/**
 * Nombre usuario: nombre_apellido
 * Cod Proyecto: PROY-0042
 * Fecha: 11/10/2026
 * Detalle: Preserva la idempotencia al reprocesar eventos del proveedor.
 */
await ledger.applyOnce(event.externalId, event.amount);
```

Si la convencion acepta formato corto:

```ts
// nombre_apellido - PROY-0042 - 11/10/2026 - Evita duplicados durante el replay autorizado.
await ledger.applyOnce(event.externalId, event.amount);
```

No inventar usuario, ticket ni fecha. El detalle explica impacto o motivo, no repite la instruccion.

❌ Incorrecto:```ts
// Incrementa el contador.
attempts += 1;

// Juan Perez - 11/10/2026 - se cambio este metodo.
// TODO: arreglar luego.
```

Para APIs, documentar semantica, restricciones, seguridad y errores en OpenAPI; no copiar toda la
especificacion dentro del controller. Para procedimientos y funciones sujetos al checklist IC, usar la
cabecera definida en [Calidad backend de datos y SQL](backend-data-sql.md).

## Excepciones y flujo

- Nunca dejar `catch` vacio ni suprimir silenciosamente un fallo.
- Capturar para recuperar, traducir, compensar, enriquecer con contexto seguro o liberar recursos; evitar
  `try/catch` que solo hace `throw error`.
- Preservar causa y errores tipados; no convertir todos los fallos en un mismo `500`.
- No ejecutar logica despues de `return`/`throw` ni modificar sorpresivamente el contador de un loop.
- Validar inputs en la frontera; TypeScript no valida datos runtime.

## Revision basada en evidencia

- Reportar complejidad, SQL lento, indice faltante o riesgo productivo solo con cadena causal y evidencia.
- No reportar como hallazgo manual un detalle estetico ya gobernado por formatter/linter.
- Consolidar repeticiones con la misma causa raiz.
- Proponer el arreglo minimo compatible con SOLID/DRY y con la logica existente.

## Reglas historicas que no se convierten en dogma

- limites rigidos de 100 lineas, 120 columnas o tres parametros;
- `try/catch` en todos los metodos;
- `default` obligatorio en todo `switch`;
- afirmaciones SQL sin semantica ni plan de ejecucion;
- cabeceras de autor/fecha/ticket en cada fragmento sin autoridad corporativa;
- porcentajes de cobertura o listas fijas de status HTTP sin autoridad del proyecto.

Aplicar la intencion util —legibilidad, trazabilidad, rendimiento y calidad— con evidencia y sin
contradecir el stack.

## Revisión de cambios de consumidores y PR

Consultar [análisis de impacto y quality gates](../standards/engineering/change-impact-and-review-gates.md). Se aplica al diff aunque el autor **no** usara skills; mantener evidencia y no inventar fallos de producción.

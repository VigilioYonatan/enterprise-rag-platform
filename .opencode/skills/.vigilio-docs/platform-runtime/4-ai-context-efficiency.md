# Eficiencia De Contexto Para IA

## Objetivo

Reduce tokens sin reducir evidencia, cobertura o precisión.

## Orden De Descubrimiento

1. Lee instrucciones y alcance.
2. Consulta la arquitectura del grafo.
3. Busca símbolos mediante `search_graph`.
4. Traza impacto mediante `trace_path`.
5. Lee símbolos concretos mediante `get_code_snippet`.
6. Consulta relaciones complejas mediante `query_graph`.
7. Usa búsqueda textual para configuraciones y literales.
8. Abre archivos completos solo cuando resulte necesario.

## Técnicas

- Empieza con resultados compactos.
- Limita rutas y tipos de archivo.
- Pagina resultados truncados.
- Lee diffs antes de archivos completos.
- Ejecuta verificaciones dirigidas antes de suites completas.
- Resume evidencia por archivo y símbolo.
- Conserva errores exactos relevantes.
- Descarta logs repetidos y progreso sin cambios.
- Reutiliza resúmenes comprobados durante la misma tarea.
- Revalida datos cambiantes antes de responder.

## Límites

- No comprimas contratos, errores o decisiones críticas.
- No elimines comentarios normativos.
- No reemplaces código por resúmenes durante una revisión sensible.
- No afirmes cobertura sin revisar resultados truncados.
- No uses memoria desactualizada como evidencia actual.
- No omitas casos negativos para ahorrar tokens.

## Ejemplos

### ✅ Correcto: descubrir primero

```text
get_architecture(path="src/orders")
search_graph(query="publish order event")
trace_path(function_name="publishOrder", direction="both")
get_code_snippet(qualified_name="...")
```

### ❌ Incorrecto: cargar todo

```text
Leer todos los archivos de src/, tests/, docs/ y node_modules/.
```

### ✅ Correcto: limitar logs

```text
Conservar primer error, causa, archivo, línea y resumen final.
```

### ❌ Incorrecto: perder evidencia

```text
Eliminar stack traces, códigos de salida y nombres de tests fallidos.
```

## Respuesta

- Usa frases de máximo quince palabras.
- Expresa una idea por oración.
- Usa verbos directos.
- Mantén un término por concepto.
- Elimina relleno.
- Resume primero el resultado.
- Incluye detalles solamente cuando cambien una decisión.
- Conserva ejemplos necesarios para ejecutar o verificar.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).


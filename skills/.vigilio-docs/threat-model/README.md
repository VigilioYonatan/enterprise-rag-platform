# Modelos de Amenazas (Threat Model)

Un threat model responde a una pregunta concreta: **como se rompe este flujo y que lo impide hoy**.
No es un inventario de buenas practicas; es el analisis de un flujo especifico con sus controles
reales y su riesgo residual aceptado.

## Cuando escribir uno

Escribir un threat model para todo flujo que:

- maneje autenticacion, autorizacion o sesiones;
- mueva dinero, documentos o datos personales;
- exponga un recurso a internet sin autenticacion;
- integre un tercero al que se le delega confianza.

## Metodo

Se usa STRIDE por su simplicidad y porque cubre las seis familias que importan. Para cada categoria:
describir el riesgo **concreto** para ese flujo (no "podria haber spoofing") y el control que lo mitiga
**hoy**, con referencia al codigo. Si no hay control, decirlo: un hueco documentado se arregla, uno
implicito no.

La seccion de riesgo residual es obligatoria y es la mas util. Lo que se acepta debe quedar por escrito
con su condicion de revision.

## Indice

| Threat model | Flujo | Estado |
| --- | --- | --- |
| [Autenticacion y sesiones](001-autenticacion-y-sesiones.md) | login, refresh, logout | Vigente |

Plantilla: [`template.md`](template.md)

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Modelos de Amenazas (Threat Model)

✅ **Correcto:** Para **Modelos de Amenazas (Threat Model)**, identificar activo, amenaza, mitigación, owner y prueba residual.

❌ **Incorrecto:** En **Modelos de Amenazas (Threat Model)**, confundir una lista genérica de amenazas con mitigaciones implementadas.

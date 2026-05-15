# Presupuesto adaptativo de contexto — ahorrar tokens sin perder evidencias

**Owner canónico:** `standards/ai/`; se complementa con [orquestación](skill-orchestration-policy.md), [descubrimiento dinámico](dynamic-capability-discovery.md) y [revisión](../engineering/change-impact-and-review-gates.md).

## Objetivo y límites

Minimizar lecturas **irrelevantes**, no omitir instrucciones requeridas. El presupuesto se asigna a exploración, normas, implementación, pruebas y revisión; es una **heurística**, no límite que permita saltar garantías. No se puede afirmar reducción porcentual de tokens sin instrumentar el proveedor real.

| Fase | Qué leer | Qué no hacer |
|---|---|---|
| 0 Contexto | solicitud, `AGENTS.md`, cambios Git, manifests y árbol superficial | abrir todas las skills del catálogo |
| 1 Discovery | catálogo y metadatos de las skills disponibles; 5–12 candidatos como máximo *inicialmente* | tratar frontmatter como contenido ya leído |
| 2 Clasificación | stack real, propietario de feature, contrato/cambios, seguridad, tests disponibles | inferir plataforma solo por palabra `desktop` |
| 3 Lectura | `SKILL.md` completa de cada skill realmente seleccionada + referencias **aplicables** + norma canónica | resumir/recortar un contrato antes de entenderlo |
| 4 Evidencia | símbolos/archivos del cambio, tests afectados, consumidores y fallos originales | comprimir código de seguridad o errores únicos |
| 5 Cierre | estado PASS/FAIL/BLOCKED/NOT_RUN, riesgos y revisión | llamar PASS a test no ejecutado |

**Regla de prioridad:** un gate de seguridad, contrato público, migración, política de autorización o skill elegida exige lectura íntegra de su contenido relevante. Si no entra en el presupuesto, reducir tareas no críticas o pedir capacidad/herramienta, nunca inventar cumplimiento.

## Algoritmo de lectura adaptativa

1. Inventariar con paths y tamaños sin cargar cuerpos; priorizar nombre + `description` + `routing_*`.
2. Preseleccionar por stack/feature/owner del módulo; separar **proposed** vs **loaded**.
3. Inspeccionar cabeceras/resumen de archivos de código solo para decidir *qué* leer; leer completamente los archivos afectados y SKILL.md seleccionadas.
4. Para código de terceros, citar versión instalada y docs oficiales de esa versión; no sustituir por snippets antiguos.
5. Mantener registro de lecturas `{ruta,sha256,bytes,reason,read_status}` (sin guardar secretos o cuerpos en archivos de log).
6. Reutilizar hash si no cambió el archivo y si el contexto actual realmente conserva su contenido; un hash almacenado **no es equivalente a lectura actual**.
7. Ante conflicto entre dos skills, preferir norma canónica/ownership real; marcar conflicto, no resolverlo silenciosamente.
8. Si la búsqueda es truncada o no cubre todos los manifests, ampliar/paginar y señalar cobertura incompleta.

## Ejemplo — fintech desktop sin repositorio

Consulta catálogo y pregunta SO, regulaciones, conectividad, offline, modelo de datos y usuarios operativos. Proponer Rust/GPUI frente a Qt **con pros/contras**; usar UX discovery, seguridad y architecture, pero **NO** abrir scripts de testing de ambos stacks hasta decidir. No ejecutar build sin repositorio.

## Ejemplo — botón de salto en Godot

Señales: `project.godot`, `scenes/player.tscn`, `scripts/player.gd`, `InputMap`. Leer `godot-build-gameplay`, `godot-animation-audio` si sonido, `ux-game-experience` si UX/input, y las guías de física/audio. No cargar Laravel, C++ WebEngine ni backend sin necesidad. Ejecutar tests de movimiento/física y QA de gamepad **si disponibles**.

## Ejemplo negativo — compresión destruye significado

Un log de auth incluye `status=401` repetidos y un único `status=200` ante credenciales inválidas. Una compresión que colapsa a «401 repetidos» elimina el incidente. Guardar fuente original, reducir solo bloques repetitivos después de identificar excepciones y comprobar cada conclusión en el original.

## Evaluación de la super-skill

Fixtures: 1) proyecto C puro no carga CPP; 2) monorepo con alcance explícito no carga otro stack; 3) idea futura Bevy se descubre; 4) lectura de skill obligatoria no se omite por presupuesto; 5) no se manda hash como contenido leído; 6) secreto en fuente nunca se incluye en trazas; 7) cache invalidada por cambio de SHA; 8) resultados truncados → ampliar. PASS solo para las pruebas ejecutadas.

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Leer SKILL.md seleccionada entera, reducir candidatos y ampliar el alcance si falta contexto.
- ❌ **Incorrecto:** Reducir tokens truncando políticas de autorización o afirmar lectura por ver frontmatter.

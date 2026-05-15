# Agent Stack 2026 - Estado Real de `bus-impl`

Este documento separa capacidades activas de configuracion experimental. No se atribuyen ahorros de
tokens ni calidad sin medicion reproducible.

## 1. Activo

- `AGENTS.md` contiene instrucciones locales del repositorio.
- OpenSpec vive en `openspec/` y sus comandos/skills estan disponibles para planificar cambios.
- `@vigilioyonatan/vigilio-skills` sincroniza perfiles a `.opencode/skills/` y `.agents/skills/`.
- `@toon-format/toon` y `headroom-ai` estan instalados como dependencias.
- `.agent-stack/headroom.rules.json`, `.agent-stack/.ponytailrc` y
  `.agent-stack/plugins/tokenshrink-worker.ts` conservan configuracion experimental.

Las skills sincronizadas son el mecanismo IA operativo y mantenido por plataforma.

## 2. Pausado

`.agent-stack/omo.config.ts` esta completamente comentado y marcado `[PAUSED]`.

Por lo tanto, hoy no se puede afirmar que esten activos automaticamente:

- oh-my-openagent/OmO como orquestador;
- OpenCode Go como provider;
- routing hacia modelos declarados en ese archivo;
- middleware Headroom/TOON/TokenShrink dentro de OmO;
- Ponytail como filtro de salida;
- LCM como memoria SQLite/DAG;
- omo-pulse como dashboard.

Los archivos presentes demuestran preparacion, no ejecucion.

## 3. Estructura

```text
bus-impl/
|-- AGENTS.md
|-- openspec/
|-- .opencode/
|   |-- commands/
|   `-- skills/                  # generado por vigilio-skills
|-- .agents/
|   `-- skills/                  # generado por vigilio-skills
`-- .agent-stack/
    |-- omo.config.ts            # pausado
    |-- headroom.rules.json
    |-- .ponytailrc
    |-- memory/
    `-- plugins/
        `-- tokenshrink-worker.ts
```

## 4. Flujo activo recomendado

```text
Solicitud
  -> leer AGENTS.md
  -> seleccionar skill por descripcion
  -> consultar codigo, tests y policies
  -> usar OpenSpec cuando el cambio requiere propuesta
  -> implementar
  -> ejecutar quality gates
  -> actualizar specs/docs si cambiaron decisiones
```

Sincronizacion:

```bash
pnpm skills:sync
pnpm skills:check
```

## 5. Reglas de las skills

- reutilizar patrones existentes en `src/shared/`;
- DDD proporcional, sin carpetas o abstracciones vacias;
- ESM, TypeScript estricto, Zod, Drizzle y Biome;
- cambios pequenos y verificables;
- tests proporcionales al riesgo;
- IAM minimo, secretos fuera del repo y seguridad privada por defecto;
- conservar el log o archivo original cuando se comprime contexto.

## 6. Activacion futura de OmO

Antes de despausar:

1. verificar compatibilidad y licencia de cada paquete/provider;
2. fijar versiones y registrar la decision en ADR;
3. agregar tests o smoke del pipeline de middleware;
4. medir tokens, latencia, costo y perdida de informacion contra un baseline;
5. definir donde vive la memoria, cifrado, retencion y borrado;
6. evitar que plugins globales contradigan `AGENTS.md` o las skills;
7. documentar fallback cuando el provider u orquestador no este disponible.

No se deben copiar nombres de modelos, precios o promociones desde este documento como contrato:
pertenecen a la configuracion del provider y cambian independientemente del proyecto.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Agent Stack 2026 - Estado Real de `bus-impl`

✅ **Correcto:** Para **Agent Stack 2026 - Estado Real de `bus-impl`**, usar componentes accesibles y tokens reutilizables con pruebas visuales.

❌ **Incorrecto:** En **Agent Stack 2026 - Estado Real de `bus-impl`**, copiar configuraciones de diseño de otra plataforma sin medir sus restricciones.

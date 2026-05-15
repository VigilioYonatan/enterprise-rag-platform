# Gobierno, Skills, OpenSpec Y Releases

## Owners

| Responsabilidad | Owner |
|---|---|
| DTO/schema HTTP | `bus-impl` |
| UI y composición | `web-mfe` |
| Skills, policies y tooling | `vigilio-platform-actions` |
| Documentación arquitectónica | `vigilio-docs` |
| Branch protection/environments | configuración GitHub/AWS |

## Jerarquía de fuentes

1. Código, tests y configuración ejecutable del consumidor.
2. Policies, CLIs, workflows y paquetes publicados de plataforma.
3. OpenSpec/ADR/threat models vigentes.
4. Documentación central.

Si difieren, comprobar comportamiento y alinear las fuentes en el mismo cambio. No implementar un snippet documental sin compararlo con el stack instalado.

## Skills

Las skills canónicas viven en `vigilio-platform-actions/skills` y se publican en `@vigilioyonatan/vigilio-skills`.

```text
source skills
  -> paquete versionado
    -> .agents/skills      Codex
    -> .opencode/skills    OpenCode
```

No editar copias sincronizadas. El manifest registra hashes y `skills:check` bloquea drift.

## Actualizar una skill

1. Cambiar `SKILL.md` o su referencia en plataforma.
2. Validar la skill con `quick_validate.py`.
3. Ejecutar lint, typecheck, tests y build del paquete.
4. Actualizar versión/changelog.
5. Publicar mediante Changesets/Release PR.
6. Actualizar versión exacta en consumidores.
7. Ejecutar `skills:sync` y `skills:check`.
8. Alinear esta documentación si cambió el estándar.

Las releases directas locales son excepcionales; el flujo normal debe ser auditable mediante Changesets y CI.

## OpenSpec

Usar OpenSpec para:

- cambio cross-repo;
- contrato breaking;
- auth/cookies/CSRF;
- runtime config;
- arquitectura MFE;
- infraestructura/CDN;
- observabilidad productiva;
- rollout/rollback de alto riesgo.

Un cambio pequeño, local y reversible no necesita ceremonia adicional.

## ADR y threat model

Crear ADR cuando se elige una dirección arquitectónica con alternativas reales. Actualizar threat model cuando cambia autenticación, datos, uploads, IA, terceros, exposición pública o supply chain.

## Versionado de contratos

- Source en `bus-impl`.
- Paquete browser-safe con Zod y tipos.
- Version exacta en frontend.
- OpenAPI diff y migración coordinada para breaking changes.
- Watch/link solo durante desarrollo.

## Branching y release

- Ramas feature cortas.
- PR hacia `main`.
- Required gate estable.
- Artifact asociado a commit.
- Promoción a staging/production mediante environments.
- Tags/releases desde commits validados.
- Rollback hacia artifact previo.

## Dependabot y repository policy

- Dependabot agrupa con criterio y no modifica contratos automáticamente sin pruebas.
- Archivos críticos (`package.json`, lockfile, workflows, CDK, policies) activan gates de riesgo.
- Cambios de package manager o action SHA se revisan explícitamente.

## Documentación

`vigilio-docs/frontend-web-mfe` contiene la práctica central. `web-mfe/docs` puede conservar evidencia, decisiones y ejemplos específicos del consumidor, pero debe enlazar a la guía central y evitar declarar un estándar contradictorio.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Gobierno, Skills, OpenSpec Y Releases

✅ **Correcto:** Para **Gobierno, Skills, OpenSpec Y Releases**, mantener una norma propietaria y evidencia trazable por cambio.

❌ **Incorrecto:** En **Gobierno, Skills, OpenSpec Y Releases**, repetir políticas transversales en cada skill y afirmar aprobaciones no verificadas.

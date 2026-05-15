# Skills, Agentes, OpenSpec Y DevSecOps

Fuente ejecutable: `vigilio-platform-actions/skills`, paquete `@vigilioyonatan/vigilio-skills` y manifests sincronizados del consumidor.

## Fuente unica

Las skills frontend se mantienen en `vigilio-platform-actions/skills` y se publican dentro de `@vigilioyonatan/vigilio-skills` usando el perfil `web-mfe`.

```text
vigilio-platform-actions/skills
  -> paquete versionado
    -> web-mfe/.agents/skills      Codex
    -> web-mfe/.opencode/skills    OpenCode
```

No editar copias sincronizadas. `.vigilio-manifest.json` registra hashes y `skills:check` bloquea drift.

## Perfil frontend

| Skill | Responsabilidad |
|---|---|
| `web-mfe-technologies` | APIs por versión, ownership tecnológico, `lightweight-charts`, OGL y delivery por perfil |
| `web-mfe-build-feature` | features, componentes, rutas, hooks y ownership de estado |
| `web-mfe-contracts` | DTOs, Zod, forms, queries, mutations y tables |
| `web-mfe-testing` | Vitest, Testing Library, MSW, Playwright, a11y y visual |
| `web-mfe-quality` | accesibilidad, SEO, Web Vitals, bundle y observabilidad |
| `web-mfe-security-delivery` | browser security, CI/CD, supply chain y delivery AWS/Kubernetes según perfil |
| Capacidades documentadas | scaffold, RUM y design system se aplican mediante las seis skills publicadas; no son skills independientes en el snapshot actual |

El perfil `web-mfe` de la fuente actual distribuye seis skills frontend. La versión efectiva del
paquete debe comprobarse en el manifest y lockfile de cada consumidor; no se infiere desde este
documento. Las
capacidades de scaffold, observabilidad y design system están especificadas en los documentos
`17`, `10` y `16`, pero no deben declararse como skills instaladas hasta que aparezcan en una
fuente y release verificables.

```bash
pnpm skills:sync
pnpm skills:check
```

Codex descubre skills en `.agents/skills`; OpenCode en `.opencode/skills`. `AGENTS.md` raiz conserva reglas persistentes.

## OpenSpec

Usar OpenSpec antes de cambios con impacto arquitectonico o coordinacion:

- contrato breaking;
- auth/cookies/CSRF;
- runtime config;
- nueva estrategia MFE;
- infraestructura AWS/CDN;
- observabilidad productiva;
- cambios cross-repo.

No convertir un fix local pequeno en ceremonia. OpenSpec hace explicitos requisitos, riesgos, diseño, rollout y tasks cuando la reversibilidad o coordinacion lo requiere.

## DevSecOps minimo

```text
lint
typecheck
contract governance
skills drift check
unit/component tests
build
bundle budget
SAST + secret scan
dependency review/audit
SBOM
IaC/manifests/image validation según perfil
E2E/smoke segun riesgo
```

## Delivery por perfil

- `current-web`: preservar la entrega ejecutable comprobada en su repositorio; usar S3/CloudFront/CDK solo cuando exista esa evidencia.
- `k8s-v2`: imagen OCI inmutable, ECR, Helm/Argo Rollouts, Argo CD, EKS y foundations Terraform/OpenTofu desde `/docker`, `/deploy` e `/infra`.
- Actions fijadas por SHA y permisos minimos.
- OIDC hacia AWS; no access keys persistentes.
- Artefacto inmutable promovido por ambientes.
- Cache largo para assets hasheados; cache corto para HTML/runtime config en CDN, proxy o ingress correspondiente.
- Smoke post-deploy y rollback a artefacto anterior.

## Observabilidad

El browser envia errores/Web Vitals/trazas a un collector o servicio controlado. Grafana presenta señales de Loki/Tempo/Prometheus/Mimir u otras fuentes; no recibe credenciales ni eventos directamente desde componentes.

Toda telemetria aplica release, stage, route template, correlation ID no sensible, redaction, sampling y limites de cardinalidad.

## Gobierno

- La documentacion no suma madurez si no existe control ejecutable.
- CI es la autoridad; hooks locales solo mejoran feedback.
- No afirmar deploy, RUM, Grafana, rollback o WCAG manual como implementado sin evidencia real.

## Documentos relacionados

- [Tooling, pnpm, Biome y supply chain](../quality/11-tooling-pnpm-biome-supply-chain.md).
- [DevSecOps y gobierno GitHub](../delivery/12-devsecops-cicd-github.md).
- [Gobierno, OpenSpec y releases](14-gobierno-skills-openspec-release.md).
- [Evaluación y operación](15-evaluacion-roadmap-operacion.md).
- [Design system, UI y tokens](../ui/16-design-system-ui-tokens.md).
- [Scaffold de aplicación y feature](../features/17-scaffold-app-feature.md).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Skills, Agentes, OpenSpec Y DevSecOps

✅ **Correcto:** Para **Skills, Agentes, OpenSpec Y DevSecOps**, mantener una norma propietaria y evidencia trazable por cambio.

❌ **Incorrecto:** En **Skills, Agentes, OpenSpec Y DevSecOps**, repetir políticas transversales en cada skill y afirmar aprobaciones no verificadas.

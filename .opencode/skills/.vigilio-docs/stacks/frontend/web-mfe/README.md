# Documentación Arquitectónica Frontend Web MFE 2026

Estándar central para dos pares Preact/React aislados y activos: `web-mfe` con `bus-impl`, y `web-mfe-v2` con `bus-impl-v2`. La automatización compartida vive en `vigilio-platform-actions`.

| Perfil | Backend | Contrato | Frontend | Estado |
|---|---|---|---|---|
| `current-web` | `bus-impl` | `@vigilioyonatan/bus-contracts` | `web-mfe` | Pareja activa; preservar |
| `k8s-v2` | `bus-impl-v2` | `@vigilioyonatan/bus-v2-contracts` | `web-mfe-v2` | Pareja Kubernetes materializada |

## Fuentes de verdad

1. Código, tests, workflows e infraestructura del repositorio consumidor.
2. Contrato publicado por el backend owner del perfil exacto.
3. Policies, tooling, workflows y skills de `vigilio-platform-actions`.
4. OpenSpec, ADR y threat models vigentes.
5. Esta documentación como explicación arquitectónica.

Si una guía contradice el comportamiento ejecutable, verificar la causa y alinear ambas fuentes. No elevar una recomendación a “implementada” sin evidencia.

## Relación entre proyectos

```text
bus-impl
  -> @vigilioyonatan/bus-contracts
    -> ApiClient/services de web-mfe
      -> TanStack Query / React Hook Form
        -> features / componentes / TanStack Table

bus-impl-v2 (EKS)
  -> @vigilioyonatan/bus-v2-contracts
    -> ApiClient/services de web-mfe-v2
      -> TanStack Query / React Hook Form
        -> features / componentes / TanStack Table

vigilio-platform-actions
  -> @vigilioyonatan/vigilio-skills (perfil web-mfe)
    -> .agents/skills      Codex
    -> .opencode/skills    OpenCode

vigilio-docs
  -> baseline arquitectónico enlazado por las skills
```

## Índice canónico

1. [Contratos, DTOs, Zod y TanStack](contracts/1-contratos-dtos-zod-tanstack.md).
2. [Skills, agentes, OpenSpec y DevSecOps](governance/2-skills-agentes-openspec-devsecops.md).
3. [Arquitectura, estructura y ownership de estado](architecture/3-arquitectura-estructura-estado.md).
4. [Flujo local, entornos y runtime config](runtime/4-flujo-local-entornos-runtime-config.md).
5. [Integración BFF, HTTP, runtime y autenticación](http/5-bff-http-runtime-auth.md).
6. [Golden path de feature, componentes y hooks](features/6-golden-path-feature-componentes-hooks.md).
7. [Testing con Vitest, MSW y Playwright](testing/7-testing-vitest-msw-playwright.md).
8. [Calidad, SEO, accesibilidad y rendimiento](quality/8-calidad-seo-accesibilidad-rendimiento.md).
9. [Seguridad, hardening y privacidad](security/9-seguridad-hardening-privacidad.md).
10. [Observabilidad, RUM, Grafana y SLO](observability/10-observabilidad-rum-grafana-slo.md).
11. [Tooling, pnpm, Biome y supply chain](quality/11-tooling-pnpm-biome-supply-chain.md).
12. [DevSecOps, CI/CD y gobierno GitHub](delivery/12-devsecops-cicd-github.md).
13. [AWS, CloudFront, CDK y FinOps](delivery/13-aws-cloudfront-cdk-finops.md).
14. [Gobierno, skills, OpenSpec y releases](governance/14-gobierno-skills-openspec-release.md).
15. [Evaluación, roadmap y operación](governance/15-evaluacion-roadmap-operacion.md).
16. [Design system, UI y tokens](ui/16-design-system-ui-tokens.md).
17. [Scaffold de aplicación y feature](features/17-scaffold-app-feature.md).
18. [Tecnologías frontend 2026 y APIs por versión](technology/18-frontend-technologies-skill-2026.md).
19. [Tiempo real con WebSocket, Socket.IO y SSE](http/19-realtime-websocket-sse.md).

## Owners

| Responsabilidad | Fuente canónica |
|---|---|
| Schemas y tipos HTTP | Backend owner del perfil (`bus-impl` o `bus-impl-v2`) |
| Contrato distribuible | Package exacto del perfil |
| UI y evidencia ejecutable | Consumer del perfil (`web-mfe` o `web-mfe-v2`) |
| Skills y tooling | `vigilio-platform-actions` |
| Práctica arquitectónica | `vigilio-docs/frontend-web-mfe` |

## Relación con `web-mfe/docs`

Esta carpeta define el baseline compartido. `web-mfe/docs` conserva únicamente:

- el índice hacia esta documentación central;
- el scorecard basado en evidencia real del consumidor;
- la política operativa local de gestión de vulnerabilidades.

Arquitectura, contratos, testing, componentes, hooks, SEO, accesibilidad, seguridad, observabilidad,
tooling, DevSecOps, AWS, skills y releases no se duplican dentro de `web-mfe`.

## Regla principal

No duplicar DTOs, schemas, instrucciones de agentes ni estado remoto. Cada responsabilidad tiene un owner y un mecanismo ejecutable de verificación.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Componentes enfocados, contratos compartidos, estados explícitos, accesibilidad y `map()` puro para renderizar listas con keys estables.
- ❌ **Incorrecto:** `map()` para efectos ignorando el retorno, `forEach(async...)` sin esperar, duplicar schemas y renderizar HTML no confiable.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).
## Identidad y alcance del stack

**Web MFE** significa interfaz web modular con contratos y boundaries de despliegue explícitos. No significa que toda feature deba usar Module Federation ni compartir estado global.

- Cada documento completo se ha **trasladado íntegramente** bajo una carpeta de responsabilidad; no se sustituyó por resúmenes.
- DDD, seguridad, testing y DevSecOps universales viven en `foundations/` y `standards/`; aquí solo vive el código específico de este stack.
- Versiones y compatibilidad: [registro único](../../../technology/versions.md). No repetir valores de versión en guías operativas.

| Tema | Guía completa |
|---|---|
| Arquitectura | [Arquitectura](architecture/3-arquitectura-estructura-estado.md) |
| Contratos | [Contratos](contracts/1-contratos-dtos-zod-tanstack.md) |
| Feature | [Feature](features/6-golden-path-feature-componentes-hooks.md) |
| Testing | [Testing](testing/7-testing-vitest-msw-playwright.md) |
| Seguridad | [Seguridad](security/9-seguridad-hardening-privacidad.md) |

✅ Correcto: respetar stack, toolchain, contratos y pruebas propios.

❌ Incorrecto: tratar Expo como microfrontend web, instalar dependencias sin compatibilidad o duplicar políticas transversales.

## Cobertura completa y navegación por escenario

- [Matriz aplicable de prácticas, riesgos y aceptación](testing/e2e-playwright.md) — seleccionar todas las pertinentes; una guía breve o un índice no equivalen a una implementación terminada.

✅ Correcto: seguir el estándar y registrar evidencia. ❌ Incorrecto: detenerse en los primeros tres ejemplos.

## Dependencias versionadas del stack

No duplicar aquí APIs externas; cuando se use una librería, abrir su documentación canónica:

- [tailwind-css](../../../technology/libraries/tailwind-css.md)
- [tanstack-query](../../../technology/libraries/tanstack-query.md)
- [tanstack-table](../../../technology/libraries/tanstack-table.md)
- [preact](../../../technology/libraries/preact.md)
- [vite](../../../technology/libraries/vite.md)
- [vitest](../../../technology/libraries/vitest.md)

✅ Correcto: comprobar compatibilidad real con runtime y lockfile. ❌ Incorrecto: copiar snippets legacy de un framework distinto.

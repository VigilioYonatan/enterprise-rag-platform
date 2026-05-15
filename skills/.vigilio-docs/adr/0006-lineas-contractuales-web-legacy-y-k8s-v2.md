# ADR 0006 - Lineas contractuales web actual y Kubernetes v2 (superseded)

## Estado

Reemplazado por ADR 0007

Este registro se conserva por trazabilidad. La palabra `legacy` no representa el estado real de
`web-mfe`/`bus-impl`; la correccion y materializacion de v2 estan en ADR 0007.

## Contexto

El workspace contiene `bus-impl` y `web-mfe` como una pareja brownfield existente. Tambien contiene `bus-impl-v2`, cuyo runtime productivo se entrega con Terraform/OpenTofu, EKS, Helm y GitOps, y que publica el package browser-safe `@vigilioyonatan/bus-v2-contracts`.

Reutilizar `web-mfe` para ambos backends produciria dos owners de contrato, links locales ambiguos y validaciones OpenAPI contra el repositorio equivocado. Renombrar o transformar el frontend existente tambien mezclaria ciclos de release y cambios locales que pertenecen a la linea actual.

## Decision

Mantener dos perfiles contractuales separados:

| Perfil | Backend owner | Package | Frontend consumer | Runtime backend |
|---|---|---|---|---|
| `current-web` | `bus-impl` | `@vigilioyonatan/bus-contracts` | `web-mfe` | El probado por esa linea |
| `k8s-v2` | `bus-impl-v2` | `@vigilioyonatan/bus-v2-contracts` | `web-mfe-v2` | Kubernetes/EKS |

Reglas:

- `web-mfe` no se renombra, elimina ni modifica como atajo para construir v2.
- En la fecha original, `web-mfe-v2` era target greenfield; ADR 0007 registra su materializacion.
- Desarrollo local puede usar `link:` solo al package owner de la misma fila.
- CI/release consume una version exacta publicada y ejecuta OpenAPI export/diff y pruebas contractuales.
- La capability/skill conserva IDs estables `web-mfe-*`; el nombre fisico del target se resuelve por perfil.
- El Prompt Builder falla con `CONTRACT_OWNER_MISMATCH` ante cualquier cruce entre filas.
- La infraestructura CDK de frontend se limita a S3 privado, CloudFront, WAF, certificados y observabilidad de edge. No cambia el backend EKS a Lambda/CDK.

## Consecuencias

Beneficios:

- La linea actual puede seguir operando sin una migracion forzada.
- V2 nace con contrato, CI y ownership coherentes con `bus-impl-v2`.
- Los prompts pueden generar una aplicacion greenfield exacta sin inventar `apps/frontend` ni escribir sobre el frontend anterior.

Costos y deuda aceptada:

- Habra dos frontends y dos packages contractuales durante la coexistencia.
- Las features compartidas se reutilizan mediante skills, tooling y componentes deliberadamente extraidos; no copiando toda la aplicacion.
- Hasta materializar `web-mfe-v2`, no existe compatibilidad runtime end-to-end demostrable con el backend v2.

## Alternativas consideradas

- **Migrar `web-mfe` in-place a v2.** Descartada: mezcla releases, contratos y cambios locales brownfield.
- **Permitir que un frontend seleccione backend por variable de entorno.** Descartada: convierte el contrato compilado en una union ambigua y debilita el fail-closed.
- **Duplicar DTOs dentro de `web-mfe-v2`.** Descartada: crea una segunda fuente de verdad.

## Fecha

2026-08-08

## Owners

- Backend v2: owner de `bus-impl-v2`
- Frontend v2: owner de `web-mfe-v2`
- Contratos y factory: owners de `platform-actions` y los repositorios consumidores

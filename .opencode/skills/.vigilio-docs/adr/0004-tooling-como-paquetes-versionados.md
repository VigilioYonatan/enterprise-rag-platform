# ADR 0004 - Tooling de plataforma como paquetes versionados

## Estado

Aceptado

## Contexto

Varios repositorios (`bus-impl`, `web-mfe`, `mobile-mfe`, `tauri-mfe`) necesitan la misma logica de
gobernanza: validar workflows, politica de package manager, presupuesto de bundle, compatibilidad de
contratos, evidencia DORA y sincronizacion de skills.

El patron habitual es copiar los scripts entre repos. Eso produce N variantes que divergen: se arregla
un bug en uno y los otros tres siguen rotos, sin que nadie lo note.

## Decision

La logica vive en `vigilio-platform-actions` y se publica como paquetes npm con version exacta en
GitHub Packages:

| Paquete | Responsabilidad |
| --- | --- |
| `devsecops-governance` | ramas, commits, PRs, workflows, package manager |
| `devsecops-evidence` | DORA, SLSA, evidencia operacional |
| `node-nest-tooling` | build ESM, generacion de contratos, PostgreSQL local, Lambda |
| `web-mfe-tooling` | bundle budget, compatibilidad OpenAPI, env publica, SBOM |
| `vigilio-skills` | sincronizacion de skills con manifiesto y SHA-256 |

Reglas:

- Los consumidores fijan **version exacta**, no rangos.
- Ningun paquete escribe en el consumidor durante `postinstall`.
- Los binarios se ejecutan desde `node_modules/.bin`; no se copian scripts al repo consumidor.
- La fuente es TypeScript estricto; se publica JavaScript ESM con declaraciones.

## Consecuencias

Beneficios:

- Un arreglo se publica una vez y llega a todos los consumidores por Dependabot.
- La version exacta hace que actualizar sea un acto explicito y revisable en un PR.
- Prohibir `postinstall` elimina una clase entera de ataque de supply chain.

Costos y deuda aceptada:

- Publicar tiene friccion: un arreglo urgente exige release del paquete y bump en el consumidor.
- Los consumidores pueden quedarse en versiones distintas y divergir igualmente. Ya ocurre:
  `bus-impl` usa `vigilio-skills@0.2.0` y `web-mfe` usa `0.3.1`, y ambos pasan sus gates porque cada
  uno valida contra su propia version. Falta un gate de plataforma que detecte esa deriva.
- **Estos paquetes son el codigo menos testeado del sistema y el que mas cosas gatea.** Un fallo en
  `validate-contracts` no rompe nada visible: simplemente deja pasar drift en todos los consumidores
  a la vez. Es el riesgo principal de centralizar y exige cobertura por encima de la media, no por
  debajo.

## Alternativas consideradas

- **Copiar scripts entre repos.** Descartada: es el problema que se quiere resolver.
- **Un unico monorepo con todo.** Descartada: los repos tienen ciclos de despliegue y ownership
  distintos.
- **Solo composite actions y reusable workflows, sin paquetes npm.** Insuficiente: la logica tambien
  tiene que poder ejecutarse en local antes del push (`prepush:verify`), no solo en CI.
- **Rangos semver (`^1.0.0`) en vez de versiones exactas.** Descartada: una publicacion podria cambiar
  el comportamiento de CI en cuatro repos sin que nadie abriera un PR.

## Fecha

2026-07-26

## Owners

- Equipo: Plataforma
- Responsable: owner de `vigilio-platform-actions`

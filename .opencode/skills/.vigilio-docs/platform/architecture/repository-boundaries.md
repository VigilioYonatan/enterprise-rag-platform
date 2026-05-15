# Límites De Repositorios Y Separación De Responsabilidades

Este estándar define las fronteras de aislamiento físico y lógico entre repositorios de código, infraestructura, empaquetado, entrega declarativa y gobernanza en la plataforma Vigilio 2026 a través de sus [tres arquitecturas de referencia](reference-topologies.md).

## Principios De Delimitación

Un sistema escalable no mezcla el ciclo de vida de una aplicación con la infraestructura que la hospeda ni con las imágenes base de contenedor. La arquitectura mantiene fronteras claras adaptadas al nivel operativo:

1. **Repositorios de Aplicación (`apps/*`):** Contienen únicamente código fuente de servicios o frontends, sus DTOs/schemas dentro de cada módulo de dominio, pruebas unitarias/integradas y pipelines CI de calidad y compilación OCI. Nunca contienen módulos de Terraform, roles de sistema operativo ni manifiestos directos de despliegue productivo.
2. **Prohibición de carpeta `contracts/` separada:** No se crean carpetas `contracts/`, `packages/contracts/` ni repositorios manuales de DTOs paralelos. Cada módulo de negocio es dueño de sus schemas Zod 4 (`domain/schemas/*.schema.ts`) y DTOs HTTP (`presentation/http/dto/*.dto.ts`) según [Contratos HTTP en DTOs](../../standards/api/http-dtos-and-contracts.md), exportando y validando compatibilidad OpenAPI en CI.
3. **Infraestructura de Host o Cloud (`platform-ops/` o `infra/`):**
   - En **Nivel 1 (`compose-vps`)**: `platform-ops/` centraliza roles Ansible agnósticos al producto (`rootless_podman_host` con `meta/argument_specs.yml`) para endurecer hosts Linux sin conocer nombres de aplicaciones ni dominios.
   - En **Niveles 2 y 3 (`k8s-gitops-selfhosted` y `cloud-aws-gitops`)**: `infra/` centraliza raíces de estado independientes de Terraform (separando red de clúster/datos con verificación de hash SHA-256 anti-drift y validación anti-solapamiento CIDR).
4. **Empaquetado OCI Endurecido (`Dockerfile` / `Containerfile.runtime` / `docker/`):**
   - Una sola imagen backend Distroless non-root (`glibc`) ejecuta los distintos entrypoints (`api`, `outbox`, `worker`, `migrate`, `platform-setup`).
   - El frontend utiliza `Containerfile.runtime` copiando únicamente artefactos estáticos ya compilados (`dist/`) para que ningún token de registro quede en capas OCI.
5. **Entrega Declarativa (`<product>-deploy/` o `deploy/` GitOps):**
   - En **Nivel 1 (`compose-vps`)**: `<product>-deploy/` contiene un **único `compose/compose.yaml`** compartido entre `staging` y `production` (parametrizado por `ENV_FILE` y digest inmutable), `Caddyfile` y el stack de `observability/` acoplado a los SLOs del producto.
   - En **Niveles 2 y 3 (Kubernetes GitOps)**: `deploy/` almacena charts Helm, overlays por entorno, políticas Kyverno CEL (`ValidatingPolicy` / `ImageValidatingPolicy`) y `ApplicationSets` de Argo CD. **CI construye y firma la imagen, abre un PR/MR actualizando solo el digest `sha256` y jamás recibe credenciales `kubeconfig` del clúster.**
6. **Laboratorio Local y Simulación (`prod-local`):** Emulación reproducible del ecosistema completo en estación de trabajo reutilizando el Compose productivo (Nivel 1), clúster Kind aislado (Nivel 2) o contenedores con emulador ligero Floci (Nivel 3).

```text
Nivel 1 (Simple a Mediano — Compose VPS)          Niveles 2 y 3 (Enterprise — Kubernetes GitOps / AWS)
┌────────────────────┐  ┌────────────────────┐    ┌────────────────────┐  ┌────────────────────┐
│  apps/<prod>-impl  │  │   platform-ops/    │    │  apps/<svc>-impl   │  │      infra/        │
│  apps/<prod>-web   │  │ (Ansible Rootless) │    │  apps/<svc>-web    │  │(Terraform Aislado) │
└─────────┬──────────┘  └─────────┬──────────┘    └─────────┬──────────┘  └─────────┬──────────┘
          │ Imagen OCI@sha256     │ Host Listo              │ PR Digest@sha256      │ Clúster / VPC
          ▼                       ▼                         ▼                       ▼
┌────────────────────────────────────────────┐    ┌────────────────────────────────────────────┐
│             <product>-deploy/              │    │            deploy/ (Argo CD)               │
│  (1 solo compose.yaml + Caddy + OTel/SLO)  │    │ (Helm + Kyverno CEL + Rollouts Canary)     │
└────────────────────────────────────────────┘    └────────────────────────────────────────────┘
```

## Gobernanza De Repositorios

- Todo repositorio debe ser un repositorio Git independiente con historial auditable y protección de ramas (`main` protegida, `CODEOWNERS`, revisiones obligatorias y bloqueo de `force-push`).
- La raíz de un checkout multi-repositorio local **no debe incluir `package.json`, `pnpm-workspace.yaml` ni `pnpm-lock.yaml`**, impidiendo que se convierta accidentalmente en un monorepo acoplado.
- En Niveles 2 y 3, los repositorios de aplicación pueden montarse como submódulos Git fijados por SHA para facilitar auditorías reproducibles sin fusionar permisos ni ciclos de release.

## Convención De Organizaciones Y Aplicaciones

Los nombres de empresa son ejemplos de organización, no rutas obligatorias. Cada organización conserva las mismas fronteras de responsabilidad según el nivel elegido:

```text
organizations/
├── vigilio-services/
│   ├── apps/
│   ├── platform-ops/        # Nivel 1: Ansible host agnóstico (o infra/ en Niveles 2-3)
│   ├── <product>-deploy/    # Nivel 1: Compose único + observabilidad (o deploy/ GitOps en Niveles 2-3)
│   └── prod-local/
├── rimac-secures/
│   ├── apps/
│   ├── infra/
│   ├── docker/
│   └── deploy/
└── win/
    ├── apps/
    ├── infra/
    ├── docker/
    └── deploy/
```

Los nombres de aplicación expresan dominio, canal y responsabilidad. Ejemplos ilustrativos:

| Nombre | Responsabilidad |
|---|---|
| `ecommerce-impl` / `ecommerce-api` | Monolito modular o API de dominio de ecommerce (API, outbox, worker y migraciones en una sola imagen OCI; DTOs y schemas Zod 4 dentro de cada módulo, sin carpeta `contracts/`). |
| `ecommerce-web` / `ecommerce-web-mfe` | Frontend o microfrontend web desplegable de forma independiente con `Containerfile.runtime` sin secretos. |
| `ecommerce-web-bff` | Backend for Frontend exclusivo del canal web cuando existe necesidad real de adaptación/agregación por canal. |
| `facturacion-service` | Servicio de dominio de facturación. |

**BFF** significa **Backend for Frontend**. No es sinónimo de cualquier backend: existe para servir a un canal concreto, por ejemplo web o mobile. **MFE** significa **Microfrontend**: una unidad frontend con ownership y ciclo de despliegue independiente. Cuando no existe necesidad real de adaptación por canal, el frontend consume directamente la API pública gobernada sin introducir un BFF innecesario.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Mantener `infra/` (o `platform-ops/`) y `deploy/` (o `<product>-deploy/`) en límites de CI independientes, donde los runners de aplicación nunca poseen `kubeconfig` productivo y cada módulo es dueño de sus propios DTOs sin carpetas `contracts/` externas.
- ❌ **Incorrecto:** Colocar un `package.json` en la raíz de un checkout multi-repo, crear carpetas `contracts/` manuales que dupliquen schemas o copiar múltiples archivos `docker-compose.*.yml` divergentes por entorno.
- ✅ **Correcto:** Cada repositorio posee su propio `.gitignore`, lockfile inmutable, pipeline de CI independiente y políticas de branch protection con aprobaciones obligatorias.
- ❌ **Incorrecto:** Copiar carpetas enteras de código (`workspace-copy/`, `backup/`) dentro del espacio de trabajo provocando explosión de archivos no rastreados y colisiones de estado.

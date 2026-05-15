# Modelo De Gobernanza Y Responsabilidad (Ownership)

Establece las responsabilidades, asignación de propiedad de código y controles de aprobación para repositorios de plataforma, aplicaciones e infraestructura.

## Matriz De Responsabilidades Por Dominio

| Dominio | Propietario Principal | Responsabilidades |
|---|---|---|
| `infra/` | Equipo de Cloud & Infraestructura | Módulos Terraform, red, identidad, cómputo, datos, políticas de drift y seguridad. |
| `deploy/` | Equipo de SRE & Platform | Charts Helm, Kustomize, Argo CD, ingress, service mesh y autoscaling. |
| `docker/` | Equipo DevSecOps | Endurecimiento de imágenes, escaneo Trivy/Grype, firma Cosign y SBOM. |
| `apps/*` | Equipos de Desarrollo de Producto | Lógica de negocio, controladores, DTOs, tests unitarios y observabilidad app. |
| `prod-local` | Platform Engineering | Simulación production-like con Kind, datos sintéticos y perfiles de testing. |

## Reglas De CODEOWNERS

Cada repositorio debe contar con un archivo `.github/CODEOWNERS` o `.gitlab/CODEOWNERS` que imponga revisiones obligatorias:

```text
# Gobernanza global
*                       @<organization>/platform-reviewers

# Infraestructura sensible
/infra/                 @<organization>/cloud-engineers
/environments/prod/     @<organization>/infra-leads @<organization>/security

# Políticas de seguridad y runtime
/policies/              @<organization>/devsecops
/supply-chain/          @<organization>/devsecops

# Manifiestos de producción
/deploy/overlays/prod/  @<organization>/sre-leads
```

`<organization>` debe resolverse con el namespace real de la empresa, por ejemplo `vigilio-services`, `rimac-secures` o `win`; nunca debe copiarse literalmente como nombre de equipo.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Bloquear el merge a ramas protegidas (`main`, `production`) hasta contar con aprobaciones explícitas de los propietarios designados en `CODEOWNERS`.
- ❌ **Incorrecto:** Permitir que cambios en infraestructura cloud o políticas de seguridad eBPF se aprueben automáticamente sin revisión de un especialista de plataforma.
- ✅ **Correcto:** Auditar periódicamente la membresía de los grupos de CODEOWNERS y vincularlos a roles institucionales del directorio de identidad corporativa.
- ❌ **Incorrecto:** Dejar rutas críticas como `/environments/production/` o `/policies/` sin reglas explícitas de propietarios.

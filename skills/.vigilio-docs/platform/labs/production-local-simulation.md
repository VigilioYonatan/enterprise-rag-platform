# Simulación Local De Producción Y Laboratorios (`prod-local`)

Define la arquitectura, perfiles de ejecución y procedimientos de validación en entornos locales reproducibles (`prod-local`) que ofrecen una simulación *production-like* alineada exactamente con las [tres arquitecturas de referencia de Vigilio](../architecture/reference-topologies.md), sin imponer Kubernetes cuando el producto opera sobre Docker/Podman Compose.

## Propósito Del Laboratorio Local

El laboratorio local (`prod-local`) permite a cualquier ingeniero validar contratos HTTP, migraciones, seguridad de contenedores, redes privadas, observabilidad y flujos asíncronos en su estación de trabajo antes de abrir Pull/Merge Requests.

> [!NOTE]
> `prod-local` reproduce contratos, topología de procesos, políticas de seguridad y flujos de datos críticos. No reproduce capacidad real de cómputo, disponibilidad geográfica multizona, fallos físicos entre racks ni SLAs de servicios gestionados en la nube.

## Los 3 Perfiles De `prod-local` Según Escala De Arquitectura

```text
Estación de Trabajo Local (Docker Desktop / Rootless Podman / WSL2)
├── Perfil 1: Compose VPS (Proyectos simples a medianos — SIN Kubernetes)
│   └── Orquesta directamente <product>-deploy/compose/compose.yaml (sin duplicarlo)
│       ├── Caddy (TLS local) + Web Distroless + API + Outbox + Worker + Migrate
│       ├── PostgreSQL + Valkey + NATS JetStream + RustFS (S3) + ClamAV
│       └── OTel Collector + Prometheus + Alertmanager + Loki + Tempo + Grafana
├── Perfil 2: Kubernetes GitOps Self-Hosted (Empresas grandes On-Prem)
│   ├── Clúster Kind aislado: Cilium + Gateway API + Argo CD + Kyverno CEL + CloudNativePG + Mailpit
│   └── Extensión opcional <runtime-security-profile>: Kernel Linux/WSL2 eBPF + Tetragon Enforcement
└── Perfil 3: Emulación Cloud Ligera (Empresas grandes AWS / Multicloud)
    └── Contenedores de aplicación + PostgreSQL + Floci (emulación rápida S3/SNS/SQS/DLQ sin LocalStack)
```

| Perfil de Laboratorio | Arquitectura Objetivo | Orquestador Requerido | Regla Clave de Fidelidad |
|---|---|---|---|
| **1. `compose-vps` (Por defecto para apps simples/medianas)** | [Entrega Cloud-Neutral Compose](../compose/cloud-neutral-vps-delivery.md) | Docker Compose o Rootless Podman Compose (`>= 4.8`) | **Cero Kubernetes.** Consume el mismo `compose.yaml` productivo inyectando variables locales y manejando tokens de registro solo en memoria efímera. |
| **2. `k8s-gitops` (Estándar y `<runtime-security-profile>`)** | [Kubernetes GitOps](../kubernetes/gitops-delivery.md) · [On-Prem](../onprem/kubernetes-foundation.md) | Kind (`>= 0.27`) / k3d sobre Podman/Docker/WSL2 | Prueba admisión fail-closed de Kyverno CEL, Gateway API, `CloudNativePG` PITR drill, alertas en Mailpit y (en Linux/WSL2) bloqueo eBPF con Tetragon. |
| **3. `cloud-floci` (Integración Cloud AWS/Azure)** | [Fundación Cloud AWS](../aws/platform-foundation.md) | Compose + **Floci** (puertos aislados AWS/Azure) | Valida S3 privado, `Outbox -> SNS -> SQS + DLQ` e idempotencia sin credenciales `AKIA...` reales ni sobrecarga de memoria de suites pesadas. |

`<runtime-security-profile>` es un rol configurable para validación de kernel eBPF/Tetragon cuando la arquitectura objetivo es Kubernetes, no un nombre rígido de carpeta.

## Roles De Aplicación Y Propiedad De Contratos

- **Backend de dominio (`<product>-impl` o `<product>-api`):** Implementa reglas de negocio, conserva la autoridad sobre sus datos y ejecuta desde una sola imagen OCI los roles `api`, `outbox`, `worker` y `migration`. **No utiliza carpetas `contracts/` separadas:** cada módulo posee sus schemas Zod 4 y DTOs HTTP exportando OpenAPI verificable en CI.
- **BFF (Backend for Frontend):** Opcional; existe únicamente cuando un canal concreto requiere adaptación o agregación específica.
- **Frontend / MFE (`<product>-web`):** Unidad independiente empaquetada con `Containerfile.runtime` Distroless sin tokens persistidos en capas OCI; cuando no hay necesidad real de adaptación por canal, consume directamente la API pública gobernada.

## Modos De Conectividad Del Laboratorio

Para garantizar reproducibilidad sin sorpresas por dependencias de red:

1. **`online-bootstrap`:** Inicialización que descarga imágenes OCI fijadas y binarios verificados por checksum SHA-256 en `.tools/` según `versions.yaml`.
2. **`cached-offline`:** Operación regular que reutiliza las capas OCI almacenadas en la caché local del runtime de contenedores sin requerir Internet.
3. **`air-gapped`:** Modo estricto para entornos aislados mediante importación previa de un bundle tarball verificado con imágenes y manifiestos.

## Especificación Operativa Y Verificación

### 1. Requisitos e Higiene de Credenciales
- **Container Runtime:** Docker Desktop o Rootless Podman con soporte cgroups v2 (8 GB RAM mínimo para Perfil 1/3; 16 GB RAM recomendados para Perfil 2 con observabilidad completa).
- **Reporte de preflight canónico:** `reports/local-lab-preflight.json` generado antes de ejecutar suites E2E o certificar el gate local.
- **Aislamiento de credenciales:** Prohibición terminante de claves reales cloud (`AKIA...`, tokens productivos) en archivos locales; cualquier token privado de paquetes se inyecta en memoria durante el build y se limpia inmediatamente al finalizar (`try / finally`).

### 2. Procedimientos de Inicio y Validación por Perfil

**Perfil 1 — Proyectos Simples a Medianos (`compose-vps`, sin Kubernetes):**
```bash
# Validar interpolación declarativa de Compose sin tocar servidores
podman compose --env-file environments/local.env.example -f compose/compose.yaml config --quiet

# Levantar stack completo reutilizando el compose declarativo del producto
pwsh ./prod-local/scripts/up.ps1
pwsh ./prod-local/scripts/test.ps1
```

**Perfil 2 — Proyectos Enterprise Kubernetes GitOps (`k8s-gitops`):**
```bash
# Bootstrap de herramientas fijadas con verificación SHA-256 en .tools/
pwsh ./scripts/bootstrap-tools.ps1
kind create cluster --config kind-config.yaml --name vigilio-local-lab
pwsh ./scripts/validate.ps1
```

**Perfil 3 — Integración Cloud con Emulador Ligero (`cloud-floci`):**
```bash
# Validar migraciones, concurrencia PostgreSQL y mensajería S3/SNS/SQS sobre Floci local
pnpm test:integration
```

### 3. Escenarios Negativos y Pruebas Fail-Closed
- **Container Daemon offline o no instalado:** El script de preflight aborta inmediatamente registrando `NOT_RUN` en `reports/local-lab-preflight.json`.
- **Exposición accidental de puertos internos:** `test.ps1` verifica que PostgreSQL, Valkey, NATS y almacenamiento S3 interno no queden publicados en `0.0.0.0`, fallando cerrado si algún puerto de datos es accesible fuera de la red interna.
- **Inyección accidental de claves de producción:** Si el analizador estático detecta `AKIA...` o secretos reales, el gate emite `FAIL` y bloquea la ejecución.
- **Colisión de puertos de host:** El preflight detecta puertos ocupados antes de iniciar Caddy o el Gateway local.

### 4. Procedimiento de Teardown Idempotente
```bash
# Perfil 1 (Compose): detener contenedores y limpiar volúmenes temporales de sesión
pwsh ./prod-local/scripts/down.ps1

# Perfil 2 (Kind): eliminar clúster local sin dejar procesos huérfanos
kind delete cluster --name vigilio-local-lab
```

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Usar el **Perfil 1 (Compose puro sin K8s)** en proyectos simples a medianos reutilizando el `compose.yaml` de `<product>-deploy`, y reservar Kind (**Perfil 2**) exclusivamente para plataformas con ADR de Kubernetes/GitOps.
- ❌ **Incorrecto:** Obligar a instalar Kind, Helm y Tilt para desarrollar un monolito modular desplegado en VPS con Compose, o duplicar un segundo `docker-compose.yml` desconectado del archivo productivo.
- ✅ **Correcto:** Distinguir honestamente lo probado en `prod-local` (`PASS` de contratos, admisión, alertas y restore drill en un host) de lo que sigue bloqueado hasta contar con hardware multi-nodo o cuentas cloud reales (`BLOCKED` / `NOT_RUN`).
- ❌ **Incorrecto:** Asumir que un test aprobado en `prod-local` demuestra tolerancia a pérdida de zona física o capacidad real bajo tráfico productivo sin pruebas de carga y game days en staging/producción.

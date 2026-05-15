# Entrega De Infraestructura Como Código Con Terraform

Establece las pautas de arquitectura, estratificación y flujo de despliegue para la infraestructura como código (IaC) administrada con Terraform en Vigilio de forma neutral frente a proveedores de nube.

## Principios De Estratificación De Infraestructura (`infra/`)

La infraestructura se organiza en capas estrictamente delimitadas para evitar acoplamiento y limitar el radio de impacto de fallos, independientemente de la nube o centro de datos de destino:

```text
infra/
├── bootstrap/       # Aprovisionamiento del backend remoto y bloqueo de estado
├── config/          # Esquemas y configuraciones validadas
├── modules/         # Módulos reutilizables agnósticos de entorno y proveedor
├── stacks/          # Composición lógica de módulos (Network, Compute, Data, Security)
├── environments/    # Declaraciones de estado por entorno (dev, staging, prod)
├── migration/       # Procedimientos de importación, migración y rollback
├── policies/        # Reglas OPA / Conftest / Checkov de cumplimiento de seguridad
└── tests/           # Pruebas automatizadas de sintaxis, lint y contratos de infraestructura
```

## Gestión Del Backend Remoto Y Selección De Motor

El backend remoto debe garantizar persistencia duradera, cifrado en reposo y bloqueo concurrente de estado:

> [!NOTE]
> **Selección de Backend por Proveedor:**
> - **AWS (Recomendado):** Bucket S3 versionado y cifrado con KMS, utilizando bloqueo nativo de S3 mediante `use_lockfile = true` (disponible desde Terraform 1.10 con escrituras condicionales). La tabla DynamoDB está deprecada para nuevos despliegues y se conserva únicamente para compatibilidad o migración desde infraestructuras legacy.
> - **Azure:** Azure Blob Storage en contenedor privado con bloqueo por leases nativos.
> - **GCP:** Google Cloud Storage con bloqueo de objetos y retención de versiones.
> - **On-Premise / Datacenter Privado:** PostgreSQL con advisory locks, HashiCorp Consul o almacenamiento compatible con S3 (MinIO). *Nota crítica de compatibilidad:* Para MinIO o implementaciones S3 on-premise, debe probarse y validarse explícitamente el soporte de escrituras condicionales para locking (`use_lockfile = true`); no debe asumirse únicamente por exponer una API compatible con S3.

## Prerrequisitos De Ejecución

1. Terraform CLI fijado según `versions.yaml` (>= 1.10.0 para soporte nativo de `use_lockfile`).
2. Identidad federada OIDC configurada en el proveedor cloud (sin access keys estáticas).
3. Backend de estado remoto inicializado y verificado mediante scripts de `bootstrap/`.
4. Políticas OPA / Conftest y reglas de TFLint cargadas en el runner de CI.

## Matriz De Decisiones De Arquitectura IaC

| Criterio | Módulo Reutilizable (`modules/`) | Stack / Composición (`stacks/`) | Entorno (`environments/`) |
|---|---|---|---|
| Definición de `provider` | Prohibido | Prohibido | Obligatorio |
| Bloque `backend` | Prohibido | Prohibido | Obligatorio |
| Variables de entorno | Variables parametrizadas | Entradas de composición | Valores específicos (`terraform.tfvars`) |
| Radio de explosión | Nulo (código puro) | Medio (dependencias lógicas) | Crítico (recursos reales en nube) |

## Flujo De Entrega: Plan En PR, Apply En Merge

1. **Pull Request (Validación y Plan):**
   - Ejecución de `terraform fmt -check`.
   - Validación estática con `tflint` y escaneo de seguridad con `checkov` o `trivy`.
   - Generación del plan especulativo (`terraform plan -out=tfplan`) emitido como comentario en el PR.
   - Prohibido aplicar cambios en ramas de feature.
2. **Merge a Main (Aplicación Automática):**
   - El runner de CI asume identidad federada (OIDC con el proveedor correspondiente) sin credenciales estáticas de larga duración.
   - Aplicación estricta del plan previamente generado (`terraform apply tfplan`).
   - Registro de auditoría y emisión de métricas de despliegue.

## Pruebas Negativas Y Detección De Fallos

- **Verificación de Bloqueo Concurrente:** Simulación de dos ejecuciones simultáneas de `terraform plan/apply`; la segunda debe fallar inmediatamente con error de bloqueo (`state lock error`) sin corromper el estado.
- **Detección de Deriva (Drift):** Jobs periódicos con `terraform plan -detailed-exitcode`; si retorna código `2` sin cambios en Git, alerta de severidad alta por modificación manual fuera de banda.
- **Archivos Sensibles en Git:** El linter de CI debe bloquear commits que contengan archivos `*.tfstate`, `*.tfvars` con secretos o credenciales en texto plano.

## Procedimiento De Rollback Y Recuperación

1. **Reversión de Código:** Crear un Pull Request de reversión (`git revert <commit>`) para generar un plan de desmantelamiento controlado.
2. **Restauración de Estado (Disaster Recovery):** Si el estado remoto se corrompe, recuperar la versión previa del objeto en S3 / Blob Storage mediante el versionado inmutable del bucket.
3. **Desbloqueo de Emergencia (Force-Unlock):** Requiere autorización de dos ingenieros de plataforma y ticket formal de incidente: `terraform force-unlock <LOCK-ID>`.

## Evidencia Requerida Para Gates

- Log de ejecución de `tflint` y `checkov` con cero violaciones de severidad alta/crítica.
- Resumen del plan especulativo (`tfplan`) adjunto al PR con detalle de recursos a añadir/modificar/destruir.
- Identificador de commit Git inmutable asociado a la ejecución de `terraform apply`.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** En AWS, configurar S3 versionado con `use_lockfile = true` para bloqueo nativo de estado, reservando DynamoDB solo para migraciones legacy.
- ❌ **Incorrecto:** Declarar credenciales estáticas de proveedores cloud (`AWS_ACCESS_KEY_ID`, `ARM_CLIENT_SECRET`, etc.) en variables de CI/CD o en archivos de configuración.
- ✅ **Correcto:** Mantener los módulos reutilizables puros sin bloques `provider` ni bloques `backend` hardcodeados en su interior.
- ❌ **Incorrecto:** Comitear archivos `terraform.tfstate` en repositorios Git o ejecutar `terraform apply` directamente desde estaciones locales en producción.

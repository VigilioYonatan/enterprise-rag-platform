# Gestión De Estado Y Detección De Deriva (Drift)

Define las políticas de protección del estado remoto de Terraform y los mecanismos de detección y reconciliación de deriva de infraestructura.

## Arquitectura Del Backend De Estado Remoto

El estado remoto almacena la representación física de los recursos en la nube. Debe ser protegido con los más altos estándares de seguridad:

1. **Almacenamiento Cifrado en S3:** Con cifrado mediante clave administrada por el cliente (`aws_kms_key`), versionado de objetos activado y bloqueo de eliminación no autorizada (Object Lock / MFA Delete).
2. **Bloqueo Nativo de S3 (`use_lockfile = true`):** En Terraform >= 1.10, el backend S3 soporta bloqueo nativo concurrente mediante escrituras condicionales. Esto elimina la necesidad de aprovisionar y costear una tabla DynamoDB dedicada.
3. **Compatibilidad Legacy con DynamoDB:** La tabla DynamoDB con clave primaria `LockID` queda catalogada como mecanismo deprecado para nuevos stacks, manteniéndose exclusivamente como soporte temporal durante migraciones desde versiones antiguas de Terraform.
4. **Partición por Entorno y Stack:** Un archivo de estado por cada componente y entorno (`environments/prod/compute.tfstate`, `environments/prod/network.tfstate`), evitando monolitos frágiles donde un error corrompe toda la cuenta.

```text
S3 Bucket (Versioned + KMS SSE + use_lockfile)
├── env:/dev/
│   ├── network.tfstate
│   └── compute.tfstate
├── env:/staging/
│   ├── network.tfstate
│   └── compute.tfstate
└── env:/prod/
    ├── network.tfstate
    ├── compute.tfstate
    └── data.tfstate
```

## Prerrequisitos Operacionales

- Versión de Terraform >= 1.10.0 en runners y estaciones de trabajo.
- Política de bucket S3 con permisos para `s3:GetObject`, `s3:PutObject` y escrituras condicionales para el lockfile.
- Bucket S3 con versionado habilitado permanentemente (`Status = "Enabled"`).
- Para backends On-Premise basados en MinIO: probar y validar explícitamente el soporte del mecanismo de locking (`use_lockfile`); no asumirlo únicamente por compatibilidad de API S3 general.

## Detección Automática De Deriva (Drift Detection)

Para prevenir desalineaciones provocadas por modificaciones manuales en la consola de AWS o Azure:

- Se ejecuta un pipeline programado (cron nocturno o cada 4 horas) con `terraform plan -detailed-exitcode`.
- Si el código de salida es `2` (cambios detectados sin modificación de código fuente en Git), se emite una alerta de severidad alta a SRE y Security.

### Protocolo De Remediación Y Rollback

1. **Triage de Incidente:** Determinar si la deriva fue producto de una intervención humana autorizada de emergencia o una modificación no autorizada / compromiso de seguridad.
2. **Caso A (Hotfix de Emergencia Aprobado):** Se actualiza el código HCL en Git mediante un PR de alineación con ADR asociado y se aplica formalmente a través del pipeline.
3. **Caso B (Deriva No Autorizada):** Se programa un `terraform apply` automático o supervisado para revertir los recursos en la nube al estado canónico declarado en Git.
4. **Rollback de Estado Corrupto:** En caso de fallo catastrófico durante la escritura del estado, restaurar la versión anterior inmutable del objeto en S3 utilizando el historial de versiones del bucket.

## Pruebas Negativas

- **Acceso Directo al Estado:** Los linters y scanners de Git deben rechazar cualquier intento de commitear archivos `.tfstate` en el repositorio (riesgo crítico de fuga de secretos).
- **Simulación de Concurrencia:** Dos ejecuciones simultáneas de `terraform apply` con `use_lockfile = true` deben resultar en el bloqueo inmediato del segundo proceso sin colisión de escritura.

## Evidencia Requerida Para Auditoría

- Historial de versiones del objeto en S3 demostrando retención de cada estado previo.
- Reportes periódicos de Drift Detection con código de salida `0` (sin deriva).
- Registros de CloudTrail documentando accesos al bucket S3 del backend.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Configurar el backend S3 con `use_lockfile = true` y versionado activo, reservando DynamoDB solo para entornos legacy en migración.
- ❌ **Incorrecto:** Agrupar todos los recursos de una empresa en un único `terraform.tfstate` monolítico de miles de líneas o prescindir de versionado en el bucket.
- ✅ **Correcto:** Monitorear diariamente la deriva de infraestructura mediante pipelines automatizados y alertas a SRE.
- ❌ **Incorrecto:** Comitear archivos `terraform.tfstate` en repositorios Git o ignorar cambios manuales realizados directamente en la consola web cloud.

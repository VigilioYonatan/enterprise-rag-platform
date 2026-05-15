# Resiliencia, Continuidad Y Recuperación Ante Desastres (DR)

Establece las directrices para la continuidad de negocio, backups de estado de clúster, conmutación multirregión e ingeniería del caos en Kubernetes.

## Objetivos De Recuperación (RPO / RTO)

| Nivel de Criticidad | RPO (Pérdida Máxima de Datos) | RTO (Tiempo de Recuperación) | Estrategia de Arquitectura |
|---|---|---|---|
| Nivel 1 (Core Financiero / Pagos) | < 1 minuto | < 15 minutos | Multi-Región Activo-Activo con replicación global Aurora. |
| Nivel 2 (Servicios de Aplicación) | < 15 minutos | < 1 hora | Activo-Pasivo (Pilot Light) en región secundaria con ArgoCD. |
| Nivel 3 (Herramientas Internas) | < 24 horas | < 4 horas | Restauración completa desde backups fríos de Velero. |

## Respaldos Y Restauración Integral Con Velero

El estado del clúster (CRDs, ConfigMaps, Secrets, Workloads) y los datos de volúmenes persistentes se respaldan de forma programada con Velero:

```bash
# Backup programado diario de producción
velero schedule create daily-prod-backup \
  --schedule="0 2 * * *" \
  --include-namespaces production \
  --snapshot-volumes \
  --ttl 720h0m0s
```

- **Snapshots de CSI:** Velero interactúa con el driver CSI de EBS o Longhorn para tomar instantáneas consistentes de los volúmenes de datos.
- **Simulacros Periódicos (GameDays):** Cada trimestre se debe ejecutar una prueba de restauración completa en un clúster limpio para verificar que el RTO cumpla con el SLA.

## Pruebas De Resiliencia E Ingeniería Del Caos

Para garantizar que el sistema tolere fallos inesperados en producción:
- Inyección periódica de latencia de red y caídas aleatorias de pods con Chaos Mesh en entornos de staging.
- Verificación de que las políticas de retry con backoff exponencial y circuit breakers en NestJS y los microfrontends eviten fallos en cascada.

## Prerrequisitos De Ejecución

1. Velero CLI y servidor desplegado en namespace `velero` con plugin CSI de AWS/Longhorn activo.
2. Bucket de almacenamiento de respaldo en región secundaria o cuenta de auditoría aislada con cifrado KMS CMK y bloqueo de objetos (WORM/Object Lock).
3. Controlador Chaos Mesh instalado exclusivamente en namespaces de prueba y staging con RBAC estricto.
4. Procedimiento de simulacro GameDay documentado en runbooks versionados en Git.

## Matriz De Decisiones De Estrategia De Contingencia

| Criterio | Activo-Activo Multi-Región | Activo-Pasivo (Pilot Light) | Backup y Restauración en Frío |
|---|---|---|---|
| RPO / RTO | RPO < 1m / RTO < 15m | RPO < 15m / RTO < 1h | RPO < 24h / RTO < 4h |
| Coste de Infraestructura | Alto (duplicación activa de cómputo) | Medio (datos replicados, cómputo mínimo) | Bajo (solo almacenamiento de snapshots) |
| Complejidad de Red | Global Accelerator / Route53 ARC | Conmutación DNS controlada con TTL corto | Despliegue de nuevo clúster vía Terraform |
| Automatización | Replicación sincrónica bidireccional | Sincronización continua con ArgoCD/Velero | Restauración manual auditada vía Velero CLI |

## Procedimiento Operativo De Contingencia Y GameDays

1. **Programación de Respaldos:** Configurar `Schedule` de Velero con `snapshotVolumes: true` y retención de 30 días (`ttl: 720h`).
2. **Replicación Cruzada de Snapshots:** Configurar replicación de snapshots EBS hacia la región de contingencia (`eu-west-1` -> `eu-central-1`).
3. **Ejecución de Simulacro Trimestral (GameDay):**
   - Creación de clúster efímero de prueba en región secundaria.
   - Ejecución de `velero restore create --from-schedule daily-prod-backup`.
   - Medición cronométrica del RTO hasta que todos los endpoints responden `200 OK`.
4. **Inyección de Caos Programada:** Ejecutar experimentos `NetworkChaos` y `PodChaos` para validar auto-recuperación de pods sin intervención humana.

## Pruebas Negativas Y Detección De Fallos

- **Verificación de Aislamiento de Backups:** Intentar eliminar un snapshot de Velero desde el clúster de producción; la política de bucket en la cuenta de respaldo debe denegar la llamada `s3:DeleteObject`.
- **Fallo en Creación de Snapshots CSI:** Simular volumen persistente saturado; si Velero no puede generar snapshot consistente, debe emitir alerta Prometheus `VeleroBackupPartialFailure`.
- **Excedencia de Umbral RTO:** Si la restauración en el GameDay supera los 60 minutos, el gate de certificación de DR emite veredicto `FAIL` y requiere remediación de tamaño de volumen.

## Procedimiento De Rollback Y Recuperación

1. **Desmantelamiento de Experimento Caos:** En caso de impacto imprevisto durante una prueba con Chaos Mesh, ejecutar `kubectl delete -f chaos-experiment.yaml` para revertir inmediatamente las reglas iptables e inyecciones de fallo.
2. **Conmutación de Emergencia (Failover):** Si la región primaria sufre interrupción total, conmutar registros Route53 mediante AWS Application Recovery Controller (ARC) hacia la región pasiva.
3. **Reversión de Restauración Fallida:** Si un restore de Velero introduce inconsistencias en un clúster limpio, eliminar el namespace restaurado y reintentar desde el snapshot previo verificado.

## Evidencia Requerida Para Gates

- Manifiestos de `Schedule` de Velero confirmando `snapshotVolumes: true` y retención configurada.
- Reporte firmado de simulación GameDay certificando RPO < 15m y RTO < 1h con veredicto `VERIFIED`.
- Registro de auditoría de inyección Chaos Mesh sin degradación de SLAs de aplicación.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Automatizar backups diarios de metadatos de clúster y snapshots de volúmenes con Velero hacia una cuenta AWS o almacenamiento externo aislado.
- ❌ **Incorrecto:** Confiar únicamente en la durabilidad del disco EBS sin respaldos periódicos de la configuración ni pruebas de restauración.
- ✅ **Correcto:** Validar trimestralmente la capacidad de conmutación y restauración mediante ejercicios controlados de simulación de desastres.
- ❌ **Incorrecto:** Asumir que un backup es válido sin haber ejecutado jamás un procedimiento de restore verificado.

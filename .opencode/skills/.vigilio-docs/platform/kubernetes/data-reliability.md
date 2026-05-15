# Confiabilidad De Datos Y Cargas Stateful En Kubernetes

Regula la ejecución segura de bases de datos, colas persistentes y almacenamiento en clústeres Kubernetes mediante operadores declarativos.

## Cargas Con Estado Mediante Operadores Nativos

Para servicios de datos ejecutados dentro de Kubernetes (como en `prod-local` o en centros on-premise), se exige el uso de operadores maduros con capacidades de reconciliación de alta disponibilidad:

1. **CloudNativePG para PostgreSQL:**
   - Despliegue de clústeres primario-réplica con replicación por streaming síncrona/asíncrona.
   - Conmutación automática por error (failover) en menos de 10 segundos ante fallo del pod primario.
   - Archivado continuo de WAL (Write-Ahead Log) a buckets compatibles con S3 para recuperación en un punto del tiempo (PITR).
2. **Operador Valkey / Redis:**
   - Clúster con réplicas de lectura y centinelas de failover automático.
   - Persistencia AOF (Append-Only File) con sincronización periódica a disco.

## Ciclo De Vida Del Almacenamiento Persistente

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data-postgres-0
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ebs-gp3-sc
  resources:
    requests:
      storage: 50Gi
```

- **StorageClass Inmutable y Seguro:** Se debe emplear cifrado forzado (`encrypted: "true"`) y modo de expansión dinámica de volumen (`allowVolumeExpansion: true`).
- **Política de Retención (`reclaimPolicy`):** En producción debe ser `Retain` para asegurar que la eliminación accidental de un StatefulSet no destruya el disco físico subyacente.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Configurar operadores de bases de datos con archivado de transacciones WAL continuo hacia almacenamiento de objetos externo y durable.
- ❌ **Incorrecto:** Montar carpetas locales efímeras (`emptyDir`) para almacenar bases de datos transaccionales en producción.
- ✅ **Correcto:** Establecer la política de retención en `Retain` para todos los PersistentVolumes de entornos de staging y producción.
- ❌ **Incorrecto:** Usar `reclaimPolicy: Delete` en volúmenes de producción, arriesgando pérdida catastrófica de información ante recreaciones de pods.

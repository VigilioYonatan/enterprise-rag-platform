# Escalabilidad, Capacidad Y Autoscaling En Kubernetes

Establece las directrices técnicas para el escalado elástico de pods y nodos, dimensionamiento de recursos y presupuestos de disrupción en Kubernetes.

## Estrategia De Autoscaling Por Capas

```text
┌────────────────────────────────────────────────────────┐
│                   Escalado de Tráfico                  │
│       HPA (CPU/Memoria)  +  KEDA (Eventos / Colas)     │
└──────────────────────────┬─────────────────────────────┘
                           │ (Genera Pods Adicionales)
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Escalado de Nodos                    │
│      Karpenter (AWS) / Cluster Autoscaler (On-Prem)    │
└────────────────────────────────────────────────────────┘
```

1. **Escalado Basado en Eventos con KEDA:** Para servicios asíncronos y workers, el escalado no se basa únicamente en uso de CPU, sino en la profundidad real de la cola (mensajes pendientes en AWS SQS, streams de Valkey o tópicos de Kafka). Permite escalar a cero réplicas en inactividad.
2. **Aprovisionamiento Just-in-Time con Karpenter:** En AWS EKS, Karpenter evalúa las solicitudes de recursos de los pods pendientes y aprovisiona instancias EC2 óptimas en segundos, combinando instancias Spot y On-Demand con consolidación continua para reducir costes.
3. **Distribución Zonal (Topology Spread Constraints):**
   ```yaml
   topologySpreadConstraints:
     - maxSkew: 1
       topologyKey: topology.kubernetes.io/zone
       whenUnsatisfiable: DoNotSchedule
       labelSelector:
         matchLabels:
           app.kubernetes.io/name: payment-processor
   ```

## Dimensionamiento De Recursos Y Presupuestos De Disrupción

- **Requests vs Limits:** Toda aplicación debe definir `requests` de CPU y memoria basados en profiling real de carga. Para memoria, `limits` debe ser igual a `requests` para evitar OOMKill imprevistos en nodos sobresuscritos.
- **PodDisruptionBudget (PDB):** Se exige `minAvailable: 1` o `maxUnavailable: 25%` en todos los servicios de producción para garantizar que actualizaciones de nodos o drenados de mantenimiento no causen indisponibilidad de cara al cliente.

## Prerrequisitos De Ejecución

1. Metrics Server o Kube-State-Metrics desplegado y respondiendo métricas del clúster.
2. Operador KEDA instalado con CRDs `ScaledObject` y `TriggerAuthentication` funcionales.
3. Controlador Karpenter activo con permisos IAM para aprovisionar instancias EC2 just-in-time.
4. Profiling de carga de la aplicación completado para fijar requests de memoria y CPU.

## Matriz De Decisiones De Autoscaling

| Criterio | HorizontalPodAutoscaler (HPA) | KEDA ScaledObject | Karpenter NodePool |
|---|---|---|---|
| Métrica Fuente | CPU / Memoria nativa de pods | Longitud de cola SQS/Valkey, Kafka lag | Pods en estado Pending |
| Tipo de Carga | APIs HTTP / gRPC síncronas | Workers asíncronos y consumidores de colas | Nodos EC2 del clúster |
| Escala a Cero | No soportado por defecto | Totalmente soportado (`minReplicaCount: 0`) | Nodos se consolidan a 0 si están vacíos |
| Tiempo de Reacción | 15 - 30 segundos | 5 - 15 segundos | 30 - 60 segundos por nodo |

## Procedimiento De Configuración Y Validación

1. **Definición de Requests y Limits:** Establecer requests de memoria equivalentes al consumo en picos nominales y CPU dimensionada según throughput objetivo.
2. **Aplicación de TopologySpreadConstraints:** Incluir reglas de dispersión zonal con `maxSkew: 1` para asegurar tolerancia ante caída de una zona de disponibilidad entera.
3. **Despliegue de KEDA ScaledObject:** Configurar disparador de colas con umbral de mensajes por réplica (`queueLength: 30`) y cooldown calibrado para prevenir fluctuaciones bruscas (*flapping*).
4. **Protección de Disponibilidad:** Declarar `PodDisruptionBudget` en el mismo namespace asegurando que al menos 1 réplica permanezca viva durante evicciones.

## Pruebas Negativas Y Detección De Fallos

- **Prueba de Inyección de Carga Masiva:** Encolar 10,000 mensajes sintéticos en SQS; KEDA debe escalar réplicas de 2 a 20 en menos de 2 minutos y Karpenter debe aprovisionar nodos adicionales automáticamente.
- **Simulación de Caída de Zona (AZ Eviction):** Drenar todos los nodos de una zona; las réplicas en las zonas restantes deben absorber el tráfico sin violar el PDB.
- **Detección de Pods sin Requests:** Validación estática en CI mediante Kyverno/Conftest; cualquier Deployment sin bloque `resources.requests` es bloqueado en preflight.

## Procedimiento De Rollback Y Recuperación

1. **Fallo en Escalado KEDA:** Si el operador KEDA pierde conexión con AWS SQS, el HPA subyacente mantiene el último número de réplicas registrado para evitar caídas de throughput.
2. **Agotamiento de Capacidad Spot:** Si Karpenter no encuentra instancias Spot disponibles en la región, su política de fallback aprovisiona automáticamente instancias On-Demand.
3. **Reversión de Umbrales:** Si un cambio en `queueLength` provoca sobreescalado costoso, revertir el manifiesto vía GitOps (`git revert`) para restaurar el ritmo de escalado previo.

## Evidencia Requerida Para Gates

- Manifiestos de Deployment con `topologySpreadConstraints` y requests de recursos validados.
- Manifiesto de `PodDisruptionBudget` activo con `minAvailable >= 1` o `maxUnavailable <= 25%`.
- Salida de `kubectl get scaledobject` mostrando estado `Ready: True` y métricas de cola activas.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Configurar PodDisruptionBudgets y reglas de dispersión multizona para asegurar disponibilidad durante mantenimientos de clúster.
- ❌ **Incorrecto:** Desplegar servicios en producción sin requests de recursos definidos, provocando disputas descontroladas de CPU en los nodos.
- ✅ **Correcto:** Utilizar KEDA para escalar workers de acuerdo a la carga real de mensajes en colas SQS o Valkey.
- ❌ **Incorrecto:** Escalar procesadores de colas únicamente por uso de CPU cuando los workers pasan la mayor parte del tiempo en I/O bloqueante.

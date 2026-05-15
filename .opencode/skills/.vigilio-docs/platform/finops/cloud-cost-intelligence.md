# Inteligencia De Costos Cloud Y Prácticas FinOps

Establece las directrices de gobernanza financiera, asignación de costos, optimización de recursos y monitoreo continuo de gasto en la nube.

## Principios De Gobernanza FinOps

1. **Atribución Precisa del Gasto:** Cada recurso provisionado en AWS, Azure o Kubernetes debe incluir etiquetas obligatorias de metadatos:
   - `Owner`: Equipo responsable del recurso.
   - `Environment`: `dev`, `staging`, `prod` o `review`.
   - `CostCenter`: Código contable de la unidad de negocio.
   - `Project` o `Service`: Nombre canónico del microservicio.
2. **Visibilidad a Nivel de Pod con OpenCost:**
   En clústeres Kubernetes, se despliega OpenCost para calcular en tiempo real el costo exacto por namespace, deployment y solicitud de recursos (CPU, memoria, storage).

## Palancas Principales De Optimización

- **Adopción de Arquitectura ARM64 (AWS Graviton):** Las cargas de trabajo de NestJS, workers y microservicios se compilan para arquitecturas `linux/arm64`, obteniendo hasta un 20% de reducción de costes y un 40% de mejora en rendimiento frente a x86.
- **Orquestación de Nodos con Karpenter:** Consolidación automática de pods en menos instancias físicas y aprovechamiento inteligente de instancias Spot para workers asíncronos y cargas no críticas.
- **Optimización de Transferencia de Red y NAT Gateways:** El tráfico hacia S3, DynamoDB y servicios internos se enruta a través de VPC Gateway Endpoints gratuitos, eliminando el coste de procesamiento de datos por gigabyte en NAT Gateways.

## Prerrequisitos De Ejecución

1. Cuenta AWS con AWS Cost and Usage Report (CUR) configurado y Cost Allocation Tags activadas.
2. Agente OpenCost desplegado en los clústeres EKS con integración a Prometheus para métricas de CPU/RAM/EBS.
3. Imágenes de contenedor multiarquitectura (`linux/arm64` y `linux/amd64`) publicadas en Amazon ECR.
4. Políticas OPA / Kyverno en CI/CD para validar la presencia de etiquetas obligatorias antes del despliegue.

## Matriz De Decisiones De Optimización FinOps

| Criterio | Instancias On-Demand | Instancias Spot | Arquitectura ARM64 (Graviton) |
|---|---|---|---|
| Garantía de Disponibilidad | 100% SLA sin interrupción | Sujeto a reclaimed notice (2 min) | Idéntica a instancias x86 equivalentes |
| Ahorro Estimado | Tarifa base nominal | Hasta 70% - 90% vs On-Demand | Hasta 20% vs x86 de misma generación |
| Caso de Uso Principal | Bases de datos y StatefulSets | Workers asíncronos, CI/CD runners, batch | Microservicios NestJS, Go, Java, Python |
| Riesgo de Disrupción | Nulo | Medio (mitigado por Karpenter/PDB) | Nulo (si las imágenes están compiladas) |

## Procedimiento De Auditoría Y Optimización Continua

1. **Enforzamiento de Etiquetas en Terraform:** Declarar bloque `default_tags` a nivel de provider de AWS para imputar automáticamente todos los recursos creados.
2. **Configuración de Consolidación en Karpenter:** Habilitar `consolidationPolicy: WhenUnderutilized` en los NodePools para apagar automáticamente instancias con baja densidad de pods.
3. **Monitoreo con OpenCost y Grafana:** Configurar paneles ejecutivos que desglosen el gasto mensual por CostCenter y comparen costo real vs presupuestado.
4. **Alertas de Detección de Anomalías:** Activar AWS Cost Anomaly Detection con umbral de 10% de variación inesperada sobre la línea base histórica.

## Pruebas Negativas Y Detección De Fallos

- **Rechazo de Recursos sin Etiquetas:** Prueba estática en CI; un manifiesto de Terraform o Kubernetes sin etiqueta `CostCenter` debe fallar el linter con salida de error explicativa.
- **Detección de Nodos Sobredimensionados:** Regla periódica en OpenCost que alerte de nodos con utilización de CPU menor al 20% durante más de 24 horas continuas.
- **Fuga de Tráfico por NAT Gateway:** Verificación de métricas de CloudWatch en NAT Gateways; picos anómalos de bytes procesados hacia S3 disparan alerta para redirigir vía Gateway Endpoint.

## Procedimiento De Rollback Y Recuperación

1. **Incompatibilidad ARM64 en Runtime:** Si un binario o dependencia nativa falla en ARM64, modificar el selector de arquitectura en Karpenter a `values: ["amd64"]` y redesplegar el servicio en x86.
2. **Interrupción Masiva de Instancias Spot:** Si una tormenta de interrupciones Spot impacta la capacidad, forzar temporalmente `capacity-type: ["on-demand"]` en el NodePool mediante parche GitOps.
3. **Sobrecosto No Previsto:** Revisar el informe diario de OpenCost, aislar el namespace responsable y aplicar cuotas de recursos (`ResourceQuota`) para contener el gasto.

## Evidencia Requerida Para Gates

- Reporte de validación de etiquetas con 100% de cumplimiento en recursos Terraform y manifiestos de Kubernetes.
- Manifiestos de NodePool verificando soporte de arquitectura `arm64` y política de consolidación activa.
- Dashboard de OpenCost operativo reportando métricas de costo por pod al colector central.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Implementar políticas OPA en el pipeline de Terraform que rechacen la creación de recursos que carezcan de las etiquetas obligatorias de FinOps.
- ❌ **Incorrecto:** Dejar recursos en la nube sin etiquetar o aprovisionar instancias sobredimensionadas con baja utilización sostenida (< 10% CPU).
- ✅ **Correcto:** Establecer alertas de detección de anomalías de costos mediante AWS Cost Anomaly Detection con notificación automática a los leads técnicos.
- ❌ **Incorrecto:** Enterarse de un gasto imprevisto o fuga de recursos semanas después al recibir la factura mensual consolidada.

# AWS FinOps: costo por capacidad y entorno

Medir costo por servicio, ambiente, operación y producto; incluir infraestructura compartida, logs/traces y retención en el costo. Comparar alternativas EKS, Lambda, ECS y workloads serverless según carga, no por moda. Revisar estimaciones frente a facturas reales.

- Presupuestos/alertas/forecast y dueños de costo; etiquetado de recursos, límites de scale y retención.
- Observabilidad económica: tasa de logs, cardinalidad, sampling de traces, tamaño de artifacts, storage.
- Spot/reservas/savings plans solo tras medir perfiles de carga y riesgo operativo.
- Carga de inferencia/embeddings incluye tokens/latencia/caché/RAG, no solo costo CPU.

✅ Correcto: FinOps gate compara costo por request antes y después y alerta cambios sostenidos.

❌ Incorrecto: elegir arquitectura por precio nominal sin sumar disponibilidad, observabilidad, DB y egress.

[Operación SRE](../sre/operations.md) · [referencia histórica](references/10-optimizacion-costos-recursos-aws.md).

## Procedencia documental preservada

- [Capítulo heredado: 10-optimizacion-costos-recursos-aws.md](references/10-optimizacion-costos-recursos-aws.md) — contenido íntegro conservado.
- [Capítulo heredado: 30-learn-aws-finops.md](references/30-learn-aws-finops.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


## FinOps cloud — control de ejecución

Los siguientes controles son escenarios de diseño y revisión específicos de este documento. Usar pruebas reales y evidencias del consumidor; aquí **no** se afirma haber desplegado infraestructura.

1. **Control 1:** Asignar etiquetas de centro de coste, owner y entorno a todos los recursos facturables.
2. **Control 2:** Separar coste fijo, variable, datos/egress, logs y retenciones por producto.
3. **Control 3:** Medir coste por solicitud, tenant o feature cuando la atribución sea fiable.
4. **Control 4:** Definir presupuestos, alertas de anomalías y responsables de aprobación.
5. **Control 5:** Probar límites de concurrencia que protejan DB y gasto ante bursts.
6. **Control 6:** Usar clases de almacenamiento y políticas de lifecycle según RTO/RPO y compliance.
7. **Control 7:** Revisar costes de observabilidad y alta cardinalidad antes de habilitar traces masivas.
8. **Control 8:** Registrar evaluación coste/latencia de serverless vs contenedor con carga realista.
9. **Control 9:** Probar apagado de entornos efímeros sin borrar datos críticos.
10. **Control 10:** Revisar ahorro como cambio medible sin comprometer SLO ni seguridad.

✅ **Correcto:** ejecutar cada control pertinente, registrar owner, evidencia y decisión de aceptación.

❌ **Incorrecto:** confundir un checklist con un despliegue probado o borrar restricciones anteriores por resumir.

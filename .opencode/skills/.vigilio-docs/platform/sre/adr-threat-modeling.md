# ADR, threat models y decisiones humanas

Los ADR documentan decisiones, alternativas y consecuencias, con estado y fecha. No reescribir ADR históricos como si nunca hubiesen existido; decisiones nuevas referencian las anteriores, crean nuevos registros y contemplan migración. Threat modeling identifica activos, actores, límites de confianza y amenazas.

✅ Correcto: una decisión que cambia EKS por Lambda crea ADR nuevo y actualiza baseline/skills compatibles después de aprobación.

❌ Incorrecto: editar decisiones antiguas para aparentar consenso o modificar `software-factory/` sin evidencia de decisión humana.

Los archivos históricos `adr/` y `threat-model/` permanecen normativos según su propio ciclo de vida. [Índice ADR](../../adr/README.md).

## Procedencia documental preservada

- [Capítulo heredado: 18-adr-threat-model.md](references/18-adr-threat-model.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **SLI y SLO:** Definir señales de usuarios y umbrales antes de ajustar alertas.
2. **Incidentes:** Documentar severidad, owner, mitigación, comunicaciones y postmortem sin culpa.
3. **Capacidad:** Comprobar carga, autoscaling, colas y agotamiento de recursos.
4. **Backup restaurable:** Ensayar restore con RPO/RTO medidos, no solo copias exitosas.
5. **Auditabilidad:** Guardar permisos, decisiones y evidencias con retención explícita.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Decisiones y amenazas vinculadas

Los siguientes controles son escenarios de diseño y revisión específicos de este documento. Usar pruebas reales y evidencias del consumidor; aquí **no** se afirma haber desplegado infraestructura.

1. **Control 1:** Identificar activos, actores y límites de confianza antes de seleccionar contramedidas.
2. **Control 2:** Anotar flujos HTTP, colas, DB y almacenamiento con fronteras de tenant/ACL.
3. **Control 3:** Registrar amenaza, severidad, consecuencia y dueño de mitigación.
4. **Control 4:** Referenciar ADR vigente sin reescribir decisiones históricas.
5. **Control 5:** Probar bypass de autorización, exposición de datos y acceso de servicio a recurso indebido.
6. **Control 6:** Inspeccionar secretos, logs, backups y artefactos de CI como posibles exfiltraciones.
7. **Control 7:** Trazar mitigación a tests automáticos y a control operacional.
8. **Control 8:** Aceptar riesgo residual solo con aprobación explícita y caducidad.
9. **Control 9:** Actualizar threat model por cambio de arquitectura, autenticación o proveedor.
10. **Control 10:** Diferenciar prueba realizada de control propuesto en informe de salida.

✅ **Correcto:** ejecutar cada control pertinente, registrar owner, evidencia y decisión de aceptación.

❌ **Incorrecto:** confundir un checklist con un despliegue probado o borrar restricciones anteriores por resumir.

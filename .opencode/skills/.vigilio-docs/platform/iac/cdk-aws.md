# CDK y AWS IaC: aplicación por runtime, no por lenguaje

En Vigilio se pueden utilizar Terraform/OpenTofu para EKS y CDK en aplicaciones Lambda **solo según baseline explícito**. Infrastructure as Code debe permitir revisión de cambios, identidad mínima, cifrado, pruebas y drift detection. No mezclar CDK y Terraform como dos dueños del mismo recurso.

✅ Correcto: plan/diff revisado, roles OIDC, alertas y rollback antes del deploy; estado remoto y locks seguros.

❌ Incorrecto: credenciales largas en workflows, CDK que administra recursos ya declarados en Terraform, deploy sin revisar IAM.

[Guía genérica](terraform-cdk.md) · [Runtime AWS](../aws/lambda-operations.md).

## Procedencia documental preservada

- [Capítulo heredado: 25-cdk-iac-aws.md](references/25-cdk-iac-aws.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Plan reproducible:** Ejecutar plan con estado bloqueado, variables validadas y cambios revisados.
2. **Menor privilegio:** Asegurar roles específicos y secretos externos al estado/historial.
3. **Drift y ownership:** Comprobar drift, importaciones y único dueño por recurso cloud.
4. **Entorno seguro:** Separar cuentas/estados, y controlar destroy protegido según criticidad.
5. **Evidencia:** Registrar plan aplicado, revisión, pruebas de infraestructura y rollback.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Infraestructura AWS CDK — gate reproducible

Los siguientes controles son escenarios de diseño y revisión específicos de este documento. Usar pruebas reales y evidencias del consumidor; aquí **no** se afirma haber desplegado infraestructura.

1. **Control 1:** Versionar stacks, stacks de entorno y parámetros sin hardcodear secretos.
2. **Control 2:** Usar constructos mínimos y revisar el template sintetizado antes de despliegue.
3. **Control 3:** Comparar `diff` con el entorno objetivo y revisión humana de recursos destructivos.
4. **Control 4:** Restringir rol de ejecución y bootstrap trust a cuentas/entornos necesarios.
5. **Control 5:** Definir policy de eliminación y retención para datos persistentes y buckets.
6. **Control 6:** Comprobar Tags de propietario, coste, entorno y clasificación de datos.
7. **Control 7:** Probar creación/redeploy idempotente en entorno efímero aprobado.
8. **Control 8:** Preparar rollback y restauración de datos antes de migraciones destructivas.
9. **Control 9:** Verificar alarmas, logs, cuotas y permisos después del deploy.
10. **Control 10:** Publicar resumen de coste y seguridad asociado a revisión del template.

✅ **Correcto:** ejecutar cada control pertinente, registrar owner, evidencia y decisión de aceptación.

❌ **Incorrecto:** confundir un checklist con un despliegue probado o borrar restricciones anteriores por resumir.

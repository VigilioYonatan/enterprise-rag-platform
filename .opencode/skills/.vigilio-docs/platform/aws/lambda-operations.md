# AWS Lambda para backends Vigilio: perfil de runtime optativo

No todo NestJS ejecuta Lambda: esta guía solo aplica a consumidores cuyo baseline decide Lambda/API Gateway/EventBridge/SQS. CDK y Lambda Web Adapter requieren selección expresa y compatibilidad probada. Arquitectura de casos de uso y Zod es compartida con EKS.

- Cold start, tiempo límite y memoria medidos bajo carga real; SDK client reutilizado cuidadosamente.
- Conexiones a PostgreSQL limitadas y acceso controlado (pool/RDS Proxy cuando procede).
- IAM mínimo por función, Secrets Manager/SSM, cifrado, tracing y costo por invocación.
- Idempotencia/reintentos de SQS; DLQ y límites de concurrencia reservada.
- CI/CD: artifact pinneado, despliegue gradual, alarmas y rollback.

✅ Correcto: prueba timeout, memoria, costo/request y reintentos antes de elegir Lambda.

❌ Incorrecto: obligar a cada NestJS a utilizar CDK/Lambda, abrir una conexión DB nueva sin control por invocación.

[Runtime común](../cloud/runtime-options.md) y [finops](finops.md).

## Procedencia documental preservada

- [Capítulo heredado: 8-bootstrap-http-workers.md](../../stacks/backend/nestjs/runtime/references/8-bootstrap-http-workers.md) — contenido íntegro conservado.
- [Capítulo heredado: 10-optimizacion-costos-recursos-aws.md](references/10-optimizacion-costos-recursos-aws.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).


## Operación Lambda y resiliencia

Los siguientes controles son escenarios de diseño y revisión específicos de este documento. Usar pruebas reales y evidencias del consumidor; aquí **no** se afirma haber desplegado infraestructura.

1. **Control 1:** Definir timeout de handler menor que el timeout externo y client retries.
2. **Control 2:** Dimensionar concurrencia reservada y downstream DB pools con prueba de carga.
3. **Control 3:** Evitar bootstrap pesado por invocación y medir cold start con datos reales.
4. **Control 4:** Gestionar eventos duplicados mediante idempotency key y persistencia duradera.
5. **Control 5:** Configurar DLQ/destino de fallos y redrive con política documentada.
6. **Control 6:** Propagar trace-id y correlation-id; redactar PII en CloudWatch.
7. **Control 7:** Restringir IAM, subredes, endpoints y acceso a secretos según función.
8. **Control 8:** Verificar tamaños de payload, memoria y errores de serialización.
9. **Control 9:** Probar tiempo de apagado, reintentos, timeouts y fallo de DB/queue.
10. **Control 10:** Alertar por throttling, errors, duration, cost e invocaciones anómalas.

✅ **Correcto:** ejecutar cada control pertinente, registrar owner, evidencia y decisión de aceptación.

❌ **Incorrecto:** confundir un checklist con un despliegue probado o borrar restricciones anteriores por resumir.

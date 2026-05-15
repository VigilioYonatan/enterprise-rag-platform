# Integración Amazon Bedrock sin acoplar el dominio

Usar un port de inferencia/aplicación para desacoplar proveedor y modelo. Requests deben aplicar authz/ACL, límites de tokens/presupuesto, redacción PII, política de herramientas e idempotencia en operaciones con efectos. RAG no debe inventar citas ni ignorar ACL por documento.

✅ Correcto: prompts/templates versionados, tool permissions por usuario, budget guardrail y traces con identificadores no sensibles.

❌ Incorrecto: pasar secretos y datos completos del usuario al modelo sin necesidad, permitir tool calls de escritura sin confirmación/permisos.

Registrar costo por solicitud, errores/throttling, tasa de alucinaciones y regresiones de calidad. [AI standards](../../standards/ai/README.md).

## Procedencia documental preservada

- [Capítulo heredado: 31-ai-chat-bedrock-ddd.md](../../stacks/backend/nestjs/ai/references/31-ai-chat-bedrock-ddd.md) — contenido íntegro conservado.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Identidad y permisos:** Verificar roles/condiciones por recurso; negar acceso cross-tenant y evitar claves estáticas.
2. **Disponibilidad:** Diseñar límites de retry, timeout y degradación; ejecutar test con dependencia caída.
3. **Coste:** Definir tags, presupuestos, capacidad y alertas antes de desplegar.
4. **Observabilidad:** Propagar trazas, error budget, retención y acceso a logs.
5. **Seguridad de datos:** Encriptar, limitar buckets, expirar URLs firmadas y auditar acceso según servicio.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Integración de generación — límites y seguridad

Los siguientes controles son escenarios de diseño y revisión específicos de este documento. Usar pruebas reales y evidencias del consumidor; aquí **no** se afirma haber desplegado infraestructura.

1. **Control 1:** Autorizar la invocación según usuario/tenant y capacidad de negocio; el cliente no elige privilegios.
2. **Control 2:** Usar credenciales de servicio con permisos mínimos, sin claves incrustadas.
3. **Control 3:** Definir modelo y región según residencia de datos y política de riesgo aprobada.
4. **Control 4:** Presupuestar tokens, retries y concurrencia antes de llamar al proveedor.
5. **Control 5:** Configurar timeout y estrategia de fallback sin reintentar prompts no idempotentes ciegamente.
6. **Control 6:** Rechazar contenido de contexto con instrucciones hostiles y filtrar documentos por ACL antes del prompt.
7. **Control 7:** Agregar etiquetas mínimas para tracing y FinOps sin registrar el texto completo sensible.
8. **Control 8:** Medir groundedness y abstención al usar RAG, no solo sintaxis de respuesta.
9. **Control 9:** Verificar 429, 5xx, coste inesperado, contexto vacío y revocación de permiso.
10. **Control 10:** Registrar matriz de evaluación de calidad y rollback cuando cambie modelo o prompt.

✅ **Correcto:** ejecutar cada control pertinente, registrar owner, evidencia y decisión de aceptación.

❌ **Incorrecto:** confundir un checklist con un despliegue probado o borrar restricciones anteriores por resumir.

# 09 · Agentes, tools y workflows

**Hacer**
- Empezar con RAG determinista; incorporar agentes solo si la tarea necesita pasos condicionales, planificación o tools.
- Preferir workflows explícitos para procesos reglados (aprobaciones, pagos, cambios críticos).
- Mantener herramientas **tipadas** y estrechas (`searchPolicies`, `getOrder`, `createDraft`) con validación de entrada/salida.
- Autorizar en **cada ejecución de tool**, no solo en el prompt inicial.
- Implementar límites de pasos, tokens, costo, duración, tasa y acciones por sesión.
- Solicitar confirmación humana antes de enviar, borrar, transferir, comprar o cambiar privilegios.
- Trazar decisiones, llamadas y resultados; ofrecer replay controlado/idempotencia donde sea posible.
- Aplicar el principio del mínimo privilegio a integraciones, MCP y conectores.

**No hacer**
- Dar shell/SQL arbitrarios o credenciales maestras a un agente.
- Reintentar una acción con efectos laterales sin clave de idempotencia.
- Diseñar multiagentes cuando una máquina de estados resolvería mejor el problema.
- Confiar en la respuesta de una tool como instrucción de mayor prioridad.

## Patrón de tool con efectos laterales

✅ **Correcto:** `approvePolicy(policyId)` valida identidad, permisos y estado **en servidor**; exige confirmación del usuario cuando corresponda y usa una clave idempotente antes de registrar el cambio. El workflow mantiene pasos, límites y auditoría propios.

❌ **Incorrecto:** exponer `executeSql(sql)` o `runShell(command)` sin restricciones y confiar en «solo ejecuta comandos seguros» dentro del system prompt.

```text
Solicitud de acción
→ validar schema de argumentos
→ autenticar actor y autorizar recurso
→ verificar cuota/presupuesto + confirmación cuando sea necesaria
→ idempotencia → ejecutar adaptador acotado
→ auditar resultado sin secretos
```

**Prueba requerida:** llamada repetida con mismo `idempotency_key`, intento de actor sin permiso, inyección en contenido recuperado y tool timeout. Nunca tratar el texto obtenido por RAG como instrucción superior.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Corpus y permisos:** Auditar fuentes, chunk lineage, tenant y ACL; comprobar revocación y respuestas sin evidencia.
2. **Evaluación independiente:** Medir retrieval, grounding, seguridad, coste, latencia y drift en dataset reproducible.
3. **Límite de coste:** Instrumentar presupuestos bajo concurrencia y registrar proveedor/modelo sin almacenar PII.
4. **Respuesta segura:** Abstenerse o escalar cuando faltan citas, hay prompt injection o herramientas requieren aprobación.
5. **Operación:** Exigir canary, rollback, rate limit, reindexación y runbook según criticidad.
6. **Matriz:** Aplicar los 32 controles específicos de calidad RAG según el riesgo.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Cuándo sumar Agentic RAG / LangGraph

El criterio compartido está en [selección de arquitectura](../../foundations/ai/seleccion-arquitectura-2026.md). [LangGraph](../../technology/libraries/langgraph.md) aporta orquestación/persistencia si el caso necesita bucles acotados, checkpoint y aprobación. **No** es sinónimo de GraphRAG ni licencia para aumentar privilegios.

✅ **Correcto:** `searchKnowledge()` puede iterar dentro de límites de tiempo/pasos con ACL en **cada búsqueda**, y se abstiene cuando no tiene evidencia suficiente.

❌ **Incorrecto:** permitir `searchEverything()` sin actor/tenant, loops ilimitados, tools de SQL/shell arbitrarios o reintentos de cambios irreversibles sin idempotencia.

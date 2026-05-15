# Plataforma IA de referencia

- [Esquema PostgreSQL (referencia, SIN ACL de documento)](postgresql/schema-rag.sql)
- [Política FinOps declarativa (NO ejecuta límites)](finops/politica-ejemplo.yaml)
- [Evento de telemetría ficticio](telemetry/evento-ejemplo.json)
- [Estándares IA](../../standards/ai/README.md)

No desplegar estas muestras como infraestructura productiva. Necesitan migraciones versionadas, ACL, testing de seguridad, enforcement y runbooks.

## Límites de las muestras y adopción segura

✅ **Correcto:** ejecutar las muestras en un entorno aislado; añadir migraciones versionadas, roles SQL sin privilegios para pruebas, ACL por documento, aislamiento por tenant y test de reserva presupuestaria concurrente antes de promover cambios.

❌ **Incorrecto:** aplicar `schema-rag.sql` directamente en producción interpretándolo como una solución completa de RLS/ACL, o asumir que `politica-ejemplo.yaml` detiene solicitudes por sí sola.

**Gate de plataforma:** evidencias de aislamiento entre dos usuarios del mismo tenant, restauración comprobada y prueba de gasto simultáneo bajo el límite configurado.

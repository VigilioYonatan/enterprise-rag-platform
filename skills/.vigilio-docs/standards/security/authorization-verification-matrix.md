# Autorización y aislamiento — matriz de amenazas y comprobaciones

Esta referencia es compartida por los stacks. **No** reemplaza autorizadores, interceptores ni código específico de cada framework. Baseline: [versiones](../../technology/versions.md). Las prácticas se seleccionan por amenaza y no se aplican de manera ciega.

## Identidad y sesión

1. **Issuer/audience:** Validar emisor, audiencia y firma antes de autorizar; rechazar token de otro entorno. **Evidencia:** caso negativo o medición reproducible vinculada al control.
2. **Expiración:** Probar acceso segundos antes y después del vencimiento con reloj determinista. **Evidencia:** caso negativo o medición reproducible vinculada al control.
3. **Revocación:** Eliminar sesión/token y verificar denegación en siguiente request y conexión en tiempo real. **Evidencia:** caso negativo o medición reproducible vinculada al control.
4. **Confusión de token:** No aceptar token de refresh como access ni credenciales de servicio como usuario. **Evidencia:** caso negativo o medición reproducible vinculada al control.
5. **Sesión anónima:** Denegar lectura sensible sin cookies ni header, incluso si recurso tiene identificador público. **Evidencia:** caso negativo o medición reproducible vinculada al control.
6. **CSRF según canal:** Verificar protección en auth basada en cookies y no asumirla resuelta por CORS. **Evidencia:** caso negativo o medición reproducible vinculada al control.
7. **Rate limits por actor:** Probar burst y recuperación sin bloquear otros tenants. **Evidencia:** caso negativo o medición reproducible vinculada al control.
8. **Privilegios de servicio:** Separar tokens máquina de roles interactivos con scopes mínimos. **Evidencia:** caso negativo o medición reproducible vinculada al control.

## Acceso por objeto y negocio

9. **IDOR de lectura:** Consultar objeto existente de otro actor: no devolver payload ni metadatos. **Evidencia:** caso negativo o medición reproducible vinculada al control.
10. **IDOR de escritura:** Probar modificación/archivo/anulación de objeto sin derecho: no cambiar DB ni emitir evento. **Evidencia:** caso negativo o medición reproducible vinculada al control.
11. **Multi-tenant:** Derivar tenant del contexto autorizado, no de query/body ni header controlado por usuario. **Evidencia:** caso negativo o medición reproducible vinculada al control.
12. **ACL de documento:** Aplicar usuario/documento/acción antes de retrieval y de generación de respuesta. **Evidencia:** caso negativo o medición reproducible vinculada al control.
13. **Revocación de compartir:** Tras retirar permiso, invalidar caché/materialización accesible y denegar vistas previas. **Evidencia:** caso negativo o medición reproducible vinculada al control.
14. **Permisos jerárquicos:** Probar miembro, administrador, owner y actor externo con mismas rutas. **Evidencia:** caso negativo o medición reproducible vinculada al control.
15. **Enlace firmado:** Expirar URL y limitar método/bucket/objeto; probar manipulación y reuse indebido. **Evidencia:** caso negativo o medición reproducible vinculada al control.
16. **Bulk actions:** Autorizar cada objeto de operación múltiple, no solo colección o primera fila. **Evidencia:** caso negativo o medición reproducible vinculada al control.

## Almacenamiento, caché y mensajería

17. **Query scoping:** Filtrar tenant/ACL dentro de repository, antes de ordenar, paginar y cachear. **Evidencia:** caso negativo o medición reproducible vinculada al control.
18. **Clave caché:** Incluir versión de permiso cuando cache depende de autorización; probar cross-actor. **Evidencia:** caso negativo o medición reproducible vinculada al control.
19. **Cache tras revocación:** Probar hit previo, cambio de policy y lectura siguiente: denegación inmediata según SLA. **Evidencia:** caso negativo o medición reproducible vinculada al control.
20. **Jobs diferidos:** Autorización del productor y validación de contexto al consumir cuando regla lo requiera. **Evidencia:** caso negativo o medición reproducible vinculada al control.
21. **Outbox seguro:** Evitar PII en eventos, probar no emisión tras rollback. **Evidencia:** caso negativo o medición reproducible vinculada al control.
22. **Vector/RAG:** Filtrar metadata de documento y ACL antes de enviar chunk al generador. **Evidencia:** caso negativo o medición reproducible vinculada al control.
23. **Logs:** No emitir JWT, cookies, teléfono o cuerpos sensibles por defecto. **Evidencia:** caso negativo o medición reproducible vinculada al control.
24. **Backups:** Restringir exportación/restauración y acceso a snapshots igual que datos vivos. **Evidencia:** caso negativo o medición reproducible vinculada al control.

## Verificación operativa y fallo

25. **Política deny-by-default:** Policy error, timeout o permiso desconocido deben rechazar operación segura. **Evidencia:** caso negativo o medición reproducible vinculada al control.
26. **Errores 401/403/404:** Mantener contrato sin revelar existencia a actor no autorizado. **Evidencia:** caso negativo o medición reproducible vinculada al control.
27. **Abuso de concurrencia:** Probar revocación mientras hay requests, transacciones y reintentos. **Evidencia:** caso negativo o medición reproducible vinculada al control.
28. **Auditoría:** Registrar actor, acción, decisión y recurso saneado para investigación. **Evidencia:** caso negativo o medición reproducible vinculada al control.
29. **Pruebas adversariales:** Probar límites y combinaciones de rol/tenant/recurso, no solo happy path. **Evidencia:** caso negativo o medición reproducible vinculada al control.
30. **Revisión manual:** Validar threat model y cambios de permisos con segundo responsable. **Evidencia:** caso negativo o medición reproducible vinculada al control.
31. **Evidencia:** Adjuntar logs de tests y matriz de accesos; declarar NOT_RUN cuando falte DB real. **Evidencia:** caso negativo o medición reproducible vinculada al control.
32. **Respuesta incidentes:** Tener procedimiento de revocación masiva, auditoría y notificación según exposición. **Evidencia:** caso negativo o medición reproducible vinculada al control.

## Gate de salida

Aplicar las **32 comprobaciones** pertinentes al riesgo, y justificar las no aplicables.

✅ **Correcto:** pruebas y métricas respaldan el estado reportado.

❌ **Incorrecto:** reutilizar la misma lista sin evaluar el modelo de amenazas o presentar un checklist sin ejecución como certificación.

# Testing E2E — 56 controles verificables sin recortes

> **Referencia canónica actualizada:** [40 comprobaciones de cambios DDD + SQL](semantic-ddd-contract-gates.md). Los fragmentos anteriores conservados tienen valor de procedencia; adoptar esta guía para nuevos cambios.

Esta es una **norma compartida**, independiente de framework. Aplica el criterio *completo sin atajos*: cubrir riesgos importantes y no fabricar un número fijo. Los 56 controles siguientes son un **catálogo de referencia**, no 56 tests obligatorios para cada proyecto; seleccionar por criticidad y justificar exclusiones.

**Alcance:** flujo de usuario o API observable cruzando capas; pruebas unitarias, integración y contrato siguen siendo necesarias. **Fuente de versiones:** [versiones centralizadas](../../technology/versions.md). **Fuente de diseño de pruebas:** [estrategia](strategy.md).

**Evidencia externa:** [Playwright Best Practices](https://playwright.dev/docs/best-practices), [NestJS Testing](https://docs.nestjs.com/fundamentals/testing), [OWASP WSTG](https://owasp.org/projects/web-security-testing-guide). Son referencias conceptuales, no afirmaciones de tests ejecutados en este repositorio.


## Estrategia, alcance y trazabilidad

1. **Mapear recorridos críticos.** **Qué y por qué:** Priorizar operaciones con pérdida económica, privacidad o disponibilidad; vincular cada recorrido a requisito y dueño. **Cómo comprobarlo:** la matriz enlaza caso, historia, riesgo y prueba automatizada.
2. **Definir límites del E2E.** **Qué y por qué:** Reservar E2E para integración observable entre capas; dejar combinatorias puras en unit/integration. **Cómo comprobarlo:** cada E2E tiene una dependencia real no verificable por unit.
3. **Separar smoke, regresión y exploración.** **Qué y por qué:** Ejecutar smoke en cada release, regresión por riesgo y exploración para anomalías nuevas. **Cómo comprobarlo:** existe regla de selección y evidencia por etapa.
4. **Cubrir transiciones de estado.** **Qué y por qué:** Probar pendiente→procesado, bloqueo de estados inválidos y reintentos. **Cómo comprobarlo:** la transición ilegal produce error de dominio y no persiste cambios.
5. **Probar error y recuperación.** **Qué y por qué:** Además del camino feliz, verificar credenciales expiradas, dependencias degradadas y reintentos seguros. **Cómo comprobarlo:** el sistema retorna códigos/estado coherentes y recupera.
6. **Definir oráculo independiente.** **Qué y por qué:** Comparar resultados contra invariantes o contratos, no contra la misma función que implementa el comportamiento. **Cómo comprobarlo:** una implementación defectuosa provoca una aserción roja.
7. **Asignar responsable y criticidad.** **Qué y por qué:** Etiquetar cada prueba por módulo, operación y nivel de riesgo para priorizar triage. **Cómo comprobarlo:** una falla se puede asignar a un owner sin adivinar.
8. **Revisar cobertura por cambio.** **Qué y por qué:** Relacionar diff de API/permisos con casos existentes y añadir escenarios faltantes antes del merge. **Cómo comprobarlo:** PR documenta impacto positivo y negativo.

## Datos, entornos y aislamiento

9. **Fixture mínimo por prueba.** **Qué y por qué:** Crear únicamente datos necesarios con identificadores únicos; evitar fixtures globales mutables. **Cómo comprobarlo:** la prueba ejecuta sola y en paralelo sin colisiones.
10. **Restablecer estado.** **Qué y por qué:** Hacer cleanup por transacción, namespace o entorno efímero según sistema; no borrar recursos ajenos. **Cómo comprobarlo:** no quedan registros ni colas contaminadas tras terminar.
11. **Semilla determinista.** **Qué y por qué:** Controlar reloj, UUID, moneda, zonas horarias y generadores cuando afectan expectativas. **Cómo comprobarlo:** repetir con la misma seed produce mismo resultado.
12. **Separar credenciales y secretos.** **Qué y por qué:** Usar cuentas de prueba aisladas y secretos del CI, nunca contraseñas embebidas o de producción. **Cómo comprobarlo:** escaneo y artefactos no exponen credenciales.
13. **Entorno representativo.** **Qué y por qué:** Probar DB, colas y configuración equivalentes en comportamiento a producción para riesgos de integración. **Cómo comprobarlo:** se documentan diferencias del entorno y su impacto.
14. **Esperar inicialización real.** **Qué y por qué:** Comprobar readiness y esquema aplicado antes de iniciar suite; no dormir segundos arbitrarios. **Cómo comprobarlo:** suite arranca únicamente cuando servicios responden.
15. **Aislar consumidores externos.** **Qué y por qué:** Usar sandbox/contract tests para pagos, email o terceros; separar pruebas de extremo externo bajo etiqueta. **Cómo comprobarlo:** fallos de terceros no bloquean toda la PR.
16. **Evitar dependencia entre tests.** **Qué y por qué:** No exigir que el test B sea posterior a A para preparar datos. **Cómo comprobarlo:** orden aleatorio y paralelismo conservan PASS.

## Autenticación, autorización y privacidad

17. **Sin sesión.** **Qué y por qué:** Exigir 401 para recursos protegidos sin credenciales. **Cómo comprobarlo:** cada endpoint restringido tiene caso anónimo.
18. **Permiso insuficiente.** **Qué y por qué:** Probar 403 aunque el usuario sí esté autenticado. **Cómo comprobarlo:** el rol sin permiso no puede mutar ni leer.
19. **Tenant cruzado.** **Qué y por qué:** Intentar leer/editar un objeto de otra organización por identificador válido. **Cómo comprobarlo:** denegación y ausencia de fuga de existencia/datos.
20. **Permisos a nivel documento.** **Qué y por qué:** Probar ACL compartido, revocado y propietario, no solo tenant_id. **Cómo comprobarlo:** revocación surte efecto incluso con caché.
21. **Tokens expirados.** **Qué y por qué:** Rechazar JWT o sesiones revocadas/expiradas sin reactivar acceso. **Cómo comprobarlo:** el flujo regresa a autenticación con código esperado.
22. **Exposición de campos.** **Qué y por qué:** Inspeccionar JSON, logs, trazas y mensajes para detectar PII y atributos internos. **Cómo comprobarlo:** los secretos no aparecen en ninguna salida.
23. **Entrada hostil.** **Qué y por qué:** Probar parámetros mal tipados, payload excesivo y valores inesperados sin tocar producción. **Cómo comprobarlo:** 4xx controlado y ningún cambio de estado.
24. **Borrado y retención.** **Qué y por qué:** Validar reglas de eliminación, soft-delete y acceso posterior según el contrato. **Cómo comprobarlo:** recurso retirado no reaparece en listados ni caché.

## Contratos, consistencia y concurrencia

25. **Validar HTTP observable.** **Qué y por qué:** Comprobar códigos, headers y estructura definida en OpenAPI y cuerpo, no solo que exista respuesta. **Cómo comprobarlo:** schema y payload corresponden.
26. **Paginación y orden.** **Qué y por qué:** Verificar primera/última página, limit inválido, orden estable y next/previous. **Cómo comprobarlo:** no hay duplicados ni huecos por empate de sort.
27. **Idempotencia.** **Qué y por qué:** Enviar dos veces operación con misma clave y confirmar un único efecto. **Cómo comprobarlo:** una sola mutación/evento/pago.
28. **Concurrencia.** **Qué y por qué:** Lanzar dos solicitudes simultáneas sobre un mismo agregado. **Cómo comprobarlo:** constraint/versión impide doble transición.
29. **Rollback y atomicidad.** **Qué y por qué:** Provocar error al final de una transacción y comprobar inexistencia de efectos parciales. **Cómo comprobarlo:** DB y eventos reflejan estado coherente.
30. **Outbox y reentrega.** **Qué y por qué:** Asegurar publish después de commit y procesado seguro ante redelivery. **Cómo comprobarlo:** no hay evento fantasma ni doble efecto.
31. **Caché observable.** **Qué y por qué:** Ejecutar lectura→mutación→lectura y revisar coherencia de permisos/caché. **Cómo comprobarlo:** se ve dato nuevo sin invalidación global peligrosa.
32. **Fallos por timeout.** **Qué y por qué:** Simular timeout de dependencia y reconexión. **Cómo comprobarlo:** el resultado cumple política de retry/circuit breaker.

## Interfaz web, accesibilidad y compatibilidad

33. **Locators semánticos.** **Qué y por qué:** Elegir roles, labels y nombres accesibles antes que CSS frágil. **Cómo comprobarlo:** selector continúa estable ante cambios visuales.
34. **Sin sleeps fijos.** **Qué y por qué:** Usar condiciones observables y auto-wait, no temporizadores arbitrarios. **Cómo comprobarlo:** CI lento no produce flakiness.
35. **Accesibilidad navegable.** **Qué y por qué:** Probar foco visible, tabulación, validación por lector y mensajes de error. **Cómo comprobarlo:** recorrido básico se completa sin mouse.
36. **Responsive y orientación.** **Qué y por qué:** Probar tamaños críticos y estados scroll/layout donde exista requisito. **Cómo comprobarlo:** controles utilizables sin desbordamiento.
37. **Idiomas, fechas y moneda.** **Qué y por qué:** Cambiar locale y timezone en casos representativos. **Cómo comprobarlo:** texto, hora y valores correctos.
38. **Deep-links y navegación.** **Qué y por qué:** Entrar por URL directa con y sin sesión, navegar atrás y refrescar. **Cómo comprobarlo:** rutas no pierden estado ni acceso.
39. **Actualizaciones asíncronas.** **Qué y por qué:** Esperar estados de carga/error/vacío y verificar transiciones visibles. **Cómo comprobarlo:** la UI no queda bloqueada tras fallo de red.
40. **Compatibilidad de navegador.** **Qué y por qué:** Usar matriz por público objetivo, no probar 10 engines sin justificativo. **Cómo comprobarlo:** todas las plataformas soportadas corren smoke.

## Fiabilidad, diagnóstico y anti-flakiness

41. **Trazas diagnósticas.** **Qué y por qué:** Adjuntar trace, capturas y respuesta HTTP saneados solo al fallar. **Cómo comprobarlo:** se puede reproducir sin exponer tokens.
42. **Reproducibilidad.** **Qué y por qué:** Guardar seed, commit, entorno, config y nombres de fixtures. **Cómo comprobarlo:** fallo es reproducible en entorno equivalente.
43. **Reintentos explícitos.** **Qué y por qué:** Limitar retries para flakiness transitoria; una retry verde no borra el fallo inicial. **Cómo comprobarlo:** métrica reporta primer fallo y flaky rate.
44. **Presupuesto de timeouts.** **Qué y por qué:** Definir timeout por expectativa y servicio según SLO medido. **Cómo comprobarlo:** timeouts no se amplían para ocultar regresiones.
45. **Sin snapshots masivos.** **Qué y por qué:** Preferir aserciones semánticas; snapshots para contratos visuales/versionados. **Cómo comprobarlo:** diff tiene significado y revisión.
46. **Errores de red.** **Qué y por qué:** Inyectar desconexión, 429 y 503 en escenarios representativos. **Cómo comprobarlo:** cliente usa backoff/feedback sin duplicar mutación.
47. **Observabilidad correlacionada.** **Qué y por qué:** Relacionar prueba, request-id y trace-id en trazas de backend. **Cómo comprobarlo:** triage llega de la UI al servicio responsable.
48. **Cuarentena con vencimiento.** **Qué y por qué:** Aislar únicamente casos flakey conocidos con ticket, owner y fecha límite. **Cómo comprobarlo:** no existe skip permanente sin control.

## CI, cobertura y operación

49. **Gate de PR por riesgo.** **Qué y por qué:** Ejecutar smoke/E2E crítico en PR y casos costosos de forma planificada. **Cómo comprobarlo:** política y jobs están publicados.
50. **Paralelismo seguro.** **Qué y por qué:** Particionar por tests independientes con datos por worker. **Cómo comprobarlo:** sharding no cambia resultado respecto a secuencial.
51. **Matriz coste/valor.** **Qué y por qué:** Elegir browsers/dispositivos representativos en vez de producto cartesiano indiscriminado. **Cómo comprobarlo:** tiempo y costo de CI se miden.
52. **Reportes útiles.** **Qué y por qué:** Informar passed, failed, skipped, flaky y cuarentena por categoría. **Cómo comprobarlo:** no se confunde skipped con PASS.
53. **Bloqueo de release.** **Qué y por qué:** Fallar despliegue si escenarios de seguridad/compra críticos fallan. **Cómo comprobarlo:** rollback y responsables están definidos.
54. **Artefactos con retención.** **Qué y por qué:** Limitar acceso, sanitizar y borrar traces/snapshots según política. **Cómo comprobarlo:** política de retención pasa auditoría.
55. **Tendencia y mantenimiento.** **Qué y por qué:** Medir duración, defectos escapados, tasa flaky y tests obsoletos. **Cómo comprobarlo:** dueños revisan métricas cada ciclo.
56. **Evidencia honesta.** **Qué y por qué:** Clasificar PASS, FAIL, BLOCKED y NOT_RUN sin atribuir ejecución ficticia. **Cómo comprobarlo:** cada PASS enlaza a comando/log/entorno.

## Criterios de salida, ejemplo ✅ / ❌

✅ **Correcto:** el PR declara recorridos cubiertos, riesgos no aplicables, fixtures aislados, capturas/trazas saneadas y evidencia `PASS` por runner real; al fallar un control P0, el gate del release se bloquea.

❌ **Incorrecto:** presentar tres ejemplos (`login`, `checkout`, `logout`) como estrategia E2E completa; ocultar skips con reintentos infinitos; usar cuentas compartidas de producción; declarar `PASS` tras leer solamente los Markdown.

**Gate de aplicación:** para cada control pertinente registrar `requisito/amenaza → escenario → capa → evidencia → PASS|FAIL|NOT_RUN|BLOCKED`. La falta de infraestructura es `NOT_RUN` o `BLOCKED`, no un verde. Adaptar por stack sin copiar aquí APIs concretas.

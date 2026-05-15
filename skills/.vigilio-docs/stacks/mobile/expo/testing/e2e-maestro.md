# Mobile Expo — E2E de navegación nativa, permisos y red

**Propietario:** aplicaciones móviles modulares Expo/React Native, **no** microfrontends web. Normas comunes: [E2E compartido](../../../../standards/testing/e2e-quality-gates.md); compatibilidad de SDK/módulos: [versiones centralizadas](../../../../technology/versions.md).

## Flujo ilustrativo de Maestro (dentro de Markdown)

```yaml
appId: com.example.vigilio
---
- launchApp
- assertVisible: "Iniciar sesión"
```

`appId` y etiquetas deben sustituirse por los del consumidor. Maestro necesita un emulador/dispositivo y build compatible; este documento no afirma ejecución real.

## 20 controles específicos

1. Probar primer arranque con instalación limpia y permisos sin conceder.
2. Probar restauración de sesión solo desde almacenamiento seguro apropiado.
3. Denegar permisos de cámara/archivos y verificar alternativa accesible.
4. Aceptar permisos y volver a la app sin pérdida del flujo.
5. Navegar desde deep link válido y uno inválido sin saltarse autorización.
6. Probar push abierto con usuario correcto y con sesión revocada.
7. Simular offline, reintento de sincronización y recuperación sin duplicar mutaciones.
8. Validar expiración/refresh del token sin bucle de login.
9. Comprobar detección de tenant cambiado y purga de datos locales autorizada.
10. Validar loading, vacío, error y cancelación en pantallas de negocio.
11. Ejecutar teclado, accesibilidad, lector de pantalla y tamaño dinámico de texto.
12. Probar orientación, safe areas y acciones cerca del borde inferior.
13. Verificar compatibilidad app nativa↔backend y cambio de contrato.
14. Distinguir EAS OTA de cambio nativo que requiere binary nuevo.
15. Probar esquema/versión local al actualizar desde release anterior.
16. Capturar crash/trace sin tokens ni contenido de campos sensibles.
17. Aislar fixtures por cuenta y resetear estado del emulador.
18. Incluir dispositivos representativos por OS y capacidades usadas, no matriz inflada.
19. Asegurar cleanup de permisos, app data y sesiones entre suites.
20. Registrar build nativo, OS, device, backend y flakiness para diagnóstico.

✅ **Correcto:** un flujo prueba integración con sistema operativo, APIs, sesión y condiciones de red. ❌ **Incorrecto:** equiparar un unit test de componente con E2E nativo o declarar OTA seguro sin verificar compatibilidad binaria.

## Receta de prueba nativa reproducible

**Precondiciones:** build nativo identificable (no solo bundle JS), simulator/dispositivo compatible, identificador real de app, backend aislado con datos de prueba, permisos restablecibles y cuenta autorizada. No suponer que una OTA corrige una dependencia nativa incompatible.

### Caso básico de navegación con Maestro

```yaml
# Contenido de un flujo mostrado dentro de Markdown; no se genera archivo .yaml.
appId: com.example.vigilio
---
- launchApp
- assertVisible: "Iniciar sesión"
- tapOn: "Iniciar sesión"
- assertVisible: "Correo electrónico"
```

**Validación:** `appId`, controles visibles y navegación deben corresponder al binario concreto; el flujo no se ha ejecutado contra un dispositivo del usuario.

### Matriz de dispositivos, permisos y fallos

| Escenario | Estado inicial | Evento a provocar | Resultado aceptable |
|---|---|---|---|
| Instalación limpia | Sin storage | Lanzamiento | Inicio sin crash |
| Sesión caducada | Token expirado | Abrir detalle | Acceso bloqueado |
| Cámara/archivos | Sin permiso | Denegar | Alternativa accesible |
| Cambio de tenant | Datos locales previos | Cambiar actor | Cache segregada |
| Deep link | Sesión anónima | Abrir URL protegida | Login antes de ver datos |
| Push | Permiso revocado | Abrir notificación | Reautorización |
| Offline | Mutación pendiente | Cortar red | Cola idempotente / error explícito |
| Cambio de binario | Datos locales antiguos | Actualizar app | Migración sin corrupción |
| OTA | Build antiguo | Recibir actualización | Compatibilidad native/JS validada |
| Accesibilidad | Fuente grande | Navegar formularios | Sin corte de controles |

### Control de ejecución

1. Preparar fixture usuario/tenant único y resetear permisos/almacenamiento por suite.
2. Ejecutar en al menos las plataformas oficialmente soportadas, con prioridades por riesgo.
3. Repetir offline→online y comprobar que no se dupliquen operaciones de negocio.
4. Comparar API Resource y contrato vigente con app en versión anterior cuando corresponda.
5. Capturar crash/trace y logs sin tokens ni PII; vincularlos a versión del binario y device.
6. Distinguir test con simulador, dispositivo físico y unit test de componentes.
7. Registrar `PASS|FAIL|NOT_RUN|BLOCKED` y no declarar OTA lista sin gate nativo.

✅ **Correcto:** pruebas de permisos, ciclo de vida, red y actualización por dispositivo con evidencia. ❌ **Incorrecto:** tres clicks automatizados como certificación de seguridad, sincronización y OTA.

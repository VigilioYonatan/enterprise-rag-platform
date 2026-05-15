# Arquitectura de información, navegación y flujos

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Modelos mentales, tareas, escenarios alternos, errores y recuperación..

## Decisiones arquitectónicas y de producto

1. Identificar entidades conceptuales, lenguaje del usuario y acciones frecuentes. 2. Diferenciar navegación global, contextual, búsqueda, filtrado y breadcrumbs según profundidad y plataforma. 3. Trazar flujos de éxito, carga, vacíos, permiso denegado, pérdida de conexión, reintento, conflicto y deshacer. 4. Describir precondición, resultado observable y estado de cada pantalla y transición. 5. Minimizar pasos sin ocultar decisiones financieras críticas ni eliminar feedback.

## Contrato implementable / ejemplo verificable

```text
Contexto → Descubrimiento → Acción → Confirmación → Resultado → Recuperación
Transferir dinero → Destinatario → Importe → Revisión → Confirmación → Recibo
                                       ↘ Error saldo ↗   ↘ Reintento idempotente
```

Para navegación de juegos incluir menú principal → selección → pausa → reanudación → ajustes → guardar/salir, verificando foco al volver desde un modal. El mapa no implica que todas esas escenas existan todavía.

## Testing, revisión y criterios de aceptación

- [ ] Cada tarea crítica tiene flujo y rutas de error/cancelación.
- [ ] Verificar que usuarios encuentran funciones por nomenclatura, no por iconos ambiguos.
- [ ] Debe existir salida segura de modales y recuperación tras interrupción.
- [ ] Test de navegación teclado/táctil/mando según plataforma.

## Anti-patrones y riesgos

- Hacer navegación por los nombres de tablas de base de datos.
- Interrumpir tareas por banners automáticos no solicitados.
- Varios `back` con comportamiento divergente.



## Referencias oficiales y fuentes canónicas

- [Guía UX/UI transversal](README.md)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Hacer navegación por los nombres de tablas de base de datos.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Agrupar funciones por estructura del backend y no por usuario
- **❌ Incorrecto**: Agrupar funciones por estructura del backend y no por usuario.
- **✅ Correcto**: IA basada en tareas, frecuencia, mental model y vocabulario.

### 02. Esconder confirmación de retiro debajo de modal ambiguo
- **❌ Incorrecto**: Esconder confirmación de retiro debajo de modal ambiguo.
- **✅ Correcto**: Flujo revisión -> autenticación -> confirmación -> recibo inequívoco.

### 03. Diseñar solo happy path de onboarding
- **❌ Incorrecto**: Diseñar solo happy path de onboarding.
- **✅ Correcto**: Añadir offline, denegación, credenciales caducadas, recuperación y cancelación.

### 04. Usar misma navegación para gamepad y web
- **❌ Incorrecto**: Usar misma navegación para gamepad y web.
- **✅ Correcto**: Mapear foco espacial en juegos y tabs/historial en web/desktop.

### 05. No contemplar back/undo con cambios destructivos
- **❌ Incorrecto**: No contemplar back/undo con cambios destructivos.
- **✅ Correcto**: Definir reversibilidad y control del usuario por paso.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

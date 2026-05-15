# Arquitectura de componentes y estados interactivos

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Componentes reutilizables que preservan semántica, estados y ownership..

## Decisiones arquitectónicas y de producto

1. Clasificar componentes: primitivas accesibles, compuestos y patrones de dominio; evitar componentes «universales» de 40 boolean props. 2. Definir props/eventos, estados (idle, hover, focus, pressed, loading, success, error, disabled, empty), size/variant y slots según plataforma. 3. Mantener lógica de dominio fuera del botón; delegar a acciones/casos de uso con manejo de errores. 4. Para confirmaciones destructivas, exigir intención explícita y feedback. 5. Nombres del componente por intención (`TransferReview`, `InventorySlot`, `AppToolbar`) y tokens semánticos, no colores o forma (`BlueBigButton`).

## Contrato implementable / ejemplo verificable

```text
Button: id, label, semantic_role, kind, enabled, busy, on_activate
  estados: idle / keyboard_focus / pressed / loading / disabled
  entrada: pointer + keyboard (+ gamepad en Godot/desktop)
  salida: action event + aria/status feedback o accesibilidad nativa
```

Un botón de juego de reintento NO comparte lógica con aprobar una transferencia. Puede compartir primitivas visuales, pero posee confirmación y permiso distintos.

## Testing, revisión y criterios de aceptación

- [ ] Test unit de estado para cada transición y async completion.
- [ ] Test de teclado/mando/táctil en plataforma destino.
- [ ] Disabled es explicable si el usuario debe comprender el bloqueo.
- [ ] Un componente no inicia efectos de red por render ni pierde foco tras loading.

## Anti-patrones y riesgos

- `Button` que ejecuta SQL/HTTP internamente.
- Identidades/keys inestables que reinician animaciones/estado.
- `onClick` único sin semántica accesible en aplicaciones web.



## Referencias oficiales y fuentes canónicas

- [Guía UX/UI transversal](README.md)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** `Button` que ejecuta SQL/HTTP internamente.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Componente Button solo soporta default y disabled
- **❌ Incorrecto**: Componente Button solo soporta default y disabled.
- **✅ Correcto**: Diseñar hover/focus/pressed/loading/success/error según plataforma.

### 02. Duplicar lógica de autorización dentro de componente visual
- **❌ Incorrecto**: Duplicar lógica de autorización dentro de componente visual.
- **✅ Correcto**: UI recibe capacidad permitida; servidor valida autorización real.

### 03. Crear un componente universal con 60 props
- **❌ Incorrecto**: Crear un componente universal con 60 props.
- **✅ Correcto**: Componer variantes pequeñas y responsabilidades verificables.

### 04. Permitir doble tap en confirmar pago
- **❌ Incorrecto**: Permitir doble tap en confirmar pago.
- **✅ Correcto**: Estado de operación con idempotencia backend y feedback claro.

### 05. Exponer estilos locales como API estable sin revisión
- **❌ Incorrecto**: Exponer estilos locales como API estable sin revisión.
- **✅ Correcto**: Contratos de component props, tokens y casos de accesibilidad.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

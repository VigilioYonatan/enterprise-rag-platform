# UX writing, formularios, localización y confianza

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Microcopy claro, errores accionables y experiencia confiable en escenarios sensibles..

## Decisiones arquitectónicas y de producto

1. Una pantalla debe usar vocabulario del usuario: labels y acciones semánticas, no nombres de infraestructura. 2. Errores indican qué sucedió, implicación y siguiente paso seguro, sin filtrar datos secretos. 3. Formularios: etiquetas visibles, ayuda contextual, validación en momento útil, preservación de entradas, autocompletado permitido y accesibilidad. 4. Soportar pluralización, números monetarios como decimal, fechas/zonas horarias, formatos locales y textos extensos. 5. En fintech, evitar dark patterns, confirmar importes/destinatarios, usar recibos y reconciliación; no confiar en frontend como autoridad de pagos.

## Contrato implementable / ejemplo verificable

```text
MALO: "Algo salió mal".
MEJOR: "No se completó la transferencia. No se descontó el saldo.
         Revisa la conexión y vuelve a intentarlo. Código de referencia: ..."
```

El texto «No se descontó» solo es válido cuando el backend y su semántica transaccional aportan esa garantía. De lo contrario informar estado **pendiente de confirmación** y cómo consultarlo.

## Testing, revisión y criterios de aceptación

- [ ] Probar errores reales (HTTP, desconexión, timeout, validación, permisos).
- [ ] Comprobar formato de dinero, unidades y redondeo con fixtures.
- [ ] Etiquetas/autocompletado y anuncio de errores verificables.
- [ ] Traducibilidad, expansión de texto y RTL cuando sea objetivo.

## Anti-patrones y riesgos

- Alertas vagas o culpabilizantes.
- Toast verde como único recibo financiero.
- Hacer retry de una operación monetaria sin idempotencia.



## Referencias oficiales y fuentes canónicas

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Diseño REST](../api/rest-endpoint-design.md)
- [Seguridad de autorización](../security/authorization.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Alertas vagas o culpabilizantes.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Mostrar montos en string concatenado con decimal fijo
- **❌ Incorrecto**: Mostrar montos en string concatenado con decimal fijo.
- **✅ Correcto**: Intl/localización, moneda, precisión y contexto.

### 02. Etiquetar botón «Continuar» cuando debita dinero
- **❌ Incorrecto**: Etiquetar botón «Continuar» cuando debita dinero.
- **✅ Correcto**: Acción explícita «Confirmar transferencia» y revisión previa.

### 03. Formularios sin preservar datos tras error servidor
- **❌ Incorrecto**: Formularios sin preservar datos tras error servidor.
- **✅ Correcto**: Recuperación, mensajes inline y posición de foco adecuada.

### 04. Traducir literalmente texto que desborda controles
- **❌ Incorrecto**: Traducir literalmente texto que desborda controles.
- **✅ Correcto**: Diseño expandible y QA de idiomas reales.

### 05. Usar dark pattern para ocultar cancelar suscripción
- **❌ Incorrecto**: Usar dark pattern para ocultar cancelar suscripción.
- **✅ Correcto**: Consentimiento claro, opt-out y acciones reversibles.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

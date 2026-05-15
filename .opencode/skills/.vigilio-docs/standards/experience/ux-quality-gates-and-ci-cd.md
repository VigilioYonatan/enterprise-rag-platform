# QA de diseño, accesibilidad y CI/CD sin falsos PASS

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Pruebas estáticas, automatizadas, visuales, manuales y design review con evidencia..

## Decisiones arquitectónicas y de producto

1. CI de diseño valida tokens (nombres, hex, duplicados semánticos, pares contrastables), enlaces de Docs, lint y tests de componente; no pretende sustituir test de lector de pantalla ni playtesting. 2. PR: revisión de tokens y component states, lint, a11y automatizada donde hay DOM, snapshots estables y E2E de flujos afectados. 3. Nightly: matrices responsive, navegadores/dispositivos/mando, rendimiento y preferencias (dark, alto contraste, reduced motion). 4. Release: golden flows por plataforma y review manual sign-off para alto riesgo; screenshots siempre comparadas con baseline aprobado y tolerancias conocidas. 5. Ausencia de pruebas obligatorias o cero tests descubiertos debe bloquear; accesibilidad a medias no se certifica por un scanner.

## Contrato implementable / ejemplo verificable

**Pipeline objetivo**:
```text
lint tokens → unit/component → keyboard/focus → responsive/visual → E2E
                   ↘ pruebas negativas (contraste roto, alias ausente)
       → release sign-off: usabilidad crítica + plataforma real
```

Ejemplo incorporado: `vigilio-skills/assets/templates/consumers/uxui/` contiene validator + fixtures PASS/FAIL y workflow opcional de CI. El consumidor debe enlazarlo con sus tokens reales y activar required checks en el hosting.

## Testing, revisión y criterios de aceptación

- [ ] Falla un token inválido, contraste insuficiente y referencia inexistente.
- [ ] CI no declara `PASS` cuando runner gráfico, hardware o usuario están ausentes.
- [ ] Snapshot aprobado solo después de revisión humana de cambio intencional.
- [ ] Reportar `NOT_RUN` para screen reader/manual test no ejecutado.

## Anti-patrones y riesgos

- Snapshots que se autoactualizan en CI y silencian regresiones.
- Falso 10/10 automático basado en contraste de solo dos colores.
- Lighthouse único como prueba de UX de un juego.



## Referencias oficiales y fuentes canónicas

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [CI y review](../engineering/change-impact-and-review-gates.md)
- [Guía UX/UI transversal](README.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Snapshots que se autoactualizan en CI y silencian regresiones.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Validar solo tokens de ejemplo empaquetados
- **❌ Incorrecto**: Validar solo tokens de ejemplo empaquetados.
- **✅ Correcto**: Hacer que CI descubra tokens reales del consumidor y falle si faltan.

### 02. Usar screenshot pixel-perfect como única prueba
- **❌ Incorrecto**: Usar screenshot pixel-perfect como única prueba.
- **✅ Correcto**: Complementar visual diff con semántica, interacciones, accesibilidad y contenido.

### 03. Marcar VoiceOver PASS tras ejecutar axe web
- **❌ Incorrecto**: Marcar VoiceOver PASS tras ejecutar axe web.
- **✅ Correcto**: Prueba manual con screen reader nativo queda independiente.

### 04. Permitir gate E2E sin tests descubiertos
- **❌ Incorrecto**: Permitir gate E2E sin tests descubiertos.
- **✅ Correcto**: Contar tests ejecutados y reportar BLOCKED/FAIL si no hay obligatorios.

### 05. Declarar diseño original por no encontrar coincidencia automática
- **❌ Incorrecto**: Declarar diseño original por no encontrar coincidencia automática.
- **✅ Correcto**: Revisar referencias, licensing y diferenciación de producto por humanos.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

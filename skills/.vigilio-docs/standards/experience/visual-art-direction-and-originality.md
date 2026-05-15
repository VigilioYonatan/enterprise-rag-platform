# Dirección de arte original y coherencia de marca

**Estado:** norma vigente, no certificación de implementación. **Owner:** `standards/experience/`. **Alcance:** Sistemas visuales distintivos sin plagio, plantillas genéricas ni pérdida de usabilidad..

## Decisiones arquitectónicas y de producto

1. Obtener atributos de marca: serio/juguetón, técnico/humano, competitivo/calmo, densidad, cultura, referencias permitidas y restricciones legales. 2. Crear **2–3 hipótesis visuales diferentes** antes de decidir; evaluar jerarquía, legibilidad, credibilidad, originalidad y presupuesto. 3. Construir firma visual propia: escala tipográfica, ritmo espacial, bordes, iconos, geometría, estados, motion y tratamiento editorial. 4. Referencias externas sirven para identificar principios, nunca para clonar layouts, assets, identidad ni código protegido. 5. Para videojuegos derivar UI del mundo narrativo sin esconder affordances ni focos accesibles.

## Contrato implementable / ejemplo verificable

**Dirección A fintech**: tipografía tabular para cifras + contraste contenido/contexto + confirmaciones sobrias; **Dirección B herramienta de dev**: densidad elevada + atajos + jerarquía monocromática; **Dirección C aventura 2D**: señales diegéticas, formas orgánicas, pausa legible. En cada caso documentar *qué lo hace propio* y lo que NO se reutiliza de referencias.

Ficha: intención visual → usuarios → 3 propiedades observables → tokens → decisiones de componentes → exclusiones → evidencia de pruebas.

## Testing, revisión y criterios de aceptación

- [ ] Identidad diferenciable en comparación ciega con plantilla estándar; valoración humana obligatoria.
- [ ] Legibilidad, jerarquía y accesibilidad se verifican antes de estética subjetiva.
- [ ] Activos visuales poseen procedencia/licencia y atribución si aplica.
- [ ] No se declara «único» por cambiar tres colores.

## Anti-patrones y riesgos

- Gradientes, glassmorphism o sombras como solución automática.
- Diseño idéntico para salud, fintech y plataformas arcade.
- Usar logotipos, capturas o iconos ajenos sin permiso.



## Referencias oficiales y fuentes canónicas

- [Guía UX/UI transversal](README.md)
- [Figma variables](https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma)
- [Política de privacidad](../security/secrets-and-privacy.md)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Gradientes, glassmorphism o sombras como solución automática.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Pedir «dashboard moderno» y copiar tarjetas degradadas azules
- **❌ Incorrecto**: Pedir «dashboard moderno» y copiar tarjetas degradadas azules.
- **✅ Correcto**: Construir tres direcciones artísticas ligadas a personalidad, tareas y marca.

### 02. Usar tipografía display decorativa en cifras financieras
- **❌ Incorrecto**: Usar tipografía display decorativa en cifras financieras.
- **✅ Correcto**: Jerarquía de importes con tabular nums y legibilidad.

### 03. Usar paleta de tendencias sin verificar contraste ni cultura
- **❌ Incorrecto**: Usar paleta de tendencias sin verificar contraste ni cultura.
- **✅ Correcto**: Tokens semánticos con contraste y asociaciones contextuales evaluadas.

### 04. Imitar screenshot Dribbble ignorando densidad del producto
- **❌ Incorrecto**: Imitar screenshot Dribbble ignorando densidad del producto.
- **✅ Correcto**: Rediseñar contenido y flujos para casos reales, no copiar composición.

### 05. Añadir efectos visuales a cada pantalla para «premium»
- **❌ Incorrecto**: Añadir efectos visuales a cada pantalla para «premium».
- **✅ Correcto**: Motion intencional según feedback y preferencia de reducción.


## Ejemplo implementable y revisión del riesgo
### Test de originalidad orientado al producto

Antes de codificar, producir tres variantes **realmente diferentes**, no recoloraciones: (A) producto de operatorio denso y sobrio, (B) exploración editorial y contenido, (C) producto lúdico y movimiento. Para cada variante, registrar identidad, voz, jerarquía, semántica del color, accesibilidad y por qué resuelve el caso de uso. Rechazar cualquier propuesta basada solamente en «mismo dashboard con otros gradientes». No aprobar originalidad ni licencia únicamente por ausencia de coincidencias automáticas.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

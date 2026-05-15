# Blueprints UX/UI personalizados por producto: web, móvil, desktop y videojuegos

**Owner:** experiencia transversal de Vigilio. **Estado:** procedimientos de diseño, no certificación de productos finales.

## Contrato de diseño para Auto-Senior

Cuando el usuario dice «quiero una app fintech», «quiero un juego», «quiero hacer un login» o «mejora mi UI», Auto-Senior debe primero descubrir qué tarea, persona, pantalla y plataforma están involucradas. Si hay repositorio, inspeccionar convenciones y decisiones existentes antes de proponer cambios. Si aún no hay proyecto, proponer 2–3 direcciones viables y recomendar una con criterios explícitos. Solo hacer preguntas si una decisión irreversible o de negocio no puede inferirse.

**Brief mínimo y evidencia:** identidad y tono; tarea primaria; frecuencia; impacto del error; métodos de entrada (mouse/teclado/touch/gamepad); accesibilidad; texto y localización; rendimiento objetivo; imágenes/iconos/licencias; diferencias competitivas; criterios de aceptación. Distinguir siempre `PROPOSED`, `IMPLEMENTED`, `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`.

**No copiar plantillas comunes:** un «dashboard con tres tarjetas, gradiente violeta y sidebar» no es identidad de producto; es una estructura común que debe justificarse frente a las tareas reales. No transferir una UI de Godot a React, ni usar CSS/DOM donde la plataforma necesita Controles nativos. Una identidad puede compartir tipografía y lenguaje de marca entre productos, pero los patrones de interacción siguen siendo específicos.

## Dieciséis diseños realmente diferentes

### 01 · Fintech desktop — mesa de operaciones

- **Situación:** Operador financiero con cientos de transacciones diarias; errores de conciliación tienen coste alto.
- **Dirección de arte e identidad:** Denso pero silencioso; números tabulares, severidad sobria, foco en trazabilidad. En vez de card-wall, lista de operaciones y panel contextual de evidencias.
- **Componentes y estados propios:** Búsqueda y filtros, tabla virtualizada, detalle de transacción, confirmación con resumen monto/moneda/cuenta, estado pending, rechazo y recibo auditable.
- **Accesibilidad e interacción:** Teclado prioritario, lector de pantalla sobre tablas, escalado DPI, formato monetario local, mensaje y foco tras error.
- **Optimización y QA:** Tasa de conciliación correcta, doble submit = 0, navegación sin ratón, latencia p95 de filtros y tabla, recuperación de fallo.
- **Rechazar:** Inspirarse en banca retail móvil con tarjetas enormes en cada celda.

### 02 · Fintech móvil — transferir dinero

- **Situación:** Usuario ocasional en una conexión inestable y entorno público.
- **Dirección de arte e identidad:** Claridad/seguridad sin intimidación: una acción principal por paso, importes visibles y lenguaje directo, imágenes decorativas mínimas.
- **Componentes y estados propios:** Elegir contacto, ingresar monto, revisar comisiones y beneficiario, autenticar según riesgo, confirmar, recibo, reintento idempotente con estado.
- **Accesibilidad e interacción:** Tamaño táctil nativo, teclado numérico apropiado, safe area, Dynamic Type, VoiceOver/TalkBack, aviso de privacidad en notificaciones.
- **Optimización y QA:** Tarea de transferir completada sin error, abandono, reintentos seguros y evaluación con lectores de pantalla reales.
- **Rechazar:** Ocultar comisión en pie de pantalla o usar un «Continuar» ambiguo que debita al instante.

### 03 · SaaS B2B web — planificador operativo

- **Situación:** Equipos con trabajo recurrente; comparar muchos estados es más importante que una portada vistosa.
- **Dirección de arte e identidad:** Sistema editorial de información, jerarquía por acciones y fechas, filtros orientados a roles y persistencia del estado de vistas.
- **Componentes y estados propios:** Vista tabla/calendario configurables, comandos rápidos, empty/error states, permisos por rol, audit trail, bulk actions reversibles.
- **Accesibilidad e interacción:** HTML semántico, tabla navegable, foco modal, reflow y zoom, idioma/tiempo relativo explícito.
- **Optimización y QA:** Tiempo para encontrar bloqueo, tasa de error en acción masiva, respuesta al teclado, INP y layout shift.
- **Rechazar:** Pegar gradientes y gráficos decorativos sobre las tareas diarias.

### 04 · E-commerce web móvil — producto artesanal

- **Situación:** Comprador debe entender material, talla y coste real antes de pagar.
- **Dirección de arte e identidad:** Diseño editorial de producto: fotografía autorizada, tipografía legible, storytelling del material sin sacrificar comparaciones.
- **Componentes y estados propios:** Selección de talla/stock, filtros, variantes, precio total, confirmación de carrito, checkout y corrección de dirección.
- **Accesibilidad e interacción:** Fotos con alt específico, objetivos táctiles, errores asociados al campo, soporte de zoom sin romper diseño.
- **Optimización y QA:** Éxito de elección de talla, devoluciones, LCP/CLS, checkout finalizado y navegación por teclado.
- **Rechazar:** Producto escondido detrás de un hero gigante y una animación obligatoria.

### 05 · IDE GPUI — editor profesional

- **Situación:** Desarrollador pasa horas en texto; cada milisegundo de input y cada foco perdido importa.
- **Dirección de arte e identidad:** Composición utilitaria y modular: canvas textual dominante, iconografía discreta, paneles acoplables, sistema de comandos.
- **Componentes y estados propios:** Tabs con dirty marker, paleta de comandos, diagnostics, terminal, undo/redo y guardado recuperable.
- **Accesibilidad e interacción:** IME, foco correcto, keyboard-first, atajos configurables, high-DPI, contraste semántico.
- **Optimización y QA:** Key-to-paint latency, memoria con archivos grandes, recuperación sin pérdida, pruebas de atajos/IME.
- **Rechazar:** Animaciones en cada pulsación y dashboard de tarjetas como pantalla de trabajo principal.

### 06 · Juego Godot 2D — plataformas de precisión

- **Situación:** Jugador mide saltos por silueta, velocidad y anticipación visual.
- **Dirección de arte e identidad:** Arte por siluetas del escenario, contraste del peligro, HUD mínimo y VFX rítmico que nunca oculta plataformas.
- **Componentes y estados propios:** Rebind de controles, coyote time/buffer si lo exige el diseño, pausa, checkpoint, SFX de salto/aterrizaje únicos.
- **Accesibilidad e interacción:** Gamepad/teclado, opciones de flashes/motion, pistas sonoras complementadas con visual y subtítulos cuando aplican.
- **Optimización y QA:** Muertes por lectura errónea, input-to-action delay, tasa de salto, percepción de hitbox y compatibilidad de mando.
- **Rechazar:** HUD de RPG repleto de indicadores y partículas que tapan el borde de la plataforma.

### 07 · Juego Godot 3D — RPG exploratorio

- **Situación:** Jugador alterna navegación espacial, combate e inventario con controlador.
- **Dirección de arte e identidad:** Jerarquía contextual: mundo primero, navegación/mapa activables, inventario estructurado, señales visuales no intrusivas.
- **Componentes y estados propios:** State-machine de pantallas, navegación espacial, quick slots, tooltips accesibles, mapas/objetivos, autosave y confirmación de equipar.
- **Accesibilidad e interacción:** Texto escalable en TV, controles rebindables, subtítulos, reduced camera shake, foco gamepad continuo.
- **Optimización y QA:** Tarea equipar/usar ítem, pérdida de foco, legibilidad a distancia, FPS/VRAM por escena y latencia de menús.
- **Rechazar:** Copiar tabla ERP sobre el centro del mundo o popup con click-only en consola.

### 08 · Juego rítmico móvil — tiempo y feedback

- **Situación:** Jugador evalúa sincronización entre sonido, pista visual y toque; latencia domina la experiencia.
- **Dirección de arte e identidad:** Contraste temporal, grilla clara y ritmo visual; efectos subordinados a la pista, no al revés.
- **Componentes y estados propios:** Calibración de latencia, mapa de input, feedback hit/miss sincronizado, pausa, modo sin sonido y resultados.
- **Accesibilidad e interacción:** Alternativa visual a información sonora, sin destellos agresivos, áreas touch grandes y reducción de movimiento.
- **Optimización y QA:** Desviación de timing, errores por touch latency, precisión de feedback en dispositivos reales y pruebas con audio apagado.
- **Rechazar:** Pintar efectos de 500 ms que ocultan notas y depender exclusivamente del beat audible.

### 09 · POS Qt Desktop — caja sin errores de cobro

- **Contexto:** personal con trabajo repetitivo, lectores de códigos, teclado y periféricos; una operación cancelada o duplicada afecta la caja.
- **Dirección propia:** legibilidad extrema, estado de caja persistente, cantidades y totales con jerarquía verificable; superficies táctiles grandes solo cuando hay pantalla táctil.
- **Componentes y estados:** escaneo, producto inexistente, descuento autorizado, devolución, ticket, impresora desconectada, pago pendiente y conciliación.
- **Accesibilidad:** foco y atajos consistentes, feedback no dependiente del color/sonido, modo alto contraste.
- **Correcto:** confirmar importe, moneda, forma de pago y estado idempotente antes de emitir recibo; pruebas con impresora y lector desconectados.
- **Incorrecto:** copiar un e-commerce con carrito animado y ocultar si el cobro ya se procesó.
- **Pruebas:** 30 cobros consecutivos, doble pulsación, offline, recuperación tras cierre; tasa de cobros duplicados = 0.

### 10 · App móvil de campo — trabajo offline

- **Contexto:** personal de campo documenta inspecciones con mala conectividad, sol intenso y una mano ocupada.
- **Dirección propia:** componentes de alto contraste en exteriores, progreso por tareas, captura clara y estados de sincronización visibles.
- **Componentes y estados:** formulario incremental, borrador, foto pendiente, carga, conflicto de sincronización, reintento, recibo local.
- **Accesibilidad:** texto dinámico, objetivos táctiles amplios, cámara con alternativa y lecturas VoiceOver/TalkBack.
- **Correcto:** persistir borradores localmente con identificadores y sincronizar de forma idempotente al recuperar red.
- **Incorrecto:** botón «Enviar» que descarta datos cuando la red cae.
- **Pruebas:** modo avión, rotación, cierre forzado, teclado abierto, fotos grandes y conflicto de edición.

### 11 · App móvil de salud — información sensible

- **Contexto:** una persona consulta resultados o prepara una cita; cualquier ambigüedad puede afectar decisiones sensibles.
- **Dirección propia:** jerarquía clínica sobria y legible; textos explicativos sin decoración distractora ni lenguaje alarmista.
- **Componentes y estados:** autenticación contextual, resultado disponible/no disponible, fecha de muestra, aviso de interpretación, contacto y permiso.
- **Accesibilidad:** tamaño de texto elevado, lectura por pantalla, foco secuencial y traducción verificada de terminología.
- **Correcto:** mostrar origen, unidades, rango cuando está validado y fecha; controlar datos sensibles en notificaciones.
- **Incorrecto:** colorear cualquier valor como «urgencia roja» por heurística visual sin criterio clínico.
- **Pruebas:** comprensión con personas reales, errores de unidad, accesibilidad y retención de datos según obligaciones aplicables.

### 12 · Editor desktop de música — producción y latencia

- **Contexto:** creador profesional alterna timeline de pistas, teclado MIDI, mezclador y atajos.
- **Dirección propia:** time ruler, pistas densas y formas de onda legibles; paneles redimensionables y color funcional por grupo.
- **Componentes y estados:** playhead, armado, mute/solo, selección múltiple, guardado, autosave, error de dispositivo de audio.
- **Accesibilidad:** navegación teclado, etiquetas de canales, indicadores alternativos para picos y activación de controles sin drag obligatorio.
- **Correcto:** evitar bloquear hilo de audio por cambios de UI; controlar render de ondas y asignaciones de foco.
- **Incorrecto:** aplicar scroll animations que afecten la representación temporal de sonido.
- **Pruebas:** dropouts, input-to-monitor latency, sesiones largas, recuperación de proyecto, control sin ratón.

### 13 · Juego de puzzles 2D — lectura y aprendizaje

- **Contexto:** jugador entiende reglas progresivas a partir de manipular piezas y observar resultados.
- **Dirección propia:** formas, materiales y tipografía asociadas al tema del puzzle; contraste que distingue piezas interactuables del fondo.
- **Componentes y estados:** seleccionar, mover, invalidar, deshacer, pista opcional, éxito, replay y pausa.
- **Accesibilidad:** navegación por teclado/gamepad, alternativa a distinción por color, temporizador configurable.
- **Correcto:** la animación de error explica por qué no se puede colocar la pieza y ofrece alternativa.
- **Incorrecto:** tapar las piezas con partículas de victoria antes de guardar el progreso.
- **Pruebas:** primera partida sin tutorial, 100 undo/redo, foco estable, tamaño de fuente y sesiones largas.

### 14 · Shooter 3D — información bajo presión

- **Contexto:** jugador necesita percibir objetivos, salud y dirección de amenaza sin perder la visibilidad del mundo.
- **Dirección propia:** indicadores periféricos claros, siluetas legibles, retícula configurable, colores semánticos que no dependan solo del tono.
- **Componentes y estados:** hit feedback, recarga, objetivo, subtítulos direccionales, ajustes de cámara/visión, gamepad.
- **Accesibilidad:** sensibilidad y remapeo, shake/recoil configurables, flash reducido, indicadores para sonidos críticos.
- **Correcto:** separar daño autoritativo de feedback visual y mostrar estados aunque se desactive el audio.
- **Incorrecto:** iluminar toda la pantalla al recibir daño y ocultar la retícula durante cada animación.
- **Pruebas:** frame time p95, pérdida de rendimiento con VFX, gamepad sin ratón y accesibilidad sin sonido.

### 15 · Plataforma educativa infantil — comunicación segura

- **Contexto:** alumnado necesita comprender tareas y docentes configurar contenido, con necesidades de edad y privacidad distintas.
- **Dirección propia:** jerarquía pedagógica, ilustración original con propósito, progreso explicable y elementos táctiles sencillos.
- **Componentes y estados:** objetivos, error recuperable, retroalimentación, pausa, configuración del educador y consentimiento pertinente.
- **Accesibilidad:** lectores, contrastes adaptados, formas además de colores y alternativas a audio/gestos.
- **Correcto:** limitar estímulos y recoger solo datos esenciales con controles claros para responsables.
- **Incorrecto:** recompensas, notificaciones o rachas manipulativas para aumentar permanencia a costa del aprendizaje.
- **Pruebas:** observación en tareas reales, comprensión sin tutorial, control de datos, sesiones con pausas y dispositivos modestos.

### 16 · Juego de estrategia por turnos — planificación sin ruido

- **Contexto:** jugador necesita contrastar consecuencias y evaluar el siguiente turno con múltiples unidades.
- **Dirección propia:** tablero legible, capas de información desplegables y símbolos consistentes para recursos/movimientos.
- **Componentes y estados:** unidad activa, coste, alcance, confirmación, deshacer si las reglas lo permiten, cola de acciones y log.
- **Accesibilidad:** foco gamepad/teclado por celda, información alternativa al color y tamaños legibles en pantalla grande.
- **Correcto:** previsualizar coste/resultado y preservar determinismo de reglas en simulación de turno.
- **Incorrecto:** animación permanente que oculta recursos o cambia el estado antes de confirmar acción.
- **Pruebas:** navegación de 100 unidades, cancelación de acción, turnos largos, FPS al mostrar alcance y comprensión con usuarios.

## Decisiones de sistemas de diseño sin apariencia genérica

Un token describe **función** antes que tono: `text.primary`, `surface.raised`, `border.focus`, `status.danger`, `action.pending`, `motion.duration.feedback`. Los valores de marca surgen de la identidad/brief; deben pasar pruebas de contraste y adaptación de plataformas. Exportar un conjunto de tokens no verifica el producto.

```json
{
  "color": {
    "surface": { "base": "var(--brand-surface-base)" },
    "text": { "primary": "var(--semantic-ink)" },
    "status": { "danger": "var(--semantic-danger)" }
  },
  "motion": { "feedbackMs": 120, "reducedMotionMs": 0 }
}
```

Ejemplo de **contrato ilustrativo**, no archivo drop-in: las referencias deben resolverse en el sistema de tokens del consumidor; no declarar ese JSON validado por un generador sin pruebas. Evitar el «componente universal para todo». Un botón debe implementar el método de entrada y estados que correspondan a su plataforma.

### React web: botón de acción real

```tsx
function ConfirmAction({ pending, onConfirm }: { pending: boolean; onConfirm: () => void }) {
  return (
    <button type="button" disabled={pending} aria-busy={pending} onClick={onConfirm}>
      {pending ? 'Procesando…' : 'Revisar y confirmar'}
    </button>
  );
}
```

Asegurar foco visible, estado de error asociado, idempotencia real en servidor y pruebas del flujo, no solo del botón.

### Expo móvil: toque, contenido y estado

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Revisar transferencia"
  accessibilityState={{ disabled: pending, busy: pending }}
  disabled={pending}
  hitSlop={8}
  onPress={reviewTransfer}
>
  <Text>Revisar transferencia</Text>
</Pressable>
```

`hitSlop` no reemplaza un layout de tamaño táctil adecuado; probar text scaling, teclado/safe area y TalkBack/VoiceOver en Android/iOS compatibles.

### Godot HUD y foco del gamepad

```gdscript
extends Control
@onready var primary_button: Button = %PrimaryButton
func _ready() -> void:
    primary_button.grab_focus()
```

El árbol de escena debe tener un botón con `unique_name_in_owner`, vecinos de foco y conexión de acciones. Probar con gamepad real y sin ratón. Para audio/animación conectar señales de gameplay a capas de presentación sin modificar física desde el HUD.

## Cinco errores transversales adicionales

### 01. Originalidad
- **❌ Incorrecto**: Entregar una copia de un design shot sin permisos o rationale de usuario.
- **✅ Correcto**: Registrar referencias, licencia, tres alternativas y decisión diferenciada por tarea.

### 02. Componentes
- **❌ Incorrecto**: Exportar estilos hardcoded a 40 componentes sin contrato ni estados.
- **✅ Correcto**: Tokens semánticos y componentes con variantes/estados por plataforma, owner y tests.

### 03. Rendimiento
- **❌ Incorrecto**: Decidir microinteracciones por apariencia sin medir render/input.
- **✅ Correcto**: Medir latencia y probar dispositivos lentos, reduced motion y carga real.

### 04. Accesibilidad
- **❌ Incorrecto**: Declarar AA después de pasar solo checker automático de contraste.
- **✅ Correcto**: Cobertura automática aplicable + teclado/touch/gamepad/screen reader según producto, evidencia manual.

### 05. Validación de producto
- **❌ Incorrecto**: Probar prototipo solo con diseñadores o con output IA.
- **✅ Correcto**: Investigación, pruebas por tarea con usuarios y registro de limitaciones/hipótesis.

## Criterios de aceptación

1. Brief y constraints conocidos; personas y tareas observables; si no existe evidencia de usuarios, marcar hipótesis.
2. Dirección visual elegida entre alternativas diferentes; no clonar templates ni atribuir originalidad automática.
3. Inventario de componentes/estados: loading, focus, pressed, error, empty, success y offline según flujo.
4. Tokens semánticos y variantes de tema por plataforma, no hardcodes dispersos.
5. Matriz de inputs: teclado/ratón, touch, lector de pantalla, gamepad/IME donde aplique.
6. Performance y accesibilidad con métricas/riesgos del dispositivo objetivo, sin comparaciones inventadas.
7. QA visual, interacción, seguridad de datos y tests CI aplicables, más pruebas humanas donde requiera.
8. Resultado final `PASS/FAIL/BLOCKED/NOT_RUN` con fuente y prueba; un diseño mostrado no demuestra E2E exitoso.

**Fuentes canónicas:** [Tokens](design-tokens-modes-and-theming.md), [Accesibilidad](accessibility-inclusive-interactions.md), [Componentes](components-states-and-contracts.md), [Art direction](visual-art-direction-and-originality.md), [CI/QA](ux-quality-gates-and-ci-cd.md) y [ejemplos breves](platform-specific-design-examples.md).

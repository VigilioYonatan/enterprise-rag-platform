# UX/UI por producto — catorce ejemplos de interfaz, estados y pruebas

**Owner:** `standards/experience/`, se aplican las normas de [accessibility](accessibility-inclusive-interactions.md), [tokens](design-tokens-modes-and-theming.md), [components](components-states-and-contracts.md), [motion](motion-feedback-and-haptics.md) y [quality gates](ux-quality-gates-and-ci-cd.md). Los ejemplos son **criterios y snippets ilustrativos**, no E2E aprobados ni diseño obligatorio.

## Matriz de contextos diferentes

| Producto | Dirección visual propia | Componentes/estados | Prueba UX imprescindible |
|---|---|---|---|
| SaaS ventas | Lectura de pipeline/valores, alta densidad controlada | filtros, tabla, acciones con confirmación, vacíos | 320/768/1440, teclado, errores, latencia |
| Tienda e-commerce | Fotografía de producto y jerarquía de decisión | variantes, carrito, disponibilidad, checkout | precio/stock consistente, errores de compra |
| Landing editorial | Narrativa visual y ritmo de lectura personalizado | hero con CTA claro, secciones, navegación | contenido accesible sin animación ni JS decorativo |
| Fintech web | Importes, recibos, riesgo, sesgo de confianza | transferir, verificar destinatario, OTP/error | reintento sin doble envío, importes visibles |
| Fintech móvil | Verificación y privacidad en pantalla pequeña | teclado numérico, resumen antes de confirmar | biometría fallback, TalkBack/VoiceOver, offline |
| App salud móvil | Lectura tranquila, estado clínico y ayuda contextual | agenda, historial, permisos | tamaño texto grande, no depender solo de color |
| App transporte móvil | Información accionable mientras se camina | ruta, mapa, alertas, fallback textual | red lenta, accesibilidad de mapa, touch |
| IDE GPUI | Menús, docking, tablas, teclado y command palette | tabs, split, paleta, feedback de background | IME, foco, shortcut conflict, accesibilidad OS |
| C++/Qt ERP | Densidad financiera y operaciones de operador | grids, modales, atajos, audit trail | keyboard-only, DPI alta, contraste |
| Browser Qt WebEngine | Seguridad/URL, permisos y perfiles visualmente claros | omnibox, pin de privacidad, tabs, descargas | foco omnibox, no confundir incógnito con anonimato |
| Plataforma Godot 2D | HUD ligero y feedback diegético coherente | vida, coleccionables, pausa, SFX | gamepad, subtítulos, salto sin audio |
| RPG Godot 3D | Navegación espacial y menú de inventario legible | minimapa, skillbar, inventario, progresión | textos a distancia, cámara, sensibilidad, rebind |
| Puzzle Godot | Lectura del estado/patrón sin depender del color | undo, hint, focus, puzzle grid | daltonismo, input alternativo, reduced motion |
| Juego musical Godot | Feedback audiovisual sincronizado y calibrable | input markers, progreso, errores | latencia y pistas visuales/sonoras alternativas |

## Ejemplo web — diseño de botón semántico no genérico

```tsx
// Fragmento React/TSX ilustrativo; conectar con app y tests reales
function TransferButton({ pending, onConfirm }: { pending: boolean; onConfirm(): void }) {
  return <button type="button" disabled={pending} aria-busy={pending} onClick={onConfirm}>
    {pending ? 'Procesando transferencia…' : 'Revisar transferencia'}
  </button>;
}
```

El botón no inicia transferencias automáticamente cuando se carga la página; el flujo debe mostrar importe, destinatario, moneda, tasas, idempotencia y confirmación. Estados: default, hover, focus-visible, disabled, pending, error, success. Nunca suprimir outline sin reemplazo visible.

## Ejemplo Expo — touch y lectura accesible

```tsx
// Fragmento Expo/React Native ilustrativo
<Pressable accessibilityRole="button"
           accessibilityLabel="Confirmar operación"
           accessibilityState={{ disabled: pending, busy: pending }}
           disabled={pending}
           onPress={confirmTransfer}>
  <Text>Confirmar</Text>
</Pressable>
```

Necesita diseño real de área táctil, safe-area, feedback, tests de navegación y lector de pantalla físico; no copiar atributos CSS/web ni confiar en un `Pressable` sin tamaño adecuado.

## Ejemplo desktop — productividad sin espectáculo

- **GPUI IDE:** teclado prioritario, IME/multilingual, foco persistente, undo/redo, menus, screen-reader API; no renderizar miles de rows visibles simultáneamente si es evitable.
- **Qt ERP:** tablas con navegación y orden de foco, modales con escape, estado de guardado/bloqueo y recuperación; usar modelos de Qt en lugar de copiar tablas web con `QWebEngineView` por defecto.
- **Qt Browser:** navegación y autorización de permisos con contexto de origen, visibilidad de modo privado y error de certificado; evitar dark mode que oculta indicadores de seguridad.

## Ejemplo Godot — menú y navegación con gamepad

```gdscript
# Fragmento en Control: enlazar botones reales en el editor
@onready var play_button: Button = %PlayButton
func _ready() -> void:
    play_button.grab_focus()
```

El árbol debe tener focus neighbors adecuados, navegación gamepad, acciones rebindeables, audio opcional y texto legible. Un menú accesible no exige Godot Theme global por cada mini juego; reutilizar `Theme` y variaciones cuando se repitan.

## Ejemplo sistema de tokens y diseño personalizado

```json
{
  "color": {
    "surface": "#10161E",
    "onSurface": "#F0F5F9",
    "focus": "#F1C75B",
    "critical": "#FF9B94"
  },
  "motion": {"feedbackMs": 140, "reducedMotionMs": 0}
}
```

**Ejemplo no prescriptivo**: escoger paleta según marca, luminancia, contraste validado y contexto de uso, no convertir estos valores en defecto de todo producto. Tokens `semantic` deben mapearse a componentes con variantes claras y tema/estado. Verificar pares reales, no solo dos colores del ejemplo.

## Casos adversarios y design QA

- Contraste suficiente en default pero no en hover/focus/error; medir cada estado.
- Texto traducido ocupa dos líneas, se corta en móvil y activa scroll inesperado.
- Botón deshabilitado sin explicación impide terminar una tarea financiera.
- Videojuego transmite indicaciones obligatorias solo en audio; agregar captions/señales visuales.
- Gamepad pierde foco tras cerrar inventario/modal y el menú queda bloqueado.
- IDE cambia de foco mientras usuario compone texto con IME.
- Tests DOM pasan pero se rompe VoiceOver/TalkBack en dispositivo; reportar `NOT_RUN` manual.
- Componentes «reutilizables» se globalizan y adquieren dependencias de auth o billing; revisar [ownership](../engineering/file-and-symbol-ownership.md).

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** diseñar de acuerdo con caso de uso y plataforma, instrumentar estados reales, probar teclado/touch/gamepad, registrar riesgos y personalizar arte.
- ❌ **Incorrecto:** usar el mismo dashboard para FPS, fintech y ERP, copiar vistas de galerías sin validar licencias, o decir 10/10 tras inspeccionar solo snapshots.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Fintech y juego de plataformas comparten KPI cards
- **❌ Incorrecto**: Fintech y juego de plataformas comparten KPI cards.
- **✅ Correcto**: Diseñar fintech para verificación y juego para acción/feedback diegético.

### 02. E-commerce checkout oculta totales al desplazar en móvil
- **❌ Incorrecto**: E-commerce checkout oculta totales al desplazar en móvil.
- **✅ Correcto**: Resumen visible y paso de confirmación con costos claros.

### 03. ERP desktop ignora atajos y densidad informativa
- **❌ Incorrecto**: ERP desktop ignora atajos y densidad informativa.
- **✅ Correcto**: Tablas virtualizadas, atajos, búsqueda y estados de guardado.

### 04. RPG 3D copia HUD de shooter sin considerar mundo
- **❌ Incorrecto**: RPG 3D copia HUD de shooter sin considerar mundo.
- **✅ Correcto**: Jerarquía inventario, mapa, foco gamepad y legibilidad en 3D.

### 05. App salud muestra información privada en notificación lock-screen
- **❌ Incorrecto**: App salud muestra información privada en notificación lock-screen.
- **✅ Correcto**: Privacidad por contexto y configuración explícita.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Design System, NativeWind Y Tokens Mobile

## Objetivo

Separar primitives reutilizables de componentes de dominio. NativeWind acelera composición, pero los
tokens —no clases arbitrarias repetidas— representan la identidad y accesibilidad del producto.

## Capas

```text
tokens (color, spacing, typography, motion)
  -> primitives (Text, Button, Input, Card, Modal)
    -> patterns (FormField, EmptyState, ErrorState)
      -> feature components (ProductForm, UploadCard)
        -> screens
```

## Tokens semánticos

Usar nombres como `surface`, `content-primary`, `content-muted`, `action-primary`, `danger` y
`focus`; no `gray-700` como API de producto. Light/dark/high contrast conservan significado. Spacing,
radii, typography y elevation se limitan a escalas revisadas.

## NativeWind

Las clases viven cerca del componente; combinaciones recurrentes se encapsulan como variant de una
primitive. No construir clases dinámicas que el extractor no pueda detectar. Estilos dependientes de
mediciones, animaciones o APIs nativas pueden usar StyleSheet/Reanimated detrás de un componente.

## API de componentes

```tsx
<Button
  accessibilityLabel="Guardar producto"
  loading={mutation.isPending}
  variant="primary"
  onPress={submit}
>
  Guardar
</Button>
```

Disabled, loading, pressed, focus/error y tamaños son variants explícitas. Una primitive no importa
services ni contratos de negocio.

## Mobile-first real

- SafeArea y teclado considerados por layout.
- Target táctil y feedback háptico/visual coherentes.
- Texto dinámico y traducción no rompen el componente.
- Dark mode sigue preferencia del sistema salvo decisión de producto.
- Motion respeta reduce motion y evita bloquear interacción.

## Accesibilidad y pruebas

Primitives tienen pruebas de roles, labels, states y contraste de tokens. Story/catalog visual cubre
variants y plataformas; screenshots no sustituyen VoiceOver/TalkBack.

## Versionado

Cambios breaking del design system se publican/migran de forma controlada. Una app no copia el botón
para evitar actualizarlo; solicita una variant o documenta la excepción.

## Definition of Done

Tokens semánticos, variants completos, accesibilidad, pruebas y documentación de uso; sin colores,
espaciados o tipografía de marca dispersos por features.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Design System, NativeWind Y Tokens Mobile

✅ **Correcto:** Para **Design System, NativeWind Y Tokens Mobile**, usar componentes accesibles y tokens reutilizables con pruebas visuales.

❌ **Incorrecto:** En **Design System, NativeWind Y Tokens Mobile**, copiar configuraciones de diseño de otra plataforma sin medir sus restricciones.

## Especialización UX/UI adicional

- [UX nativa móvil](uxui-mobile-native-patterns.md).
- [Normas UX/UI canónicas](../../../../standards/experience/README.md).


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Copiar CSS web px directamente a NativeWind sin equivalencia
- **❌ Incorrecto**: Copiar CSS web px directamente a NativeWind sin equivalencia.
- **✅ Correcto**: Tokens nativos por dp/pt, tipografía y safe areas.

### 02. Tema oscuro global invierte colores sin evaluar contraste
- **❌ Incorrecto**: Tema oscuro global invierte colores sin evaluar contraste.
- **✅ Correcto**: Paleta semántica y variantes claras/oscuras probadas.

### 03. Componentes Pressable con minúscula área táctil
- **❌ Incorrecto**: Componentes Pressable con minúscula área táctil.
- **✅ Correcto**: hitSlop/min target y accesibilidad por sistema.

### 04. Fijar altura de textos sin admitir Dynamic Type
- **❌ Incorrecto**: Fijar altura de textos sin admitir Dynamic Type.
- **✅ Correcto**: Flexibilidad de fuentes y test de escalado.

### 05. Duplicar tokens en iOS/Android sin contrato
- **❌ Incorrecto**: Duplicar tokens en iOS/Android sin contrato.
- **✅ Correcto**: Source tokens shared con adaptadores de plataforma explícitos.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

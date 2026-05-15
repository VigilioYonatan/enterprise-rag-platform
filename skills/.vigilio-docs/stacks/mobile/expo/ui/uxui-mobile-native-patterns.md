# UX/UI móvil — Expo/React Native, iOS y Android

**Estado:** norma vigente, no certificación de implementación. **Owner:** `stacks/`. **Alcance:** Apps móviles con gestos, safe area, teclado, touch y accesibilidad..

## Decisiones arquitectónicas y de producto

- Conservar semántica/tamaño de controles por plataforma, no copiar web sin adaptarla. - Respetar safe area, teclado virtual, navegación Back, deep links, interrupciones, orientación y tamaños dinámicos de texto. - Accesibilidad nativa con labels, roles, hints y announcements donde aplique. - Usar NativeWind/tokens existentes del proyecto, no imponer segunda librería de UI. - Considerar slow network/offline/biometría y permisos con confirmaciones claras.

## Contrato implementable / ejemplo verificable

```tsx
import { Pressable, Text } from 'react-native';
export function ConfirmAction({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Confirmar" disabled={busy}
    accessibilityState={{ disabled: busy, busy }} onPress={onPress}
    style={{ minHeight: 48, justifyContent: 'center' }}>
    <Text>{busy ? 'Procesando…' : 'Confirmar'}</Text>
  </Pressable>;
}
```
48 aquí es un ejemplo para Android; tamaños y spacing deben adaptarse y verificarse en iOS/Android.

## Testing, revisión y criterios de aceptación

- [ ] VoiceOver/TalkBack, dynamic font, teclado abierto, screen rotations, safe area, tap targets.
- [ ] Android Back/iOS gestures + recuperación durante proceso.
- [ ] Medir startup y jank en hardware económico.

## Anti-patrones y riesgos

- Fijar 12px para todo texto porque cabe en un mockup.
- Gestos secretos sin alternativa de botón accesible.
- Confundir 44 pt de iOS con 44 CSS px.



## Referencias oficiales y fuentes canónicas

- [Accesibilidad universal](../../../../standards/experience/accessibility-inclusive-interactions.md)
- [Responsive](../../../../standards/experience/responsive-adaptive-safe-area.md)
- [Apple HIG: accesibilidad](https://developer.apple.com/design/human-interface-guidelines/accessibility)

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Aplicar las decisiones según plataforma, evidenciar los tests reales, comparar alternativas y preservar la arquitectura y los usuarios del producto.
- ❌ **Incorrecto:** Fijar 12px para todo texto porque cabe en un mockup.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Diseñar botón Confirmar que queda bajo teclado
- **❌ Incorrecto**: Diseñar botón Confirmar que queda bajo teclado.
- **✅ Correcto**: Keyboard avoiding, safe area y scroll focus.

### 02. Reproducir navegación web con hover en móvil
- **❌ Incorrecto**: Reproducir navegación web con hover en móvil.
- **✅ Correcto**: Patrones touch, back gesture y feedback nativo.

### 03. Depender de haptics para confirmar éxito
- **❌ Incorrecto**: Depender de haptics para confirmar éxito.
- **✅ Correcto**: Haptics opcional y anuncio accesible.

### 04. Enviar datos sensibles a push visible en pantalla bloqueada
- **❌ Incorrecto**: Enviar datos sensibles a push visible en pantalla bloqueada.
- **✅ Correcto**: Consentimiento y payload de notificación minimizado.

### 05. No probar VoiceOver y TalkBack porque hay accessibilityLabel
- **❌ Incorrecto**: No probar VoiceOver y TalkBack porque hay accessibilityLabel.
- **✅ Correcto**: Test en ambos sistemas y foco contextual.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

# Expo/React Native — ownership UI, estado y contratos

**Owner:** `stacks/mobile/expo/` y [ownership](../../../../standards/engineering/file-and-symbol-ownership.md).

```text
apps/mobile/src/
├── features/auth/{screens,components,hooks,api,contracts,tests}/
├── shared/ui/{buttons,feedback}/
├── design/{tokens,themes}/
└── navigation/
```

Colocar `const` de control de estado local al componente; mover tokens reutilizados a `design/tokens`, URLs/runtime a config validada y modelos API a contratos propietarios. **No** duplicar DTO HTTP web/mobile ni esquemas de autenticación. `shared/ui` justificado cuando se reutiliza; separar navegación de UI y no poner credenciales en archivos de constants.

**Verificaciones:** safe areas, Android/iOS adaptativos, targets táctiles, VoiceOver/TalkBack reales, modo oscuro, reduced motion, teclado virtual, tests de navegación, estado offline/reintento, release por plataforma. Las pruebas de componentes no sustituyen dispositivo.

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Separa UI reusable de contracts y valida VoiceOver/TalkBack en dispositivos.
- ❌ **Incorrecto:** Suponer que pruebas DOM certifican gestos, safe-area y navegación móvil.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Mover screen-specific hooks a shared/ en primera versión
- **❌ Incorrecto**: Mover screen-specific hooks a shared/ en primera versión.
- **✅ Correcto**: Co-localizar hooks/componentes con pantalla hasta reutilización.

### 02. Definir DTO de pagos dentro de TransferButton
- **❌ Incorrecto**: Definir DTO de pagos dentro de TransferButton.
- **✅ Correcto**: Tipos de application/api y mapeo de presentación.

### 03. Guardar estilos como constantes exportadas sin semántica
- **❌ Incorrecto**: Guardar estilos como constantes exportadas sin semántica.
- **✅ Correcto**: Design tokens y variants con dueño.

### 04. Usar context global para estado modal local
- **❌ Incorrecto**: Usar context global para estado modal local.
- **✅ Correcto**: Estado local y propagación mínima necesaria.

### 05. Compartir lógica web que usa DOM en Expo nativo
- **❌ Incorrecto**: Compartir lógica web que usa DOM en Expo nativo.
- **✅ Correcto**: Separar core pure y adapters web/native.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

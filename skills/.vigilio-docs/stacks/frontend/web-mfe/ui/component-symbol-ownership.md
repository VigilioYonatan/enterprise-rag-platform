# Frontend React — features, componentes, tokens y tipos sin carpetas vacías

**Owner:** `stacks/frontend/web-mfe/` y [ownership transversal](../../../../standards/engineering/file-and-symbol-ownership.md).

```text
src/features/auth/
├── api/sign-in.api.ts
├── components/login-form.tsx
├── hooks/use-sign-in.ts
├── contracts/sign-in.dto.ts
├── config/auth-navigation.ts
└── tests/login-form.test.tsx
src/shared/ui/button/         # Segundo consumidor real + design system aprobado
```

- Estado/constantes de componente solo locales siguen en el componente. Extraer tokens de diseño a sistema canónico; constantes de auth a config/contract según ownership.
- DTO de frontera para login: usar validador/schema compartido y derivar TS types; no repetir unions en `types.ts` si ya las posee el schema.
- `libs/` global no debe importar features, ni transformarse en `shared/helpers` sin propietario.
- Para botones, preservar semántica de `<button>`, foco, disabled, busy, tamaño y teclado; un diseño visual atractivo no sustituye accesibilidad.

**Gates:** TypeScript, ESLint, unit/component, playwriting E2E, accesibilidad DOM y visual diff con baseline; revisar consumos al mover exports.

## ✅ Correcto / ❌ Incorrecto — criterio verificable

- ✅ **Correcto:** Ubicar tokens compartidos en design y lógica auth en feature; probar foco teclado.
- ❌ **Incorrecto:** Poner DTOs de auth dentro de componentes o todo en shared/utils.ts.


## Laboratorio de decisiones Senior/Staff — Correcto vs Incorrecto (2026)

Casos independientes de implementación. Cada fila representa **un ejemplo incorrecto y su alternativa correcta**; elegir la solución proporcional al producto, no aplicarla por dogma. Los ejemplos son criterios de revisión, no pruebas ejecutadas.

### 01. Guardar todos los componentes React en shared/ por defecto
- **❌ Incorrecto**: Guardar todos los componentes React en shared/ por defecto.
- **✅ Correcto**: Componentes feature-local, promover a shared tras uso genuino.

### 02. Constante financiera específica en ui/constants.ts global
- **❌ Incorrecto**: Constante financiera específica en ui/constants.ts global.
- **✅ Correcto**: Política de dominio/config en módulo dueño, UI lee contrato.

### 03. Duplicar tipo UserProfile en cinco componentes
- **❌ Incorrecto**: Duplicar tipo UserProfile en cinco componentes.
- **✅ Correcto**: Exportar contrato de feature, tipos derivados y DTO de frontera.

### 04. Helper de fecha con zona horaria metido en Button.tsx
- **❌ Incorrecto**: Helper de fecha con zona horaria metido en Button.tsx.
- **✅ Correcto**: Utilidad tipada por responsabilidad con pruebas de localización.

### 05. Mover estado interno useState a context global sin caso real
- **❌ Incorrecto**: Mover estado interno useState a context global sin caso real.
- **✅ Correcto**: Mantener estado más cerca del consumidor necesario.

### Política de pruebas y optimización

**Gate UX/UI:** prototipo → prueba de tareas reales → revisión de foco/teclado/touch/gamepad según plataforma → auditoría automática pertinente → QA manual en dispositivos. No confundir tokens con UX validada.

**Optimización:** controlar jerarquía cognitiva, densidad, tiempo de interacción, frame time y tamaño del bundle; preferencias de movimiento reducido y escalado tipográfico.

**Criterio de salida:** incluir requisito, decisión arquitectónica, riesgo, tests ejecutados, métricas pertinentes y estado `PASS | FAIL | BLOCKED | NOT_RUN`. Un ejemplo documental o un script no ejecutado nunca justifican `PASS`.

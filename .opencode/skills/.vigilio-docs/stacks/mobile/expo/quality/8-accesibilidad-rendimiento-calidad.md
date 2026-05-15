# Accesibilidad, Rendimiento Y Calidad Nativa

## Accesibilidad

El objetivo es WCAG 2.2 AA donde aplica y compatibilidad con TalkBack/VoiceOver. React Native necesita
semántica explícita:

- `accessibilityRole`, label, hint y state correctos;
- orden de foco coherente y foco restaurado después de modal/error;
- target táctil suficiente y alternativa a gestos;
- contraste y significado no dependiente solo del color;
- texto dinámico sin truncar acciones críticas;
- anuncios `liveRegion`/alert para feedback relevante.

Se prueba con lector real; un matcher unitario solo verifica parte del contrato.

## Rendimiento

### Inicio

Medir cold/warm start en build release. No bloquear el primer frame restaurando caches enormes,
fuentes innecesarias o múltiples requests. Splash oculta preparación mínima, no deuda arbitraria.

### Listas e imágenes

- `FlatList`/virtualización con keys estables y paginación.
- Imágenes dimensionadas, cacheables y con placeholder.
- Evitar decodificar archivos grandes en memoria.
- No recrear objetos/callbacks por costumbre; perf se optimiza con profiling.

### Red y batería

AppState y NetInfo detienen polling inútil. Background work requiere caso de negocio, permisos y
budget. Retry usa backoff/jitter y respeta `Retry-After`.

## Budgets

Cada repo fija presupuestos observables para bundle Hermes, assets, startup y crash-free sessions.
El budget parte de una medición estable y conserva margen pequeño; no se eleva automáticamente cada
vez que falla.

## Calidad específica mobile

- orientación, safe areas, teclado y notch;
- permisos denegados/revocados;
- bajo almacenamiento y memoria;
- conectividad intermitente;
- locale, timezone y accesibilidad de fuente;
- compatibilidad con versiones mínimas Android/iOS declaradas.

SEO/Core Web Vitals no son gates de una app nativa. Si existe una superficie web pública, tiene
pipeline y criterios propios.

## Evidencia

Se conservan métricas de export, perfiles de render/startup y resultados de dispositivos. “Se siente
rápido en simulador” no es una aceptación de rendimiento.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Accesibilidad, Rendimiento Y Calidad Nativa

✅ **Correcto:** Para **Accesibilidad, Rendimiento Y Calidad Nativa**, comprobar contratos React Native, permisos de dispositivo y estados offline.

❌ **Incorrecto:** En **Accesibilidad, Rendimiento Y Calidad Nativa**, suponer que los adaptadores web funcionan automáticamente en Expo.

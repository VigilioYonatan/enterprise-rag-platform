# Godot 2D — Vertical slice de salto y audio (referencia)

Un proyecto pequeño con colisión/plataforma, movimiento A/D, salto ESPACIO, señales `jumped` y `landed` → dos `AudioStreamPlayer2D`, animación tween de salto y música ambient sencilla. Audio original sintetizado para evitar licencias externas.

## Cómo validarlo

```bash
# Requiere Godot 4.x compatible instalado; el paquete Docs+Skills NO lo ejecutó automáticamente.
godot --headless --path . --editor --import
godot --headless --path . --script res://tests/smoke_test.gd
godot --path .
```

`tests/smoke_test.gd` verifica reglas de salto y carga/conexiones de la escena (colisión, señales, streams). NO simula una partida completa a 60 FPS ni demuestra sonido audible. Las pruebas jugables requieren abrir la escena y confirmar caída/aterrizaje, salto, botón y sonido, y el test de audio requiere dispositivo/runner real. Las aserciones headless solo comprueban que hay streams y señales conectadas; el audio audible, la latencia y la mezcla de buses quedan como `NOT_RUN`.

**Limitación intencional:** el demo usa `Master` por simplicidad y un tono corto de ambiente; la arquitectura de un juego real **debe** añadir buses `Music/SFX/UI/Ambience`, loops adecuados, mezcla de buses, efectos visuales de producción, un menú y pruebas E2E. Este ZIP no afirma completar esas funcionalidades solo por contener escenas.

✅ Correcto: escena, script, assets libres, test reproducible. ❌ Incorrecto: confundir smoke lógico con E2E audiovisual.

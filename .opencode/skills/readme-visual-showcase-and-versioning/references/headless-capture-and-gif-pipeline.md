# Pipeline Completo: Logos Dark/Light, Super Seeder y Grabación Headless (`.png` + `.webm` + `.gif`)

Referencia técnica basada en la implementación real de **AgentOps `0.1.0-beta`** (`scripts/capture_readme_showcase.js` y `scripts/encode_showcase_gifs.py`).

---

## 1. Creación de Logos Oficiales para Modo Claro y Modo Oscuro (`<picture>`)

GitHub cambia automáticamente entre tema claro (`#FFFFFF`) y tema oscuro (`#0D1117`). Un icono oscuro sin adaptar se vuelve invisible en Dark Mode.

1. **Extraer coordenadas reales del logo original** (usando `PIL` + `numpy` sobre el PNG entregado por el usuario para medir `rx` del squircle y vértices internos en un `viewBox="0 0 512 512"`).
2. **Guardar ambos SVGs accesibles (siempre con `<title>` interno)**:
   - `docs/assets/logo-light.svg`: Squircle `#09090B` + marca interna `#FFFFFF` (para fondos claros).
   - `docs/assets/logo-dark.svg`: Squircle `#FAFAFA` (borde `#E4E4E7`) + marca interna `#09090B` (para fondos oscuros).
   - Exportar también `docs/assets/logo-light.png` y `docs/assets/logo-dark.png` (`512x512` con fondo transparente) como fallback para `<img src="...">`.
3. **Embeber en el Hero del `README.md` con `<picture>`**:
   ```html
   <picture>
     <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg" />
     <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.svg" />
     <img alt="Project Logo" src="docs/assets/logo-light.png" width="108" />
   </picture>
   ```
4. **Integrar en la Web App (`<BrandLogo />` + `public/favicon.svg`)**: Usar `className="fill-neutral-950 dark:fill-neutral-50"` para que al alternar Dark/Light Mode durante la grabación del video el propio logo de la barra lateral cambie en tiempo real.

---

## 2. Preparación del Super Seeder antes del Scraping

1. **Limpieza previa (`TRUNCATE`):** Antes de correr el scraper, vaciar tablas transaccionales de desarrollo (`TRUNCATE TABLE organizations, users CASCADE;`) y ejecutar `db:seed` para evitar que filas viejas de tests E2E aparezcan primeras en los listados.
2. **Datos visuales completos:** Asegurar que los workflows tengan coordenadas `position: { x, y }` limpias, que las ejecuciones completadas tengan todos sus pasos poblados y que los documentos tengan sus vectores indexados en `pgvector` para que la búsqueda funcione en vivo.
3. **Restauración post-grabación:** Si durante la grabación de un video se aprueba una solicitud pendiente o se modifica un estado, volver a ejecutar `TRUNCATE` + `db:seed` al final del script (`process.execPath` ejecutando el seeder compilado para compatibilidad total en Windows, Linux y macOS).

---

## 3. Capturas Estáticas Retina 2x y Videos Interactivos con Cursor Visual

### 3.1. Configuración de Capturas Retina (`deviceScaleFactor: 2`)
```javascript
const darkContext = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
});
```
Capturar también la vista equivalente en `colorScheme: 'light'` (`02-workspace-overview-light.png`) para presentar la comparativa lado a lado Dark vs Light en el `README.md`.

### 3.2. Overlay de Cursor Luminoso y Píldora de Paso en Videos Headless
En modo headless el puntero nativo no se dibuja. Inyectar en el `recordInteractiveDemoClip` un puntero visual (`#showcase-demo-cursor`) y una etiqueta breve (`#showcase-demo-caption`):
- Mover suavemente el puntero hacia el centro del `boundingBox()` de cada botón o campo antes de interactuar (`transition: left 220ms, top 220ms`).
- Aplicar un pulso breve (`scale(0.78)` en color esmeralda) justo al hacer clic y capturar un frame para que la acción sea evidente.

### 3.3. Doble Salida de Video: `.webm` HD + `.gif` Auto-Reproducible
- **`.webm` nativo:** Activar `recordVideo: { dir: rawVideoTempDir, size: { width: 1280, height: 800 } }` en el contexto de Playwright y copiar el archivo final a `docs/assets/videos/<nombre>.webm`.
- **`.gif` nítido para GitHub Markdown:** Capturar frames clave `frame_001.png ... frame_016.png` con sus duraciones en milisegundos y codificarlos con Python `Pillow`:
  ```python
  resized_image = rgb_image.resize((1120, target_height), Image.Resampling.LANCZOS)
  quantized_frame = resized_image.quantize(
      colors=256,
      method=Image.Quantize.MEDIANCUT,
      dither=Image.Dither.NONE,
  )
  quantized_frames[0].save(
      output_gif_path,
      save_all=True,
      append_images=quantized_frames[1:],
      optimize=True,
      duration=durations,
      loop=0,
  )
  ```
  `dither=Image.Dither.NONE` evita el granulado de puntos sobre fondos oscuros sólidos y mantiene el texto de la interfaz completamente legible con un peso `< 1.2 MB` por GIF.

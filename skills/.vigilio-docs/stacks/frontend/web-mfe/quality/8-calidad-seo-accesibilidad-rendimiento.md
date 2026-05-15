# Calidad, SEO, Accesibilidad Y Rendimiento

## Clasificar la ruta

Antes de aplicar SEO decidir si la superficie es:

- privada/autenticada;
- pública e indexable;
- preview no indexable;
- contenido estático compartible.

No convertir metadata de una SPA privada en una afirmación falsa de capacidad SEO.

## Rutas privadas

- `lang`, viewport y title correctos.
- `robots: noindex,nofollow`.
- `X-Robots-Tag` desde CDN como defensa adicional.
- Sin rutas privadas en sitemap.
- Sin PII en URL, title, analytics o referrer.

## Rutas públicas

Solo si existe necesidad real:

- title y description únicos;
- canonical consistente;
- Open Graph/Twitter cards;
- headings y enlaces rastreables;
- sitemap con URLs canónicas;
- JSON-LD que represente contenido visible;
- status HTTP real para 404 y redirects.

Evaluar SSR/SSG o una aplicación pública separada cuando el posicionamiento sea requisito. Una SPA privada no debe asumir esa complejidad.

## Accesibilidad WCAG 2.2 AA

- Landmarks y headings jerárquicos.
- Controles nativos antes de widgets personalizados.
- Labels y errores asociados mediante `aria-describedby`.
- Focus visible, orden lógico y restauración en dialogs.
- Navegación completa por teclado.
- Estados no comunicados solo por color.
- Touch targets suficientes y zoom habilitado.
- Animaciones compatibles con `prefers-reduced-motion`.
- Tablas con caption/headers cuando aplique.

Axe ayuda a encontrar fallos, pero no reemplaza revisión manual con teclado y lector de pantalla.

## Core Web Vitals

Medir:

- LCP;
- INP;
- CLS;
- error rate y blank screen;
- tiempo de operaciones HTTP relevantes.

Usar laboratorio para feedback temprano y RUM para p75 por dispositivo cuando exista tráfico. No afirmar mejora sin medición comparable.

## Bundle y render

- Budget versionado para JS/CSS.
- Chunks por ruta/feature cuando reducen el camino crítico.
- No generar chunks diminutos sin beneficio.
- Evitar dependencias duplicadas y polyfills Node.
- No memoizar por reflejo; usar profiler.
- Virtualizar listas/tablas solo con volumen medido.
- Reservar espacio de contenido async para evitar CLS.

## Assets

- Imágenes con dimensiones, formato moderno y lazy loading fuera del viewport.
- Fonts con subset/preload solo si son críticas.
- CSS crítico pequeño y sin duplicación.
- Assets hasheados con caché larga e immutable.
- HTML/runtime config con caché corta.

## Evidencia

```bash
pnpm lint
pnpm test
pnpm test:e2e
pnpm test:visual
pnpm build
pnpm bundle:budget
```

Revisar tamaños gzip/brotli y buscar `nestjs-zod`, `@nestjs/`, `node:` o polyfills inesperados dentro del bundle.

## Anti-patrones

- Lighthouse como única prueba.
- `aria-*` para reparar HTML no semántico.
- Cargar analytics sin consentimiento o clasificación de datos.
- Lazy loading de todo, incluido contenido crítico.
- Canonical ficticio o sitemap de rutas privadas.
- Aprobar snapshot visual sin inspección.

## Definition of Done

- Ruta clasificada y política de indexación coherente.
- Teclado, focus y nombres accesibles revisados.
- Build y budgets verdes.
- Cambios de rendimiento comparados con evidencia.
- Limitaciones manuales/RUM reportadas con precisión.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Calidad, SEO, Accesibilidad Y Rendimiento

✅ **Correcto:** Para **Calidad, SEO, Accesibilidad Y Rendimiento**, reutilizar contratos, separar API client y hooks con errores y cache invalidada.

❌ **Incorrecto:** En **Calidad, SEO, Accesibilidad Y Rendimiento**, hacer fetch directamente en componentes o llamar store/index a casos de uso.

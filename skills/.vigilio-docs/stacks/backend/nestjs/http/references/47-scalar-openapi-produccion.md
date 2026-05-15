# Scalar y OpenAPI seguros en produccion

Scalar es una UI para explorar el contrato OpenAPI; no es la fuente de verdad del contrato. El
documento OpenAPI se genera desde NestJS, se prueba y se publica como artefacto versionado.

## Decision

La referencia API debe ser autocontenida y usar solo recursos del mismo origen:

- prohibido cargar JavaScript, CSS, fuentes, logos o favicons desde CDN;
- el bundle standalone de Scalar se fija a una version exacta y se copia durante el build;
- el runtime sirve ese bundle desde una ruta local, por ejemplo `/reference-assets/scalar.js`;
- Scalar obtiene el contrato desde `/openapi.json`, tambien en el mismo origen;
- logo y favicon se sirven como assets locales;
- no se habilitan telemetria, agente IA, fuentes remotas ni persistencia de credenciales;
- la CSP de `/reference` usa un nonce criptografico nuevo por respuesta.

Scalar conserva el nombre de opcion `cdn`, pero una URL relativa como
`/reference-assets/scalar.js` apunta al bundle autoalojado del mismo backend: no realiza ninguna
conexion a un CDN.

No se debe resolver un error CSP agregando `https:` o `unsafe-inline` a `script-src`. Eso convierte
un fallo visible en una dependencia externa y amplia innecesariamente la superficie de ejecucion.

## Dependencias y build reproducible

`@scalar/nestjs-api-reference` es dependencia de runtime porque renderiza el HTML. El paquete que
aporta el bundle del navegador solo se necesita al compilar:

```json
{
  "dependencies": {
    "@scalar/nestjs-api-reference": "VERSION_EXACTA"
  },
  "devDependencies": {
    "@scalar/api-reference": "VERSION_EXACTA"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json && node scripts/copy-scalar-bundle.mjs"
  }
}
```

No usar `latest`, rangos abiertos ni excepciones permanentes a la politica de antiguedad minima. El
lockfile debe pasar la verificacion de supply chain sin allowlists temporales.

Ejemplo de copia durante el build:

```javascript
// scripts/copy-scalar-bundle.mjs
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const entryPoint = import.meta.resolve('@scalar/api-reference');
const source = fileURLToPath(new URL('./browser/standalone.js', entryPoint));
const outputDirectory = path.resolve('dist/assets');

mkdirSync(outputDirectory, { recursive: true });
copyFileSync(source, path.join(outputDirectory, 'scalar.js'));
```

La imagen de produccion incluye `dist/assets/scalar.js`, pero no necesita instalar
`@scalar/api-reference` como dependencia de runtime.

## Configuracion NestJS

El patron central debe separar la creacion del documento de la exposicion HTTP. Asi el export de CI
no registra rutas ni levanta una UI.

```typescript
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import type { Express, RequestHandler } from 'express';

const scalarBundlePath = path.resolve('dist/assets/scalar.js');

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Commerce API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, config);
}

function scalarCsp(nonce: string): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'self'`,
    "script-src-attr 'none'",
    "style-src 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'none'",
    "connect-src 'self'",
    "worker-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

export function setupApiDocumentation(app: INestApplication) {
  const document = createOpenApiDocument(app);
  const expressApp = app.getHttpAdapter().getInstance() as Express;

  expressApp.get('/openapi.json', (_request, response) => {
    response.setHeader('Cache-Control', 'private, max-age=300, must-revalidate');
    response.json(document);
  });

  expressApp.get('/reference-assets/scalar.js', (_request, response, next) => {
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.type('application/javascript');
    response.sendFile(scalarBundlePath, (error) => (error ? next(error) : undefined));
  });

  const reference: RequestHandler = (request, response, next) => {
    const nonce = randomBytes(16).toString('base64');
    response.setHeader('Content-Security-Policy', scalarCsp(nonce));

    apiReference({
      url: '/openapi.json',
      cdn: '/reference-assets/scalar.js',
      nonce,
      theme: 'default',
      pageTitle: 'Commerce API',
      favicon: '/reference-assets/brand-mark.svg',
      customCss: `
        :root { --scalar-font: ui-sans-serif, system-ui, sans-serif; }
        .t-doc__sidebar::before {
          background: url('/reference-assets/brand-logo.svg') left center / contain no-repeat;
          content: '';
          display: block;
          height: 42px;
          margin: 14px var(--scalar-sidebar-padding) 6px;
        }
      `,
      withDefaultFonts: false,
      telemetry: false,
      agent: { disabled: true },
      showDeveloperTools: 'never',
      hideClientButton: true,
      persistAuth: false,
    })(request, response, next);
  };

  app.use('/reference', reference);
  return document;
}
```

`style-src 'unsafe-inline'` queda limitado a la pagina de referencia porque Scalar genera estilos
inline. No autoriza JavaScript inline: `script-src` permanece protegido por nonce y mismo origen.

## Branding

La integracion embebida no expone una propiedad `logo` first-class. Eso no impide personalizarla:

- `favicon` apunta a un SVG local;
- `customCss` aplica paleta, tipografia, espaciado y estados de foco;
- el logo se inserta con CSS usando una URL local;
- los SVG no incluyen scripts, enlaces externos ni fuentes remotas.

El branding no debe modificar el contrato OpenAPI ni ocultar informacion necesaria para operar la
API. Se debe revisar en tema claro, oscuro, viewport movil y escritorio.

## Politica por ambiente

| Ambiente | Politica |
| --- | --- |
| Local | Habilitada para desarrollo; assets siempre locales. |
| Development compartido | Protegida con auth adicional, VPN o allowlist. |
| Staging | Opcional y protegida; se valida el OpenAPI promovido. |
| Production | Deshabilitada por defecto; requiere flag explicito y control de acceso. |

Aunque la UI este deshabilitada, CI puede generar y conservar el artefacto OpenAPI para diff,
clientes y auditoria.

## Checklist verificable

- [ ] El HTML de `/reference` no contiene `http://`, `https://`, `cdn.jsdelivr.net` ni `unpkg.com`.
- [ ] El unico `src` de script apunta a `/reference-assets/scalar.js`.
- [ ] El nonce del HTML coincide con el nonce de la CSP y cambia entre respuestas.
- [ ] `script-src` no contiene `unsafe-inline`.
- [ ] Bundle, logo, favicon y OpenAPI responden desde el mismo origen.
- [ ] `withDefaultFonts`, telemetria y agente remoto estan deshabilitados.
- [ ] `persistAuth` esta deshabilitado para no conservar tokens en el navegador.
- [ ] La documentacion esta apagada por defecto en produccion.
- [ ] Build, typecheck, unit tests, audit de severidad alta y smoke HTTP pasan.
- [ ] La imagen de runtime funciona sin `@scalar/api-reference` instalado.

Referencias oficiales:

- [Configuracion de Scalar API Reference](https://github.com/scalar/scalar/blob/main/documentation/configuration.md)
- [Integracion Scalar con NestJS](https://scalar.com/products/api-references/integrations/nestjs)


## Buenas prácticas y antipatrones

✅ **Correcto:** Servir bundle de Scalar, logo, favicon y fuentes como assets locales del mismo origen con CSP estricta y nonce por respuesta.

❌ **Incorrecto:** Cargar scripts o estilos desde CDNs externos, habilitar telemetría remota o debilitar script-src con unsafe-inline.

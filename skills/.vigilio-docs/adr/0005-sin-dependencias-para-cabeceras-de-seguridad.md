# ADR 0005 - Cabeceras de seguridad sin dependencias externas

## Estado

Aceptado

## Contexto

`bus-impl` no emitia ninguna cabecera de seguridad. La respuesta estandar en Express es `helmet`.

`bus-impl` es una **plantilla**: cada dependencia que incorpore la heredan todos los proyectos
derivados, y cada una es superficie de supply chain que hay que auditar y actualizar para siempre.

Ademas, `helmet` esta pensado para aplicaciones que sirven HTML. Buena parte de lo que activa
(CSP para paginas, `X-XSS-Protection` ya obsoleto y desaconsejado) no aplica a una API JSON.

## Decision

Un middleware propio de unas 50 lineas emite el subconjunto que si aplica a una API que no sirve HTML:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Permissions-Policy` desactivando APIs de navegador que una API nunca necesita
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`
- `Cross-Origin-Opener-Policy` y `Cross-Origin-Resource-Policy` en `same-origin`
- `Strict-Transport-Security` **solo fuera de local**
- eliminacion de `X-Powered-By`

HSTS se omite en local a proposito: emitirlo sobre `http://localhost` puede dejar el dominio fijado en
el navegador del desarrollador y romperle otros proyectos servidos en el mismo host.

`credentials` en CORS pasa a `false`: la autenticacion viaja en el header `Authorization`, no en
cookies, asi que habilitarlo solo ampliaba la superficie CSRF sin que ningun flujo lo necesitara.

## Consecuencias

Beneficios:

- Cero dependencias nuevas en la plantilla base.
- Cada cabecera esta justificada por escrito en el propio archivo, asi que quien herede la plantilla
  entiende que puede quitar y que no.
- Cubierto por tests unitarios, incluida la ausencia de HSTS en local.

Costos y deuda aceptada:

- Mantenimiento propio: si aparece una cabecera nueva relevante, hay que anadirla a mano en vez de
  recibirla con un `helmet` actualizado.
- No cubre casos de aplicaciones que sirvan HTML. Un proyecto derivado que anada SSR debera revisar
  la CSP, que aqui es deliberadamente restrictiva.

## Alternativas consideradas

- **`helmet`.** Razonable y seria la eleccion por defecto en una aplicacion normal. Descartada aqui por
  el efecto multiplicador de anadir dependencias a una plantilla, y porque la mitad de su configuracion
  no aplica a una API JSON.
- **Cabeceras en CloudFront o API Gateway.** Complementario, no sustitutivo: deja la aplicacion sin
  proteccion en local y en cualquier despliegue que no pase por ese borde.
- **No emitir cabeceras** por estar detras de API Gateway. Descartada: defensa en profundidad, y varias
  de estas cabeceras solo tienen sentido emitidas por el origen.

## Fecha

2026-07-26

## Owners

- Equipo: Plataforma
- Responsable: owner de `bus-impl`

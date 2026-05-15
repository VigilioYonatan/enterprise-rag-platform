# Registros de Decisiones de Arquitectura (ADR)

Un ADR documenta **por que** se tomo una decision, no como se implemento. El codigo muestra el como;
el ADR conserva el contexto y las alternativas descartadas, que es lo que se pierde primero.

## Cuando escribir uno

Escribir un ADR cuando la decision:

- es cara de revertir (motor de base de datos, framework, modelo de autenticacion);
- afecta a varios repositorios (formato de contratos, versionado, gobernanza);
- descarta una alternativa obvia y alguien preguntara "por que no X" dentro de seis meses;
- introduce una excepcion deliberada a una regla propia.

No escribir un ADR para elegir el nombre de una variable, anadir un endpoint dentro de un modulo
existente o cualquier cosa que el codigo explique por si solo.

## Formato

Copiar [`0000-template.md`](./0000-template.md) y numerar de forma correlativa. Los ADR no se
editan una vez aceptados: si una decision cambia, se escribe uno nuevo que **supersede** al anterior
y se actualiza el estado del viejo. El historial es el valor.

## Indice

| ADR | Titulo | Estado |
| --- | --- | --- |
| [0001](./0001-contratos-generados-desde-backend.md) | Contratos generados desde el backend en vez de escritos a mano | Aceptado |
| [0002](./0002-refresh-token-rotacion-con-estado.md) | Refresh tokens con rotacion y estado en base de datos | Aceptado |
| [0003](./0003-rate-limiting-en-postgresql.md) | Rate limiting de autenticacion respaldado en PostgreSQL | Aceptado |
| [0004](./0004-tooling-como-paquetes-versionados.md) | Tooling de plataforma como paquetes versionados | Aceptado |
| [0005](./0005-sin-dependencias-para-cabeceras-de-seguridad.md) | Cabeceras de seguridad sin dependencias externas | Aceptado |
| [0006](./0006-lineas-contractuales-web-legacy-y-k8s-v2.md) | Registro anterior de lineas web | Reemplazado |
| [0007](./0007-web-mfe-v2-kubernetes-materializado.md) | web-mfe-v2 materializado sobre Kubernetes | Aceptado |

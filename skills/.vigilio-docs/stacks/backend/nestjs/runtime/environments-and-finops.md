# NestJS: ambientes, configuración, costos y operación

## Ambientes y ownership

Local/dev/test/staging/prod pueden usar cuentas/redes/secretos diferentes; el runtime real se determina en cada consumidor. No mezclar datos productivos en entornos bajos. Las variables de configuración se validan con schema y la identidad de workload se administra en plataforma.

## Costos

Pino/OTel, PostgreSQL, Valkey y red son recursos observables y tienen costo. Métricas de uso por producto, despliegue y capacidad; presupuestos y alertas por stage. Reglas propias de Lambda se consultan en `platform/aws`, no se imponen al backend NestJS genérico.

✅ Correcto: budget, métricas p95 y costo/request medidos antes y después de una optimización.

❌ Incorrecto: copiar secretos entre ambientes, asumir `production` por valor default o elegir runtime solo por costo teórico.

[Catálogo Node](../../../../technology/catalog/nodejs.md), [FinOps AWS](../../../../platform/aws/finops.md).

## Procedencia documental preservada

- [Capítulo heredado: 3-ambientes-trabajo.md](../../../../platform/cicd/references/3-ambientes-trabajo.md) — contenido íntegro conservado.
- [Capítulo heredado: 30-learn-aws-finops.md](../../../../platform/aws/references/30-learn-aws-finops.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../../governance/complete-work-coverage-policy.md).


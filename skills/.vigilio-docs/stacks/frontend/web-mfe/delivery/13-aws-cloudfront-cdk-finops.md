# AWS, CloudFront, CDK Y FinOps Frontend

## Arquitectura base

```text
usuario
  -> CloudFront + WAF según stage/riesgo
    -> S3 privado mediante Origin Access Control

CloudFront/S3 logs
  -> bucket o pipeline de observabilidad con lifecycle
```

## S3

- Block Public Access.
- Cifrado y `enforceSSL`.
- Acceso únicamente mediante CloudFront/OAC.
- Versionado y retention según ambiente.
- Access logs en bucket separado.
- Lifecycle para controlar costo.
- `RemovalPolicy` explícita por stage.

## CloudFront

- Redirect HTTP a HTTPS.
- TLS moderno y certificado ACM para dominios propios.
- Compresión.
- Assets hasheados con caché larga e immutable.
- `index.html` y runtime config con caché corta/no-cache según rollout.
- Response headers policy versionada en CDK.
- SPA fallback evaluado para no ocultar 404 o recursos sensibles.

## Headers

- CSP.
- HSTS.
- `X-Content-Type-Options`.
- Frame options/`frame-ancestors`.
- Referrer Policy.
- Permissions Policy.
- `X-Robots-Tag` para backoffice y previews.

El smoke remoto debe verificar headers reales. `cdk synth` solo prueba intención de infraestructura.

## WAF

Usar reglas administradas en staging/production cuando el threat model y costo lo justifican. Development/test pueden evitar costo recurrente si no están expuestos a tráfico externo sensible.

## CDK

- TypeScript estricto.
- Tags de aplicación, servicio, stage y ownership.
- `cdk-nag` en CI.
- Contexto/stage explícito.
- Outputs para bucket, distribución y URL.
- Diff y approval para cambios de alto impacto.

No usar suppressions de `cdk-nag` sin razón específica y revisable.

## Deploy de assets

- Subir primero assets hasheados.
- Publicar HTML/runtime config al final.
- No borrar indiscriminadamente versiones necesarias para rollback.
- Invalidar solo HTML/config o rutas afectadas.
- No publicar source maps si contienen información no aprobada.

## Costos

### S3

- Mantener artifacts pequeños.
- Lifecycle de logs y versiones.
- Evitar duplicar assets entre previews sin política de limpieza.

### CloudFront

- Caché alta para assets inmutables.
- Price class según audiencia.
- Invalidaciones acotadas.
- Compresión y formatos modernos.

### CI/CD

- Cache de pnpm seguro y reproducible.
- Jobs por paths/riesgo sin saltar required gate.
- Reutilizar artifact entre stages.
- Retention razonable para reportes.

### Observabilidad

- Sampling y retención por ambiente.
- Métricas/logs de baja cardinalidad.
- Budgets y alarmas AWS.
- No activar varios proveedores sin ownership.

### Preview

- Cleanup al cerrar PR.
- TTL/lifecycle.
- WAF y dominios solo si el riesgo lo requiere.
- Cost allocation tags.

## Evidencia

```bash
pnpm cdk:synth
pnpm build
pnpm bundle:budget
APP_BASE_URL=https://... pnpm smoke:remote
```

## Estado honesto

Una plantilla CDK sintetizada no equivale a despliegue exitoso. Para afirmar production-ready se necesita deploy real, smoke, logs, alertas, rollback y responsables operativos.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — AWS, CloudFront, CDK Y FinOps Frontend

✅ **Correcto:** Para **AWS, CloudFront, CDK Y FinOps Frontend**, limitar roles cloud, medir el coste y utilizar enlaces a las guías AWS propietarias.

❌ **Incorrecto:** En **AWS, CloudFront, CDK Y FinOps Frontend**, copiar credenciales AWS, inventar precios o meter la configuración cloud dentro del modelo de negocio.

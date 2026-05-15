# Contexto Dinámico De Plataforma

`.vigilio/platform-context.yaml` es un contrato opcional para declarar nombres y capacidades del consumidor sin hardcodearlos dentro de skills o documentos canónicos.

## Precedencia

1. Contexto explícito validado contra el esquema.
2. Manifiestos detectados en el repositorio.
3. Inferencia segura y trazable.
4. `NOT_RUN` si una decisión crítica continúa siendo ambigua.

El contexto no sustituye a las fuentes ejecutables. Si declara `provider: onprem` pero los manifiestos aprovisionan AWS, el agente debe detenerse y reportar la contradicción.

## Ejemplo

Consulta [`platform-context.example.yaml`](../../examples/platform-context.example.yaml). Los valores son ilustrativos y deben adaptarse al consumidor.

```yaml
schemaVersion: 1
project:
  name: ecommerce
  type: platform
repositories:
  application: apps
  infrastructure: infra
  gitops: deploy
  images: docker
environments: [local, development, staging, production]
delivery:
  provider: gitlab
  gitopsEngine: argocd
  containerRegistry: registry.example.com
infrastructure:
  provider: onprem
  kubernetesDistribution: rke2
labs:
  standard: prod-local
  runtimeSecurity: labs/runtime-security
```

## Reglas

- Las rutas deben ser relativas al repositorio y no pueden contener `..`.
- Los nombres usan kebab-case y no contienen identificadores secretos.
- `containerRegistry` declara un host, no credenciales ni tokens.
- Un campo omitido se detecta de forma segura; nunca se inventa.
- Los valores resueltos deben aparecer en la evidencia del plan antes de mutar infraestructura.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Declarar el contexto mínimo necesario, validarlo y permitir que los manifiestos reales confirmen sus valores.
- ❌ **Incorrecto:** Copiar nombres de empresas o laboratorios desde la documentación y utilizarlos como recursos reales sin comprobar el consumidor.

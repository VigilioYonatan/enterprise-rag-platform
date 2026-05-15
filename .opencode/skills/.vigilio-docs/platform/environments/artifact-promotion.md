# Promoción De Artefactos E Inmutabilidad En GitOps

Establece las directrices para la construcción única de imágenes de contenedor, aislamiento de entornos y promoción verificable a través de gates de entrega continua.

## El Principio: Construir Una Sola Vez, Promover Muchas

Un artefacto de software (imagen OCI, chart de Helm o binario) debe compilarse exclusivamente una única vez en el pipeline de Integración Continua del repositorio de origen. Está terminantemente prohibido compilar de nuevo el código fuente en Staging o Producción.

```text
Código Fuente (apps/*)
       │
       ▼  (CI Build Único)
Imagen OCI generada (@sha256:d8b74...)
       │
       ├──> Firma Cosign con OIDC (Keyless)
       ├──> Generación de SBOM (Syft) y escaneo de vulnerabilidades
       │
       ▼  (Promoción GitOps: PR automático en environments/staging)
  staging/kustomization.yaml (asigna digest @sha256:d8b74...)
       │
       ▼  (Smoke tests automáticos + Aprobación de SLO en Staging)
  production/kustomization.yaml (promueve el MISMO digest @sha256:d8b74...)
```

## Jerarquía De Entornos Y Aislamiento Estricto

La progresión de artefactos sigue una jerarquía formal unidireccional:
1. **Prod-Local:** Simulación local en clúster Kind con paridad de infraestructura.
2. **Review:** Entornos efímeros por Pull Request para validación funcional.
3. **Staging:** Réplica de pre-producción con datos sintéticos representativos y pruebas automatizadas.
4. **Producción:** Despliegue multi-región / multi-clúster con alta disponibilidad.

### Aislamiento de Red y Almacenamiento
- Ningún entorno previo (Review, Dev o Staging) puede comunicarse directamente con bases de datos, colas o almacenamiento de Producción.
- Las credenciales y configuraciones deben externalizarse mediante `secretKeyRef`, AWS Secrets Manager o `SealedSecrets`. Queda estrictamente prohibido commitear contraseñas o variables sensibles en texto plano dentro de los manifiestos de despliegue.

## Flujo De Promoción Declarativa Por Digest Inmutable

1. **Digest Criptográfico SHA-256:**
   Los manifiestos de Kustomize y Helm en producción referencian el artefacto obligatoriamente por su digest inmutable (`digest: sha256:...`). Queda prohibido el uso de tags móviles como `latest`, `staging`, `main` o tags mutables de versión.

2. **Verificación de Recompilación:**
   El pipeline de promoción comprueba que el digest del artefacto en producción sea idéntico al verificado en staging (`sourceDigest === targetDigest`). Si se detecta una recompilación (`rebuiltInTargetEnvironment: true`), el gate bloquea la promoción de inmediato.

3. **Demostración Operativa (Gate de Promoción):**
   La evidencia de validación se registra formalmente en `reports/promotion-gate-evidence.json`:
   - Pruebas sintéticas y de humo ejecutadas exitosamente en staging (`stagingSmokeTestsPassed: true`).
   - Verificación de no degradación del presupuesto de error (`sloBudgetApproved: true`).
   - Comprobación de existencia y firma del digest en el registro OCI (`registryDigestVerified: true`).
   - **Fail-Closed:** Si el registro de contenedores no está accesible o falta el reporte de pruebas en staging, el gate emite `NOT_RUN` y aborta la promoción.

## Matriz De Decisiones De Promoción

| Dimensión | Opción Recomendada | Alternativa Restringida | Razón Técnica y Riesgo |
|---|---|---|---|
| **Inmutabilidad** | Digest `sha256:...` en manifiestos | Tags mutables (`latest`, `staging`) | Los tags móviles pueden sobrescribirse y causar inconsistencias entre réplicas del clúster. |
| **Ciclo de Build** | Compilación única en CI de origen | Recompilación por entorno | Recompilar genera binarios con distintos checksums y librerías, invalidando las pruebas previas. |
| **Aislamiento DB** | Bases de datos sintéticas aisladas | Staging apuntando a DB de producción | Conectar entornos de prueba a datos reales viola normativas de privacidad y arriesga corrupción de datos. |
| **Secretos** | Inyección externa (`secretKeyRef`, SSM) | Contraseñas en texto plano en YAML | Los secretos en manifiestos quedan expuestos en el historial Git y violan cumplimiento PCI-DSS. |

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Promover el mismo digest SHA-256 verificado en Staging hacia Producción mediante un commit declarativo en el repositorio GitOps.
- ❌ **Incorrecto:** Reconstruir imágenes de Docker en cada entorno o usar tags mutables como `latest` en producción.
- ✅ **Correcto:** Exigir reportes de smoke tests y verificación en el registro OCI antes de autorizar la promoción a producción.
- ❌ **Incorrecto:** Permitir que staging comparta la base de datos de producción o saltarse gates de verificación asumiendo estabilidad.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

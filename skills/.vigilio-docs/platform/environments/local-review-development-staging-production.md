# Progresión De Entornos: Local, Review, Dev, Staging Y Producción

Define la jerarquía, ciclo de vida y criterios de paridad técnica entre todos los entornos operativos de la plataforma Vigilio.

## Ciclo De Vida Y Propósito De Los Entornos

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  prod-local  │ ──> │    Review    │ ──> │     Dev      │ ──> │   Staging    │ ──> │  Producción  │
│(Kind/Docker) │     │ (Efímero PR) │     │(Integración) │     │ (Pre-Prod)   │     │ (Multi-AZ)   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

1. **`prod-local` (Estación de Trabajo):** Simula en Docker/Kind la arquitectura de producción completa (PostgreSQL, Valkey, OTel, Ingress, eBPF Tetragon). Permite validar cambios antes de abrir un Pull Request.
2. **`Review` (Entornos Efímeros por PR):** Desplegados dinámicamente mediante Kubernetes Namespaces o vClusters por cada PR activo. Destruidos automáticamente al cerrar el PR.
3. **`Development` (Integración Continua):** Entorno compartido para pruebas continuas de interacción entre microservicios y despliegues automáticos desde la rama de integración.
4. **`Staging` (Espejo de Pre-Producción):** Réplica exacta de topología, cuotas de recursos y políticas de seguridad de producción. Utiliza bases de datos aisladas con esquemas migrados y datos sanitizados.
5. **`Producción` (Carga Real):** Entorno altamente disponible, multi-AZ, con cifrado estricto en tránsito y en reposo, escalado horizontal KEDA/HPA y auditoría eBPF activa.

## Criterios De Paridad Técnica

- **Imágenes Inmutables:** La misma imagen de contenedor probada en `prod-local` y `staging` debe ser promovida a `producción`. Nunca se recompila código para un entorno superior.
- **Inyección Externa de Configuración:** Las diferencias entre entornos se gestionan exclusivamente mediante ConfigMaps, Secrets gestionados (AWS Secrets Manager / Vault) y variables de entorno.
- **Topología de Red Aislada:** Cada entorno en la nube reside en VPCs o cuentas AWS independientes para evitar blast-radius cruzado.

## ✅ Correcto / ❌ Incorrecto

- ✅ **Correcto:** Promover el mismo digest SHA-256 de imagen de contenedor a través de Staging hacia Producción tras superar gates automáticos.
- ❌ **Incorrecto:** Reconstruir la imagen de Docker en cada entorno con tags flotantes como `staging-latest` o `prod-latest`.
- ✅ **Correcto:** Garantizar que los límites de CPU y memoria en Staging sean proporcionales a Producción para detectar fugas de recursos y OOMKilled antes del release.
- ❌ **Incorrecto:** Conectar aplicaciones en desarrollo o staging a bases de datos o brokers de mensajes de producción.

# 13 — Riesgos y Decisiones de Arquitectura

## Decisiones Principales (ADRs)
1. **Rootless Podman en vez de Docker root**: Evita privilegios de superusuario en el daemon de contenedores, mitigando riesgos de escape de contenedor.
2. **RustFS en vez de MinIO**: Licencia Apache-2.0 permissiva sin restricciones AGPL-3.0 y compatible con S3 SigV4.
3. **FORCE ROW LEVEL SECURITY**: Previene fugas accidentales de datos si la aplicación consulta tablas directamente sin filtrar por tenant.
4. **Outbox Pattern Transaccional**: Garantiza que ningún evento de procesamiento se pierda en caso de fallo del worker o broker.

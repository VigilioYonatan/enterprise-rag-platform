# 07 — DevSecOps, Rootless Podman y Compose

## Infraestructura Cloud-Neutral
- **Rootless Podman Compose**: Ejecución de contenedores en espacio de usuario sin privilegios root (`rootless`).
- **Segmentación de Redes**:
  - `edge`: Comunicación entre Caddy y servicios web/API.
  - `backend`: Red interna (`internal: true`) para PostgreSQL, Valkey, ClamAV y RustFS. Sin acceso a internet ni mapeo de puertos hacia el host.
  - `observability`: Red interna (`internal: true`) para Prometheus, Loki, Alloy y Tempo.
- **RustFS S3**: Implementación Apache-2.0 de almacenamiento de objetos, reemplazando MinIO.
- **Caddy Reverse Proxy**: Terminación TLS automática, cabeceras de seguridad CSP y compresión zstandard.

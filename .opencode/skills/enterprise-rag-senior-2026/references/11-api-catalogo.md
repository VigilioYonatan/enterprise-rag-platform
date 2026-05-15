# 11 — Catálogo de Endpoints de la API

La API cuenta con 43 endpoints OpenAPI 3.1 completamente tipados:
- `/api/v1/auth/*`: Sesión, login, logout, perfil y JWKS.
- `/api/v1/tenants/*`: Listado, creación, membresías y eliminación de miembros.
- `/api/v1/knowledge-bases/*`: Creación, actualización (PATCH) y borrado de bases de conocimiento.
- `/api/v1/documents/*`: Subida de archivos, ingestión de texto, versiones v1..vn, permisos individuales y grupales.
- `/api/v1/retrieval/*`: Búsqueda híbrida y respuestas aumentadas por recuperación en streaming.
- `/api/v1/conversations/*`: Gestión de hilos conversacionales y respuestas interactivas.
- `/api/v1/evaluation/*`: Datasets, casos de prueba y reportes métricos de precisión.
- `/api/v1/operations/*`: Inspección y replay de DLQ, control de límites presupuestarios.
- `/api/v1/audit/*`: Registro de auditoría inmutable de accesos y mutaciones.

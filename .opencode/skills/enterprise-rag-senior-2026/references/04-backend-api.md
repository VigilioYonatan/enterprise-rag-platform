# 04 — Backend API, DTOs y Módulos

## Estructura Modular NestJS
- `AuthModule`: Guardias JWT (`JwtGuard`), verificación OIDC con Keycloak (`RS256`), extracción de tenant, usuario y roles.
- `TenantsModule`: Gestión de inquilinos, membresías y asignación de roles.
- `KnowledgeModule`: Creación, modificación (PATCH) y eliminación (DELETE) de bases de conocimiento.
- `DocumentsModule`: Gestión de documentos, versiones v1..vn, ingesta de archivos y texto plano, ACL individual y por grupos.
- `RetrievalModule`: Búsqueda híbrida (FTS + pgvector) y streaming de respuestas con citas (`/stream`).
- `ConversationsModule`: Hilos de conversación interactivos y streaming de turnos (`/conversations/:id/messages/stream`).
- `EvaluationsModule`: Datasets, casos de prueba sintéticos y corridas de evaluación RAG (Recall, MRR, nDCG, Groundedness).
- `OperationsModule`: Dead-Letter Queue (DLQ), reintento de tareas fallidas, FinOps y límites de presupuesto atómicos.
- `AuditModule`: Trazabilidad inmutable de eventos del sistema con paginación offset estándar.

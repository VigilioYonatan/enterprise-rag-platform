# API real implementada — `/api/v1` — contrato de revisión

Este catálogo corresponde a los controllers presentes en código. Los handlers protegidos requieren `Authorization: Bearer <OIDC access_token>`, JWT con audiencia `enterprise-rag-api`, issuer de Keycloak y cliente `enterprise-rag-web`. La autenticación se verifica en servidor; el permiso en SQL y políticas RLS. No confundir la existencia de un handler con una ejecución verificada. OpenAPI disponible en `/api/openapi.json`, UI Scalar en `/api/docs` **con schemas request/response todavía incompletos**; no existe cliente generado listo para release.

| Método | Ruta | Request principal / propósito | Autorización |
|---|---|---|---|
| GET | `/health/live` | proceso levantado | público |
| GET | `/health/ready` | conexión PostgreSQL | público |
| GET | `/me` | `{sub,email}`; crea perfil mínimo | sesión |
| GET | `/tenants` | lista tenants miembros | membresía RLS |
| POST | `/tenants` | `{name}` | usuario autenticado |
| GET | `/tenants/:id/members` | miembros/roles | miembro |
| POST | `/tenants/:id/members` | `{email,role}`; usuario existente | manager |
| PATCH | `/tenants/:id/members/:user` | `{role}` | owner |
| GET | `/tenants/:id/groups` | grupos | miembro |
| POST | `/groups` | `{tenant_id,name}` | manager |
| GET | `/groups/:id/members` | miembros grupo | miembro |
| POST | `/groups/:id/members` | `{user_sub}` | manager |
| GET | `/knowledge-bases?tenant_id=UUID` | lista de KB | miembro |
| POST | `/knowledge-bases` | `{tenant_id,name}` | manager |
| GET | `/knowledge-bases/:id/documents` | documentos visibles | ACL y RLS |
| POST | `/knowledge-bases/:id/documents` | `{title,text,visibility}` | manager |
| POST | `/knowledge-bases/:id/uploads` | `multipart/form-data`: `file,title,visibility`; 20 MB | manager |
| GET | `/documents/:id` | metadatos, estado, versión | ACL actual |
| GET | `/documents/:id/versions` | versiones | ACL / owner |
| GET | `/documents/:id/chunks` | fragmentos indexados | ACL actual |
| GET | `/documents/:id/download` | original `application/octet-stream` | ACL y ready |
| GET | `/documents/:id/access` | grants usuarios | propietario |
| PUT | `/documents/:id/access` | `{user_subs:[...]}`; reemplazo atómico | propietario |
| GET | `/documents/:id/group-access` | grants de grupos | propietario |
| PUT | `/documents/:id/group-access` | `{group_ids:[...]}` | propietario |
| GET | `/documents/:id/ingestion` | estado de job | propietario |
| POST | `/documents/:id/ingestion/retry` | reintento si falló | propietario |
| DELETE | `/documents/:id` | baja lógica/revocación | propietario |
| POST | `/retrieval/search` | `{knowledge_base_id,query}` | FTS/vector con RLS |
| POST | `/answers/stream` | SSE autenticado de fases y respuesta final tras revalidación de ACL | sesión + RLS + cuota |
| POST | `/answers` | `{knowledge_base_id,question}` | RLS, cuota, evidencia |
| GET | `/conversations` | `?knowledge_base_id=UUID` | creador |
| POST | `/conversations` | `{knowledge_base_id,title}` | miembro |
| GET | `/conversations/:id` | mensajes y citas autorizadas | creador |
| POST | `/conversations/:id/messages` | `{question}`; mensaje y respuesta | creador |
| GET | `/conversations/:id/citations/:citationId` | resuelve evidencia vigente | creador + ACL + versión |
| GET | `/evaluation/datasets` | `?tenant_id=UUID` | dueño dataset y tenant |
| POST | `/evaluation/datasets` | `{tenant_id,knowledge_base_id,name}` | manager |
| GET | `/evaluation/datasets/:id/cases` | ground truth | dueño dataset |
| POST | `/evaluation/datasets/:id/cases` | `{question,expected_document_ids,expected_abstention?}` | dueño dataset |
| GET | `/evaluation/runs` | `?tenant_id=UUID` | dueño dataset |
| POST | `/evaluation/runs` | `{dataset_id}` | dueño dataset |
| GET | `/evaluation/runs/:id` | Recall@6, MRR@6, nDCG@6, precision@6, expected-abstention y casos | dueño dataset |
| GET | `/usage/summary` | `?tenant_id=UUID` | manager |
| GET | `/usage/budget` | `?tenant_id=UUID` | miembro |
| PUT | `/usage/budget/:id` | `{daily_answer_limit,daily_cost_limit_usd?}` | manager |
| GET | `/audit/events` | `?tenant_id=UUID` | manager |

`GET /metrics` usa red interna de Compose y **no** la publica Caddy por la ruta `/api/*`.

## Ejemplos de requests

```json
{"knowledge_base_id":"00000000-0000-4000-8000-000000000001","query":"Política de retención documental"}
```

```json
{"question":"¿Qué procedimiento se aplica?","expected_document_ids":["00000000-0000-4000-8000-000000000002"]}
```

## Lo que falta para congelar un contrato enterprise

- Generación exacta de schemas de request/response desde DTOs Zod propietarios, export con `openapi.json` comprobado, diff breaking-change en CI y cliente TypeScript generado; la UI actual mantiene algunos tipos de respuesta locales.
- Endpoint incremental real de streaming SSE con cancelación (la generación actual utiliza request HTTP completo).
- Paginación y sort por cursor para grandes colecciones (ahora límites de página fija y pequeños datasets).
- Ratios, schemas de error OpenAPI y pruebas de contratos consumidor/proveedor. Estos son gates de release; no afirmar que existen.

**Nota de seguridad SSE:** el servidor emite únicamente estados de trabajo y la respuesta final, después de revalidar toda la evidencia. No emite tokens del modelo antes de comprobar posibles revocaciones.

# UX/UI implementada — React + Tailwind 4

## Direccionalidad

Consola de gobierno documental; base clara, contraste alto, acento azul petróleo, tarjetas de información densidad moderada, bordes suaves y responsive (`320px` en adelante). CSS fuente: `apps/enterprise-rag-web/src/styles/app.css`, con `@theme` Tailwind 4 y tokens semánticos. En móvil la navegación pasa de sidebar a acciones horizontales; en escritorio incluye sidebar, topbar, breadcrumb contextual y panel de evidencia adyacente al chat.

## Rutas existentes

| Ruta | Vista | Interacciones |
|---|---|---|
| `/` | Bienvenida / Login | redirección Keycloak OIDC |
| `/auth/callback` | Callback OIDC | completar sesión / error |
| `/app` | Overview | métricas/resumen |
| `/app/knowledge` | Bases de conocimiento | crear tenant y base (RHF/Zod) |
| `/app/knowledge/:id` | Documentos | cargar archivo, crear texto, estado y lista |
| `/app/documents/:id` | Detalle documental | fragmentos, versiones, descarga, permisos, reintento y baja |
| `/app/assistant` | Consulta RAG | búsqueda/respuesta con citas, abstención |
| `/app/conversations` | Conversaciones | lista, creación |
| `/app/conversations/:id` | Conversación | preguntar, historial y click en fuentes |
| `/app/evaluations` | Evaluación | datasets, casos, correr Recall@6/MRR@6 |
| `/app/operations` | Operaciones | presupuesto, uso y audit trail |
| `/app/security` | Gobierno | miembros, grupos, roles y asignaciones |
| `*` | Error 404 | volver a consola |

## Reutilización y responsabilidades

- `src/libs/ui/button.tsx`: interfaz consistente con props nativos, pending y disabled.
- `src/libs/ui/field.tsx`: label, asociación input-ref (React Hook Form), errores `aria-invalid`.
- `src/libs/ui/panel.tsx`: contenedor semántico para tarjetas de contenido.
- `src/libs/ui/feedback.tsx`: PageHeader, Loading, ErrorState, EmptyState.
- `src/services/api.ts`: cliente HTTP, Bearer token, errores seguros y descarga binaria.
- Componentes de negocio, schemas y mutations pertenecen a `src/features/<nombre>`; **sin `packages/ui` global**.

## Reglas de forms/data

- Formularios con RHF + Zod, `zodResolver` y mensajes para errores; backend valida nuevamente con Zod.
- TanStack Query para caché de servidor; scopes de query incluyen tenant/KB cuando aplican.
- Los uploads validan tamaño local y server, reciben respuesta tras persistir el job, no inventan progreso de OCR/embedding.
- Acciones destructivas implican permiso de backend. Rechazos 401/403/404 no revelan información documental.
- Estados loading, error, empty, disabled y abstained se representan visualmente.
- La app usa `aria-live` para historial, foco visible y `prefers-reduced-motion`.

## Gates UX no verificados

Auditoría WCAG 2.2 AA real con lector de pantalla, contrastes calculados, zoom 200%, dark mode, nacionalización de idiomas, accesibilidad de los componentes en browser real y pruebas Playwright del flujo autenticado. La implementación actual no demuestra esos gates.

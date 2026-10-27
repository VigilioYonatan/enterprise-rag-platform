# Flujos UX/UI operativos

1. **Ingreso**: pantalla de bienvenida → Keycloak OIDC + PKCE → callback → consola. Errores de OIDC se presentan en callback.
2. **Conocimiento**: crear tenant → knowledge base → subir archivo/pegar texto → status de worker (poll cada 5 s) → ver fragmentos, versiones y descargar original autorizado.
3. **Gobierno**: miembros (usuario debe iniciar sesión antes), crear grupo y asignarle usuario → propietario asigna grants individuales/grupales al documento → revocación efectiva en RLS.
4. **Asistencia**: seleccionar KB → búsqueda/respuesta con abstención y citas; opción conversación persistente → inspector de fuente comprueba acceso actual al pulsar cita.
5. **Evaluación**: crear dataset → casos con pregunta y IDs de documentos relevantes accesibles → ejecutar test de retrieval → tabla con Recall@6 y MRR@6 persistidos.
6. **Operación**: manager consulta agregados de uso, actualiza presupuesto diario y revisa auditoría sin contenido sensible.

## Sistema de diseño

Tailwind CSS 4 con tokens semánticos en `src/styles/app.css`; componentes `Button`, `Field` con `forwardRef`, `Panel`, estados `Loading`, `EmptyState` y `ErrorState`; features poseen sus propios componentes de negocio.
Estados: loading, error, empty, success, validating, disabled, unauthorized. Objetivo WCAG 2.2 AA; pruebas manuales de lector de pantalla y contraste siguen NOT_RUN. El modo responsive se implementa con breakpoints y navegación lateral convertida a navegación superior en móvil.

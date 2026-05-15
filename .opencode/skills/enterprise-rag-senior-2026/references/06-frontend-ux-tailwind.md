# 06 — Frontend, UX/UI, Tailwind 4 y Contratos

## Tecnologías Principales
- React 19 + TypeScript en modo estricto.
- Tailwind CSS 4 con variables de tokens de diseño semánticos (`--color-surface`, `--color-border`, etc.).
- TanStack Query 5 con claves segmentadas por usuario y desalojo automático al cerrar sesión.
- React Hook Form + Zod 4 para validación síncrona en cliente con mensajes de error accesibles.

## Principios de Accesibilidad
- Primitivas UI con `role="alertdialog"`, trampas de foco y soporte para tecla `Escape` en `ConfirmDialog`.
- Enlace de salto de navegación `<a href="#main-content">`.
- Títulos de documento dinámicos en cada cambio de vista.
- Botones accesibles con `type="button"` por defecto.

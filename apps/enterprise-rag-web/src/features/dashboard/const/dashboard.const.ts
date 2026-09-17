import { BookOpen, LockKeyhole, SearchCheck } from 'lucide-react';

export const DASHBOARD_CARDS = [
  {
    icon: BookOpen,
    title: 'Bibliotecas privadas',
    detail: 'Crea bases con documentos públicos del tenant o privados con ACL explícito.',
    to: '/app/knowledge',
  },
  {
    icon: SearchCheck,
    title: 'Respuestas trazables',
    detail: 'Consulta con citas revalidadas contra permisos y versión documental.',
    to: '/app/assistant',
  },
  {
    icon: LockKeyhole,
    title: 'Control de acceso',
    detail: 'Keycloak OIDC, JWT RS256 y políticas PostgreSQL FORCE RLS.',
    to: '/app/security',
  },
] as const;

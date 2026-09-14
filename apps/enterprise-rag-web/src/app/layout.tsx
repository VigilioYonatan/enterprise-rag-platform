import {
  ChartNoAxesCombined,
  FlaskConical,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  MessageSquare,
  MessagesSquare,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import { logout } from '../auth/oidc';
import { BrandLogo } from '../libs/ui/brand-logo';
import { Modal } from '../libs/ui/modal';
import { PageSkeleton } from '../libs/ui/skeleton';
import { ThemeToggle } from '../libs/ui/theme-provider';
import { api } from '../services/api';

const NAVIGATION_SECTIONS = [
  {
    title: 'Plataforma',
    items: [
      { to: '/app', label: 'Resumen', icon: LayoutDashboard, end: true },
      { to: '/app/knowledge', label: 'Bibliotecas', icon: LibraryBig, end: false },
    ],
  },
  {
    title: 'Inteligencia',
    items: [
      { to: '/app/assistant', label: 'Búsqueda y respuesta', icon: MessageSquare, end: false },
      { to: '/app/conversations', label: 'Conversaciones', icon: MessagesSquare, end: false },
      { to: '/app/evaluations', label: 'Evaluaciones', icon: FlaskConical, end: false },
    ],
  },
  {
    title: 'Gobierno',
    items: [
      { to: '/app/operations', label: 'Uso y auditoría', icon: ChartNoAxesCombined, end: false },
      { to: '/app/security', label: 'Identidad', icon: Shield, end: false },
    ],
  },
];

function NavigationMenu({ onItemSelect }: { onItemSelect?: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-6">
      {NAVIGATION_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
            {section.title}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onItemSelect}
                className={({ isActive }) =>
                  `flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-950'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
                  }`
                }
              >
                <item.icon size={17} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Layout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user && !user.expired) void api('/me').catch(() => {});
  }, [user]);

  useEffect(() => {
    if (location.pathname) {
      setMobileMenuOpen(false);
    }
  }, [location.pathname]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6 md:p-10">
        <PageSkeleton label="Cargando sesión…" />
      </main>
    );
  }
  if (!user || user.expired) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-950 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] dark:bg-black dark:text-zinc-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:border focus:border-zinc-300 focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-zinc-950 focus:shadow-lg dark:focus:border-zinc-700 dark:focus:bg-zinc-900 dark:focus:text-zinc-50"
      >
        Saltar al contenido principal
      </a>

      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-zinc-200 lg:bg-white lg:p-5 lg:dark:border-zinc-800 lg:dark:bg-[#050505]">
        <div className="mb-7 flex items-center gap-2.5 px-2 text-base font-bold tracking-tight">
          <BrandLogo sizePixels={28} />
          <span>ATLAS</span>
          <span className="font-mono text-xs font-normal text-zinc-500">/ RAG</span>
        </div>

        <nav aria-label="Navegación principal" className="flex flex-1 flex-col overflow-y-auto">
          <NavigationMenu />
        </nav>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 flex min-h-10 items-center gap-2.5 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
        >
          <LogOut size={16} aria-hidden="true" /> Cerrar sesión
        </button>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-zinc-200/90 bg-white/85 px-4 py-3 backdrop-blur-md sm:px-6 md:px-9 dark:border-zinc-800 dark:bg-black/80">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú de navegación"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-100 lg:hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-sky-700 dark:text-sky-400">
                Enterprise Knowledge
              </p>
              <p className="truncate text-xs text-zinc-600 sm:text-sm dark:text-zinc-400">
                Consola operativa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <span className="max-w-36 truncate rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 font-mono text-xs font-medium text-zinc-800 sm:max-w-56 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {user.profile.email ?? user.profile.sub}
            </span>
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 p-4 outline-none sm:p-6 md:p-9"
        >
          <Outlet />
        </main>
      </div>

      <Modal
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        size="drawer"
        title="ATLAS / RAG"
        description="Navegación Zero Trust"
        footer={
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              void logout();
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <LogOut size={16} aria-hidden="true" /> Cerrar sesión
          </button>
        }
      >
        <nav aria-label="Navegación móvil">
          <NavigationMenu onItemSelect={() => setMobileMenuOpen(false)} />
        </nav>
      </Modal>
    </div>
  );
}

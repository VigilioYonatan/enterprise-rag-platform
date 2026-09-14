import { QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { CallbackPage } from '@/auth/pages/callback-page';
import { LoginPage } from '@/auth/pages/login-page';
import { AuthProvider } from '~/auth/auth-context';
import { queryClient } from '~/auth/query-client';
import { PageSkeleton } from '~/libs/ui/skeleton';
import { ThemeProvider } from '~/libs/ui/theme-provider';
import { ToastProvider } from '~/libs/ui/toast';
import { ErrorBoundary } from './error-boundary';
import { Layout } from './layout';

const DashboardPage = lazy(() =>
  import('@/dashboard/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
);
const KnowledgePage = lazy(() =>
  import('@/knowledge/pages/knowledge-page').then((m) => ({ default: m.KnowledgePage })),
);
const DocumentPage = lazy(() =>
  import('@/documents/pages/document-page').then((m) => ({ default: m.DocumentPage })),
);
const DocumentDetailPage = lazy(() =>
  import('@/documents/pages/document-detail-page').then((m) => ({ default: m.DocumentDetailPage })),
);
const AssistantPage = lazy(() =>
  import('@/chat/pages/assistant-page').then((m) => ({ default: m.AssistantPage })),
);
const ConversationsPage = lazy(() =>
  import('@/conversations/pages/conversations-page').then((m) => ({ default: m.ConversationsPage })),
);
const ConversationDetailPage = lazy(() =>
  import('@/conversations/pages/conversation-detail-page').then((m) => ({
    default: m.ConversationDetailPage,
  })),
);
const EvaluationsPage = lazy(() =>
  import('@/evaluations/pages/evaluations-page').then((m) => ({ default: m.EvaluationsPage })),
);
const OperationsPage = lazy(() =>
  import('@/operations/pages/operations-page').then((m) => ({ default: m.OperationsPage })),
);
const SecurityPage = lazy(() =>
  import('@/security/pages/security-page').then((m) => ({ default: m.SecurityPage })),
);

function DocumentTitleUpdater() {
  const { pathname } = useLocation();
  useEffect(() => {
    const base = 'Atlas Knowledge — Enterprise RAG';
    if (pathname === '/') document.title = `Acceso · ${base}`;
    else if (pathname.startsWith('/app/knowledge')) document.title = `Bibliotecas · ${base}`;
    else if (pathname.startsWith('/app/documents')) document.title = `Documento · ${base}`;
    else if (pathname.startsWith('/app/assistant')) document.title = `Búsqueda y respuesta · ${base}`;
    else if (pathname.startsWith('/app/conversations')) document.title = `Conversaciones · ${base}`;
    else if (pathname.startsWith('/app/evaluations')) document.title = `Evaluaciones · ${base}`;
    else if (pathname.startsWith('/app/operations')) document.title = `Uso y auditoría · ${base}`;
    else if (pathname.startsWith('/app/security')) document.title = `Identidad y permisos · ${base}`;
    else if (pathname.startsWith('/app')) document.title = `Resumen · ${base}`;
    else document.title = base;
  }, [pathname]);
  return null;
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <BrowserRouter>
                <DocumentTitleUpdater />
                <Suspense
                  fallback={
                    <main className="mx-auto max-w-7xl p-6 md:p-10">
                      <PageSkeleton label="Cargando módulo…" />
                    </main>
                  }
                >
                  <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route path="/auth/callback" element={<CallbackPage />} />
                    <Route path="/app" element={<Layout />}>
                      <Route index element={<DashboardPage />} />
                      <Route path="knowledge" element={<KnowledgePage />} />
                      <Route path="knowledge/:id" element={<DocumentPage />} />
                      <Route path="documents/:id" element={<DocumentDetailPage />} />
                      <Route path="assistant" element={<AssistantPage />} />
                      <Route path="conversations" element={<ConversationsPage />} />
                      <Route path="conversations/:id" element={<ConversationDetailPage />} />
                      <Route path="evaluations" element={<EvaluationsPage />} />
                      <Route path="operations" element={<OperationsPage />} />
                      <Route path="security" element={<SecurityPage />} />
                    </Route>
                    <Route
                      path="*"
                      element={
                        <main className="grid min-h-screen place-items-center p-6">
                          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-2xs dark:border-zinc-800 dark:bg-[#0a0a0a]">
                            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-sky-700 dark:text-sky-400">
                              Error HTTP 404
                            </p>
                            <h1 className="mt-2 text-2xl font-bold text-zinc-950 dark:text-zinc-50">
                              404 · Página no encontrada
                            </h1>
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                              La ruta solicitada no existe o no pertenece a tu consola operativa.
                            </p>
                            <Link
                              to="/app"
                              className="mt-6 inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-900 bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
                            >
                              Regresar a la consola
                            </Link>
                          </div>
                        </main>
                      }
                    />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  );
}

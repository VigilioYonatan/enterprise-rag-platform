import { LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { completeLoginCallback, userManager } from '../../../auth/oidc';
import { Alert } from '../../../libs/ui/alert';
import { Skeleton } from '../../../libs/ui/skeleton';

export function CallbackPage() {
  const nav = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void completeLoginCallback()
      .then(() => {
        if (active) nav('/app', { replace: true });
      })
      .catch((err) => {
        void userManager.getUser().then((current) => {
          if (!active) return;
          if (current && !current.expired) {
            nav('/app', { replace: true });
          } else {
            setError(
              err instanceof Error
                ? err.message
                : 'No se pudo completar la autenticación. Inténtalo de nuevo.',
            );
          }
        });
      });
    return () => {
      active = false;
    };
  }, [nav]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#fafafa] p-6 dark:bg-black">
      {error ? (
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xs dark:border-zinc-800 dark:bg-[#0a0a0a]">
          <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            No pudimos validar tu sesión
          </h1>
          <Alert variant="danger">{error}</Alert>
          <Link
            to="/"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-zinc-900 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
            <LoaderCircle size={24} className="animate-spin text-sky-500" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Validando credenciales corporativas…
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Verificando firma criptográfica RS256 con Keycloak. Un momento por favor.
            </p>
          </div>
          <div className="mx-auto max-w-xs space-y-2 pt-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-3/4 mx-auto" />
          </div>
        </div>
      )}
    </main>
  );
}

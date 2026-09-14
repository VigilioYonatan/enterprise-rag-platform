import { ArrowRight, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { login } from '../../../auth/oidc';
import { getRuntimeConfig } from '../../../config/runtime-config';
import { Alert } from '../../../libs/ui/alert';
import { BrandLogo } from '../../../libs/ui/brand-logo';
import { Button } from '../../../libs/ui/button';
import { ThemeToggle } from '../../../libs/ui/theme-provider';

export function LoginPage() {
  const { googleEnabled, facebookEnabled } = getRuntimeConfig();
  const [loginError, setLoginError] = useState('');

  async function startLogin(provider?: 'google' | 'facebook') {
    setLoginError('');
    try {
      await login(provider);
    } catch (err) {
      setLoginError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con el proveedor de identidad. Verifica tu conexión.',
      );
    }
  }

  return (
    <main className="grid min-h-screen bg-[#fafafa] text-zinc-950 lg:grid-cols-2 dark:bg-black dark:text-zinc-100">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-zinc-200 bg-zinc-950 p-12 text-zinc-50 lg:flex dark:border-zinc-800 dark:bg-[#050505]">
        <div className="flex items-center gap-3 text-base font-bold tracking-tight">
          <BrandLogo sizePixels={28} />
          <span>ATLAS / KNOWLEDGE</span>
        </div>

        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-sky-400">
            <Sparkles size={13} aria-hidden="true" /> Enterprise Intelligence · 2026
          </p>
          <p className="text-5xl leading-[1.1] font-semibold tracking-tight">
            Tu conocimiento. <span className="text-sky-400">Tus reglas.</span>
          </p>
          <p className="max-w-md text-base leading-relaxed text-zinc-400">
            Pregunta a tus documentos corporativos sin perder el control de acceso por fila, las fuentes
            verificables ni la trazabilidad criptográfica.
          </p>
          <div className="grid max-w-lg grid-cols-2 gap-3 pt-2 text-xs text-zinc-300">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
              <p className="font-semibold text-zinc-100">PostgreSQL 17 FORCE RLS</p>
              <p className="mt-1 text-zinc-400">
                Aislamiento por actor y tenant sin posibilidad de bypass lógico.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3.5">
              <p className="font-semibold text-zinc-100">ClamAV + SHA-256</p>
              <p className="mt-1 text-zinc-400">
                Cuarentena obligatoria y deduplicación criptográfica en cada ingestión.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-300">
          <span>Keycloak 26 · OIDC RS256 PKCE</span>
          <span>Zero-Trust Enterprise Edition</span>
        </div>
      </section>

      <section className="flex flex-col justify-between p-6 sm:p-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm font-semibold tracking-tight lg:hidden">
            <BrandLogo sizePixels={24} />
            <span>ATLAS</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto w-full max-w-sm space-y-6 py-12">
          <div className="space-y-2 text-center lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Iniciar sesión
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Accede con tu cuenta corporativa para consultar las bases de conocimiento de tu organización.
            </p>
          </div>

          {loginError && (
            <Alert variant="danger" title="Error de autenticación">
              {loginError}
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              className="w-full justify-center"
              size="lg"
              data-testid="login-button"
              onClick={() => startLogin()}
            >
              <Lock size={16} aria-hidden="true" />
              <span>Continuar con Keycloak Corporativo</span>
              <ArrowRight size={16} aria-hidden="true" />
            </Button>

            {googleEnabled && (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                size="lg"
                data-testid="google-login-button"
                onClick={() => startLogin('google')}
              >
                <span>Continuar con Google Workspace</span>
              </Button>
            )}

            {facebookEnabled && (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-center"
                size="lg"
                data-testid="facebook-login-button"
                onClick={() => startLogin('facebook')}
              >
                <span>Continuar con Facebook</span>
              </Button>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white/70 p-4 text-xs text-zinc-600 backdrop-blur-xs dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            <p className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-200">
              <ShieldCheck size={14} className="text-emerald-500" aria-hidden="true" />
              Sesión protegida por OIDC PKCE
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
              Los tokens se renuevan silenciosamente en segundo plano. Nunca guardamos contraseñas en el
              navegador.
            </p>
          </div>
        </div>

        <footer className="text-center text-xs text-zinc-600 lg:text-left dark:text-zinc-400">
          <span>&copy; {new Date().getFullYear()} Atlas Knowledge. Todos los derechos reservados.</span>
        </footer>
      </section>
    </main>
  );
}

import { Monitor, Moon, Sun } from 'lucide-react';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'atlas-theme';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (next: ThemeMode) => void;
  toggleTheme: () => void;
}

function readStoredMode(): ThemeMode {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'dark' || raw === 'light' || raw === 'system') {
      return raw;
    }
  } catch {
    // Ignore restricted storage environments
  }
  return 'dark';
}

function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === 'dark' || mode === 'light') {
    return mode;
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export function applyThemeClass(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.dataset.theme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.dataset.theme = 'light';
  }
}

/**
 * Synchronously applies persisted theme before React hydration (CSP-safe: zero inline HTML scripts).
 */
export function applyStoredThemeToDocument(): ResolvedTheme {
  const mode = typeof window !== 'undefined' ? readStoredMode() : 'dark';
  const resolved = resolveMode(mode);
  applyThemeClass(resolved);
  return resolved;
}

const fallbackContext: ThemeContextValue = {
  mode: 'dark',
  resolvedTheme: 'dark',
  setMode: (next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors
    }
    applyThemeClass(resolveMode(next));
  },
  toggleTheme: () => {
    const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
    applyThemeClass(isDark ? 'light' : 'dark');
  },
};

const ThemeContext = createContext<ThemeContextValue>(fallbackContext);

export function ThemeProvider({ children, defaultMode }: { children: ReactNode; defaultMode?: ThemeMode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => defaultMode ?? readStoredMode());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveMode(mode));

  useEffect(() => {
    const nextResolved = resolveMode(mode);
    setResolvedTheme(nextResolved);
    applyThemeClass(nextResolved);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage write errors
    }

    if (mode !== 'system' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const listener = () => {
      const updated = media.matches ? 'light' : 'dark';
      setResolvedTheme(updated);
      applyThemeClass(updated);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      setMode: (next: ThemeMode) => setModeState(next),
      toggleTheme: () => setModeState((current) => (resolveMode(current) === 'dark' ? 'light' : 'dark')),
    }),
    [mode, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, resolvedTheme, setMode, toggleTheme } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
      >
        {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    );
  }

  const options: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Oscuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <fieldset
      aria-label="Selector de tema visual"
      className="inline-flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-950"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            aria-label={`Tema ${opt.label}`}
            onClick={() => setMode(opt.id)}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </fieldset>
  );
}

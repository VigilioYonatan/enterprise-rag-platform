import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastRecord extends ToastInput {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (input: ToastInput) => string;
  dismissToast: (id: string) => void;
}

const noopToastContext: ToastContextValue = {
  toast: () => 'noop',
  dismissToast: () => undefined,
};

const ToastContext = createContext<ToastContextValue>(noopToastContext);

const variantStyles: Record<ToastVariant, { border: string; icon: string; Icon: typeof Info }> = {
  info: {
    border: 'border-zinc-200 dark:border-zinc-800',
    icon: 'text-sky-600 dark:text-sky-400',
    Icon: Info,
  },
  success: {
    border: 'border-emerald-500/35 dark:border-emerald-500/30',
    icon: 'text-emerald-600 dark:text-emerald-400',
    Icon: CheckCircle2,
  },
  warning: {
    border: 'border-amber-500/35 dark:border-amber-500/30',
    icon: 'text-amber-600 dark:text-amber-400',
    Icon: AlertTriangle,
  },
  danger: {
    border: 'border-red-500/40 dark:border-red-500/35',
    icon: 'text-red-600 dark:text-red-400',
    Icon: AlertCircle,
  },
};

let toastSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput): string => {
      toastSeq += 1;
      const id = `toast-${String(toastSeq)}`;
      const record: ToastRecord = {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? 'info',
      };
      setItems((prev) => [...prev.slice(-3), record]);
      const duration = input.durationMs ?? 4200;
      if (duration > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
      return id;
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ toast, dismissToast }), [toast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {items.length > 0 && (
        <section
          aria-label="Notificaciones del sistema"
          aria-live="polite"
          className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2.5 px-2 sm:px-0"
        >
          {items.map((item) => {
            const cfg = variantStyles[item.variant];
            const Icon = cfg.Icon;
            return (
              <output
                key={item.id}
                className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border bg-white/95 p-4 text-sm text-zinc-950 shadow-xl backdrop-blur-md dark:bg-zinc-950/95 dark:text-zinc-50 ${cfg.border}`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Icon size={17} className={`mt-0.5 shrink-0 ${cfg.icon}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug">{item.title}</p>
                    {item.description && (
                      <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Cerrar notificación ${item.title}`}
                  onClick={() => dismissToast(item.id)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                >
                  <X size={14} />
                </button>
              </output>
            );
          })}
        </section>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

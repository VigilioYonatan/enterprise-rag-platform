import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantConfig: Record<
  AlertVariant,
  {
    container: string;
    iconColor: string;
    Icon: typeof Info;
    role: 'alert' | 'status';
  }
> = {
  info: {
    container:
      'border-sky-500/30 bg-sky-50/90 text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/35 dark:text-sky-100',
    iconColor: 'text-sky-600 dark:text-sky-400',
    Icon: Info,
    role: 'status',
  },
  success: {
    container:
      'border-emerald-500/30 bg-emerald-50/90 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/35 dark:text-emerald-100',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    Icon: CheckCircle2,
    role: 'status',
  },
  warning: {
    container:
      'border-amber-500/35 bg-amber-50/90 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/35 dark:text-amber-100',
    iconColor: 'text-amber-600 dark:text-amber-400',
    Icon: AlertTriangle,
    role: 'alert',
  },
  danger: {
    container:
      'border-red-500/35 bg-red-50/90 text-red-950 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-100',
    iconColor: 'text-red-600 dark:text-red-400',
    Icon: AlertCircle,
    role: 'alert',
  },
};

export function Alert({ variant = 'info', title, children, action, onDismiss, className = '' }: AlertProps) {
  const cfg = variantConfig[variant];
  const Icon = cfg.Icon;

  return (
    <div
      role={cfg.role}
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3.5 text-sm ${cfg.container} ${className}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon size={18} className={`mt-0.5 shrink-0 ${cfg.iconColor}`} aria-hidden="true" />
        <div className="min-w-0 space-y-1">
          {title && <p className="font-semibold leading-snug">{title}</p>}
          <div className="leading-relaxed opacity-95">{children}</div>
          {action && <div className="pt-1.5">{action}</div>}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cerrar alerta"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}

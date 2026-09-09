import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg' | 'drawer';
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, description, size = 'md', children, footer }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isDrawer = size === 'drawer';
  const dialogLayout = isDrawer
    ? 'relative z-10 mr-auto flex h-full w-full max-w-xs flex-col border-r border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950'
    : `relative z-10 w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950`;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isDrawer ? 'items-stretch justify-start' : 'items-center justify-center p-4'
      }`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 bg-black/65 backdrop-blur-xs"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={dialogLayout}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent text-zinc-500 hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
          >
            <X size={16} />
          </button>
        </div>
        <div className={isDrawer ? 'mt-4 flex-1 overflow-y-auto' : 'mt-4 max-h-[70vh] overflow-y-auto'}>
          {children}
        </div>
        {footer && (
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2.5 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

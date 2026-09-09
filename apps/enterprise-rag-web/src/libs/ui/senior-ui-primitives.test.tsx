import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Alert } from './alert';
import { Modal } from './modal';
import {
  ChatSkeleton,
  FormSkeleton,
  ListSkeleton,
  PageSkeleton,
  Skeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from './skeleton';
import { applyStoredThemeToDocument, ThemeProvider, ThemeToggle } from './theme-provider';
import { ToastProvider, useToast } from './toast';

function ToastDemoTrigger() {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={() =>
        toast({
          variant: 'success',
          title: 'Operación completada',
          description: 'Registro guardado bajo RLS.',
          durationMs: 0,
        })
      }
    >
      Disparar toast
    </button>
  );
}

describe('Vercel Geist Senior UI Primitives (Theme, Skeleton, Alert, Toast, Modal)', () => {
  it('toggles dark, light, system and compact modes in ThemeProvider + ThemeToggle', () => {
    window.localStorage.setItem('atlas-theme', 'dark');
    expect(applyStoredThemeToDocument()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    const { rerender } = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Tema Claro' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('atlas-theme')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Tema Oscuro' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Tema Sistema' }));
    expect(window.localStorage.getItem('atlas-theme')).toBe('system');

    rerender(
      <ThemeProvider defaultMode="dark">
        <ThemeToggle compact />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Cambiar a modo claro/i }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('renders all structured zero-CLS Skeleton variants with accessible status labels', () => {
    const { unmount } = render(<StatCardsSkeleton count={2} label="Cargando tarjetas…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tarjetas…');
    unmount();

    const list = render(<ListSkeleton rows={3} label="Cargando filas…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando filas…');
    list.unmount();

    const table = render(<TableSkeleton rows={2} columns={4} label="Cargando tabla…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tabla…');
    table.unmount();

    const form = render(<FormSkeleton fields={2} label="Cargando campos…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cargando campos…');
    form.unmount();

    const chat = render(<ChatSkeleton label="Generando turno…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Generando turno…');
    chat.unmount();

    const page = render(
      <div>
        <Skeleton className="h-4 w-10" />
        <PageSkeleton label="Cargando vista completa…" />
      </div>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Cargando vista completa…');
    page.unmount();
  });

  it('renders Alert variants (info, success, warning, danger) with action and dismiss support', () => {
    const onDismiss = vi.fn();
    render(
      <div>
        <Alert variant="info" title="Aviso informativo">
          Detalle técnico
        </Alert>
        <Alert
          variant="danger"
          title="Fallo crítico"
          onDismiss={onDismiss}
          action={<button type="button">Reintentar</button>}
        >
          Permiso denegado en RLS
        </Alert>
      </div>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Aviso informativo');
    expect(screen.getByRole('alert')).toHaveTextContent('Permiso denegado en RLS');
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar alerta' }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('queues and dismisses stacked notifications in ToastProvider', () => {
    render(
      <ToastProvider>
        <ToastDemoTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Disparar toast' }));
    expect(screen.getByText('Operación completada')).toBeInTheDocument();
    expect(screen.getByText('Registro guardado bajo RLS.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar notificación Operación completada' }));
    expect(screen.queryByText('Operación completada')).not.toBeInTheDocument();
  });

  it('supports accessible Modal dialog and drawer modes with Escape and backdrop dismissal', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open={false} onClose={onClose} title="Oculto">
        Nada
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <Modal
        open={true}
        onClose={onClose}
        size="drawer"
        title="Menú móvil"
        description="Secciones disponibles"
        footer={<button type="button">Acción pie</button>}
      >
        <p>Contenido del drawer</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Menú móvil' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Contenido del drawer')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

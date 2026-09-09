import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog accessible modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Eliminar"
        description="Seguro?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog with alertdialog role and triggers actions', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        title="¿Desea continuar?"
        description="Esta acción destruirá el recurso"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('¿Desea continuar?')).toBeInTheDocument();
    expect(screen.getByText('Esta acción destruirá el recurso')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('handles Escape key to cancel when not busy', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Eliminar"
        description="Seguro?"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

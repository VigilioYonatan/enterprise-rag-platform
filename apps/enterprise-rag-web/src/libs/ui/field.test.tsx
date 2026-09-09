import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';
import { Field, SelectField, TextareaField } from './field';

describe('Accessible form primitives & ConfirmDialog', () => {
  it('associates label/error with a focused input and forwards ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Field id="name" label="Nombre" error="Requerido" ref={ref} />);
    expect(screen.getByLabelText('Nombre')).toBe(ref.current);
    expect(screen.getByRole('alert').textContent).toBe('Requerido');
    expect(ref.current?.getAttribute('aria-invalid')).toBe('true');
    expect(ref.current?.getAttribute('aria-describedby')).toBe('name-error');
  });

  it('exposes accessible textarea and select primitives', () => {
    render(
      <div>
        <TextareaField id="body" label="Contenido" error="Falta texto" />
        <SelectField id="vis" label="Visibilidad">
          <option value="private">Privado</option>
        </SelectField>
      </div>,
    );
    expect(screen.getByLabelText('Contenido')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Visibilidad')).toHaveValue('private');
  });

  it('renders ConfirmDialog with alertdialog semantics and Escape handling', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="¿Eliminar recurso?"
        description="Esta acción es irreversible."
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar eliminación' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

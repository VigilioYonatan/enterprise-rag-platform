import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState, ErrorState, Loading, PageHeader } from './feedback';

describe('UI Feedback Primitives (Loading, Empty, Error, PageHeader)', () => {
  it('renders Loading with status role and custom label', () => {
    render(<Loading label="Procesando chunks..." />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Procesando chunks...');
  });

  it('renders EmptyState with title and description', () => {
    render(
      <EmptyState title="Sin documentos" description="Aún no se han indexado archivos en esta base.">
        <button type="button">Subir archivo</button>
      </EmptyState>,
    );
    expect(screen.getByText('Sin documentos')).toBeInTheDocument();
    expect(screen.getByText('Aún no se han indexado archivos en esta base.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir archivo' })).toBeInTheDocument();
  });

  it('renders ErrorState with alert role and message', () => {
    render(<ErrorState message="Error de conexión al servidor RAG." />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Error de conexión al servidor RAG.');
  });

  it('renders PageHeader with eyebrow, title and description', () => {
    render(
      <PageHeader
        eyebrow="Gobernanza"
        title="Bases de Conocimiento"
        description="Gestión centralizada de colecciones documentales."
      />,
    );
    expect(screen.getByText('Gobernanza')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Bases de Conocimiento' })).toBeInTheDocument();
    expect(screen.getByText('Gestión centralizada de colecciones documentales.')).toBeInTheDocument();
  });
});

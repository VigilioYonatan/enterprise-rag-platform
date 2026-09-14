import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Alert } from '../libs/ui/alert';
import { Button } from '../libs/ui/button';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Se produjo un fallo inesperado en la interfaz.',
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI boundary error', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-xl p-8">
          <Alert
            variant="danger"
            title="No pudimos mostrar esta sección"
            action={
              <Button
                onClick={() => {
                  this.setState({ hasError: false, message: '' });
                  window.location.reload();
                }}
              >
                Recargar consola
              </Button>
            }
          >
            {this.state.message}
          </Alert>
        </main>
      );
    }
    return this.props.children;
  }
}

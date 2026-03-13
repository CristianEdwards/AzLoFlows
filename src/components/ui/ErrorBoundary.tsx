import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[AzLoFlows] Uncaught error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClear = () => {
    localStorage.removeItem('isoflows.diagram.document');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: 'Inter, sans-serif', color: '#e6eeff', background: '#0a0a1a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, marginBottom: 12 }}>Something went wrong</h1>
            <p style={{ color: '#8899bb', marginBottom: 8 }}>AzLoFlows encountered an unexpected error.</p>
            <pre style={{ textAlign: 'left', background: '#111', padding: 12, borderRadius: 8, fontSize: 12, maxHeight: 140, overflow: 'auto', color: '#ff6b6b', marginBottom: 20 }}>
              {this.state.error?.message}
            </pre>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={this.handleReload} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #4d8dff', background: '#1a2a4a', color: '#e6eeff', cursor: 'pointer', fontSize: 14 }}>
                Reload App
              </button>
              <button onClick={this.handleClear} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #ff4444', background: '#2a1a1a', color: '#ffaaaa', cursor: 'pointer', fontSize: 14 }}>
                Reset &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

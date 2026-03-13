import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import '@/styles/globals.css';

/* ── Global error tracking ─────────────────────────────── */
window.addEventListener('error', (e) => {
  console.error('[AzLoFlows] Uncaught error:', e.message, e.filename, e.lineno);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[AzLoFlows] Unhandled promise rejection:', e.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
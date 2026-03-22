import { useState, type PropsWithChildren, type ReactNode } from 'react';

interface AppShellProps extends PropsWithChildren {
  toolbar: ReactNode;
  sidebar: ReactNode;
  inspector: ReactNode;
  statusbar: ReactNode;
}

export default function AppShell({ toolbar, sidebar, inspector, statusbar, children }: AppShellProps) {
  const [mobilePanel, setMobilePanel] = useState<'sidebar' | 'inspector' | null>(null);

  function togglePanel(panel: 'sidebar' | 'inspector') {
    setMobilePanel((prev) => (prev === panel ? null : panel));
  }

  return (
    <div className="app-shell">
      <header className="app-shell__toolbar">{toolbar}</header>
      <aside className={`app-shell__sidebar${mobilePanel === 'sidebar' ? ' is-open' : ''}`}>{sidebar}</aside>
      <main className="app-shell__main">{children}</main>
      <aside className={`app-shell__inspector${mobilePanel === 'inspector' ? ' is-open' : ''}`}>{inspector}</aside>
      <footer className="app-shell__statusbar">{statusbar}</footer>

      {/* Mobile toggle buttons — visible only on narrow screens via CSS */}
      <button
        className="mobile-panel-toggle mobile-panel-toggle--left"
        aria-label="Toggle shape palette"
        onClick={() => togglePanel('sidebar')}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {mobilePanel === 'sidebar'
            ? <path d="M6 6l8 8M14 6l-8 8" />
            : <><rect x="2" y="3" width="16" height="14" rx="2" /><path d="M8 3v14" /></>
          }
        </svg>
      </button>
      <button
        className="mobile-panel-toggle mobile-panel-toggle--right"
        aria-label="Toggle inspector"
        onClick={() => togglePanel('inspector')}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {mobilePanel === 'inspector'
            ? <path d="M6 6l8 8M14 6l-8 8" />
            : <><rect x="2" y="3" width="16" height="14" rx="2" /><path d="M12 3v14" /></>
          }
        </svg>
      </button>

      {/* Backdrop to close panel when tapping canvas area */}
      {mobilePanel && (
        <div className="mobile-panel-backdrop" onClick={() => setMobilePanel(null)} />
      )}
    </div>
  );
}
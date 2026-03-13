import type { PropsWithChildren, ReactNode } from 'react';

interface AppShellProps extends PropsWithChildren {
  toolbar: ReactNode;
  sidebar: ReactNode;
  inspector: ReactNode;
  statusbar: ReactNode;
}

export default function AppShell({ toolbar, sidebar, inspector, statusbar, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell__toolbar">{toolbar}</header>
      <aside className="app-shell__sidebar">{sidebar}</aside>
      <main className="app-shell__main">{children}</main>
      <aside className="app-shell__inspector">{inspector}</aside>
      <footer className="app-shell__statusbar">{statusbar}</footer>
    </div>
  );
}
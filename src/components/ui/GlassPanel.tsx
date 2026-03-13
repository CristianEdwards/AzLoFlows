import { useState, type HTMLAttributes, type PropsWithChildren } from 'react';

type GlassPanelProps = PropsWithChildren<HTMLAttributes<HTMLElement>> & {
  as?: 'section' | 'aside' | 'div';
  title?: string;
  collapsed?: boolean;
};

function handleGlare(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--glare-x', `${((e.clientX - rect.left) / rect.width) * 100}%`);
  el.style.setProperty('--glare-y', `${((e.clientY - rect.top) / rect.height) * 100}%`);
}

function handleGlareLeave(e: React.MouseEvent<HTMLElement>) {
  e.currentTarget.style.removeProperty('--glare-x');
  e.currentTarget.style.removeProperty('--glare-y');
}

export default function GlassPanel({ as = 'section', title, collapsed, children, className = '', ...props }: GlassPanelProps) {
  const Component = as;
  const [open, setOpen] = useState(!collapsed);
  const collapsible = collapsed !== undefined;
  return (
    <Component
      className={`glass-panel ${className}`.trim()}
      {...props}
      onMouseMove={handleGlare}
      onMouseLeave={handleGlareLeave}
    >
      {title ? (
        <div
          className="glass-panel__title"
          style={collapsible ? { cursor: 'pointer', userSelect: 'none' } : undefined}
          onClick={collapsible ? () => setOpen((o) => !o) : undefined}
        >
          {collapsible ? <span style={{ display: 'inline-block', width: 14, fontSize: 10 }}>{open ? '▼' : '▶'}</span> : null}
          {title}
        </div>
      ) : null}
      {(!collapsible || open) && children}
    </Component>
  );
}
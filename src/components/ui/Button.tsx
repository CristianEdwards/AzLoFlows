import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  active?: boolean;
  variant?: 'default' | 'ghost';
};

export default function Button({ children, active, className = '', variant = 'default', ...props }: ButtonProps) {
  return (
    <button
      className={`ui-button ui-button--${variant}${active ? ' is-active' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
import { useEffect } from 'react';

interface KeyboardShortcutsDialogProps {
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'General',
    shortcuts: [
      { keys: 'Ctrl + S', description: 'Save to browser storage' },
      { keys: 'Ctrl + Z', description: 'Undo' },
      { keys: 'Ctrl + Shift + Z', description: 'Redo' },
      { keys: 'Escape', description: 'Close dialogs / deselect' },
      { keys: '?', description: 'Toggle shortcut help' },
    ],
  },
  {
    title: 'Selection & Editing',
    shortcuts: [
      { keys: 'Ctrl + C', description: 'Copy selection' },
      { keys: 'Ctrl + V', description: 'Paste clipboard' },
      { keys: 'Ctrl + D', description: 'Duplicate selection' },
      { keys: 'Delete / Backspace', description: 'Delete selection' },
      { keys: 'Shift + Click', description: 'Additive selection' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: 'Scroll', description: 'Zoom in / out' },
      { keys: 'Space + Drag', description: 'Pan canvas' },
      { keys: 'Middle-click Drag', description: 'Pan canvas' },
      { keys: 'Ctrl + 0', description: 'Fit diagram to screen' },
      { keys: 'Ctrl + 1', description: 'Zoom to 100%' },
      { keys: 'Ctrl + F', description: 'Search entities' },
    ],
  },
  {
    title: 'Nudge',
    shortcuts: [
      { keys: 'Arrow keys', description: 'Move selection 1px' },
      { keys: 'Shift + Arrow keys', description: 'Move selection 40px' },
    ],
  },
];

export default function KeyboardShortcutsDialog({ onClose }: KeyboardShortcutsDialogProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="shortcut-dialog-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className="shortcut-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcut-dialog__header">
          <span>Keyboard Shortcuts</span>
          <button className="shortcut-dialog__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="shortcut-dialog__body">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="shortcut-group">
              <div className="shortcut-group__title">{group.title}</div>
              {group.shortcuts.map((s) => (
                <div key={s.keys} className="shortcut-row">
                  <kbd className="shortcut-row__keys">{s.keys}</kbd>
                  <span className="shortcut-row__desc">{s.description}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

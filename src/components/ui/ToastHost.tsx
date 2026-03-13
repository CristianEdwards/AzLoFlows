import { useEffect, useRef } from 'react';
import { useEditorStore } from '@/state/useEditorStore';

export default function ToastHost() {
  const toasts = useEditorStore((state) => state.toasts);
  const dismissToast = useEditorStore((state) => state.dismissToast);
  const timerMap = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    for (const toast of toasts) {
      if (!timerMap.current.has(toast.id)) {
        const handle = window.setTimeout(() => {
          timerMap.current.delete(toast.id);
          dismissToast(toast.id);
        }, 2800);
        timerMap.current.set(toast.id, handle);
      }
    }
  }, [toasts, dismissToast]);

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} className={`toast toast--${toast.tone}`} onClick={() => dismissToast(toast.id)}>
          {toast.message}
        </button>
      ))}
    </div>
  );
}
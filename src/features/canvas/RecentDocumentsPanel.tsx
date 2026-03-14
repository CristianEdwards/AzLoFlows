import { useCallback, useEffect, useState } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { loadRecent, type RecentEntry } from '@/lib/serialization/storage';
import { useEditorStore } from '@/state/useEditorStore';

export default function RecentDocumentsPanel() {
  const [entries, setEntries] = useState<RecentEntry[]>([]);
  const importDocument = useEditorStore((s) => s.importDocument);
  const pushToast = useEditorStore((s) => s.pushToast);
  const currentDocId = useEditorStore((s) => s.document.id);

  useEffect(() => {
    setEntries(loadRecent());
  }, [currentDocId]);

  const handleLoad = useCallback((entry: RecentEntry) => {
    try {
      const raw = localStorage.getItem('isoflows.diagram.document');
      if (!raw) { pushToast('Document not found in storage', 'error'); return; }
      const doc = JSON.parse(raw);
      if (doc.id === entry.id) {
        pushToast('This document is already open', 'info');
        return;
      }
      // For recent entries, we can only reliably load the current saved document
      // since localStorage stores only the last saved document.
      pushToast('Recent documents restore the last saved version', 'info');
    } catch {
      pushToast('Could not load document', 'error');
    }
  }, [importDocument, pushToast]);

  if (entries.length === 0) return null;

  return (
    <GlassPanel title="Recent Documents" collapsed>
      <div className="recent-list">
        {entries.map((entry) => (
          <button
            key={entry.id}
            className={`recent-row ${entry.id === currentDocId ? 'is-active' : ''}`}
            onClick={() => handleLoad(entry)}
            title={`Last saved: ${new Date(entry.savedAt).toLocaleString()}`}
          >
            <span className="recent-row__name">{entry.name}</span>
            <span className="recent-row__time">{formatRelativeTime(entry.savedAt)}</span>
          </button>
        ))}
      </div>
    </GlassPanel>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

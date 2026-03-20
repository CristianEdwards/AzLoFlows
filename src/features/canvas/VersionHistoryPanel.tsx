import { useCallback, useMemo, useState } from 'react';
import GlassPanel from '@/components/ui/GlassPanel';
import { loadSnapshotsForDocument, saveSnapshot, deleteSnapshot, type VersionSnapshot } from '@/lib/serialization/snapshots';
import { useEditorStore } from '@/state/useEditorStore';

export default function VersionHistoryPanel() {
  const document = useEditorStore((s) => s.document);
  const importDocument = useEditorStore((s) => s.importDocument);
  const pushToast = useEditorStore((s) => s.pushToast);
  const baseSnapshots = useMemo(() => loadSnapshotsForDocument(document.id), [document.id]);
  const [extraSnapshots, setExtraSnapshots] = useState<VersionSnapshot[]>([]);
  const snapshots = useMemo(() => {
    const baseIds = new Set(baseSnapshots.map(s => s.id));
    return [...extraSnapshots.filter(s => !baseIds.has(s.id)), ...baseSnapshots];
  }, [extraSnapshots, baseSnapshots]);
  const [naming, setNaming] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');

  const handleSave = useCallback(() => {
    const name = snapshotName.trim() || undefined;
    const snap = saveSnapshot(document, name);
    setExtraSnapshots((prev) => [snap, ...prev]);
    setNaming(false);
    setSnapshotName('');
    pushToast('Snapshot saved', 'success');
  }, [document, snapshotName, pushToast]);

  const handleRestore = useCallback((snapshot: VersionSnapshot) => {
    if (!window.confirm(`Restore "${snapshot.name}"? Current unsaved changes will be lost.`)) return;
    importDocument(snapshot.data);
    pushToast(`Restored "${snapshot.name}"`, 'success');
  }, [importDocument, pushToast]);

  const handleDelete = useCallback((id: string) => {
    deleteSnapshot(id);
    setExtraSnapshots((prev) => prev.filter((s) => s.id !== id));
    pushToast('Snapshot deleted', 'info');
  }, [pushToast]);

  return (
    <GlassPanel title="Version History" collapsed>
      <div className="version-history">
        {naming ? (
          <div className="version-history__naming">
            <input
              className="version-history__input"
              placeholder="Snapshot name (optional)"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setNaming(false); }}
              autoFocus
            />
            <div className="version-history__naming-actions">
              <button className="ui-button" onClick={handleSave}>Save</button>
              <button className="ui-button" onClick={() => setNaming(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="ui-button version-history__save-btn" onClick={() => setNaming(true)}>
            📸 Save Snapshot
          </button>
        )}
        {snapshots.length === 0 && (
          <div className="version-history__empty">No snapshots yet. Save one to track your progress.</div>
        )}
        <div className="version-history__list">
          {snapshots.map((snap) => (
            <div key={snap.id} className="version-history__entry">
              <div className="version-history__entry-info">
                <div className="version-history__entry-name">{snap.name}</div>
                <div className="version-history__entry-time">{new Date(snap.timestamp).toLocaleString()}</div>
              </div>
              <div className="version-history__entry-actions">
                <button className="version-history__action" onClick={() => handleRestore(snap)} title="Restore this snapshot">↩</button>
                <button className="version-history__action version-history__action--danger" onClick={() => handleDelete(snap.id)} title="Delete snapshot">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}

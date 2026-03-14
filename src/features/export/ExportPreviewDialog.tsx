import { useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { exportCanvasAsPngSaveAs } from '@/features/export/fileActions';

interface ExportPreviewDialogProps {
  canvas: HTMLCanvasElement;
  fileName: string;
  onClose: () => void;
}

export default function ExportPreviewDialog({ canvas, fileName, onClose }: ExportPreviewDialogProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDataUrl(canvas.toDataURL('image/png'));
  }, [canvas]);

  function handleDownload() {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    });
    onClose();
  }

  async function handleSaveAs() {
    await exportCanvasAsPngSaveAs(canvas, fileName);
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) onClose();
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="PNG export preview"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      }}
    >
      <div style={{
        background: 'rgba(12,16,36,0.96)', border: '1px solid rgba(0,229,255,0.18)',
        borderRadius: 12, padding: 20, maxWidth: '80vw', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ color: '#c8d0e8', fontWeight: 600, fontSize: 15 }}>PNG Export Preview</div>
        {dataUrl && (
          <img
            src={dataUrl}
            alt="Export preview"
            style={{ maxWidth: '70vw', maxHeight: '60vh', borderRadius: 6, objectFit: 'contain', border: '1px solid rgba(255,255,255,0.08)' }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveAs}>Save As…</Button>
          <Button onClick={handleDownload}>Download PNG</Button>
        </div>
      </div>
    </div>
  );
}

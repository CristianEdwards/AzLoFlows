import { useState } from 'react';
import { templateGallery, templateCategories, type TemplateEntry } from '@/features/templates/templateGallery';
import { useEditorStore } from '@/state/useEditorStore';

interface TemplateGalleryDialogProps {
  onClose: () => void;
}

export default function TemplateGalleryDialog({ onClose }: TemplateGalleryDialogProps) {
  const [category, setCategory] = useState<string>('all');
  const importDocument = useEditorStore((s) => s.importDocument);
  const pushToast = useEditorStore((s) => s.pushToast);

  const filtered = category === 'all'
    ? templateGallery
    : templateGallery.filter((t) => t.category === category);

  function handleSelect(template: TemplateEntry) {
    if (!window.confirm(`Load "${template.name}"? Unsaved changes will be lost.`)) return;
    const doc = template.create();
    importDocument(doc);
    pushToast(`Loaded template: ${template.name}`, 'success');
    onClose();
  }

  return (
    <div className="template-gallery-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Template gallery">
      <div className="template-gallery" onClick={(e) => e.stopPropagation()}>
        <div className="template-gallery__header">
          <span className="template-gallery__title">Template Gallery</span>
          <button className="shortcut-dialog__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="template-gallery__categories">
          <button
            className={`template-gallery__cat-btn ${category === 'all' ? 'is-active' : ''}`}
            onClick={() => setCategory('all')}
          >All</button>
          {templateCategories.map((cat) => (
            <button
              key={cat.id}
              className={`template-gallery__cat-btn ${category === cat.id ? 'is-active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="template-gallery__grid">
          {filtered.map((t) => (
            <button key={t.id} className="template-gallery__card" onClick={() => handleSelect(t)}>
              <div className="template-gallery__card-name">{t.name}</div>
              <div className="template-gallery__card-desc">{t.description}</div>
              <div className="template-gallery__card-badge">{t.category}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

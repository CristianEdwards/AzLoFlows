import type { NodeEntity } from '@/types/document';

export function getTextRatios(node: NodeEntity, defaultY: number = 0.46) {
  const tp = node.textPosition || 'center';
  switch (tp) {
    case 'top-left': return { x: 0.12, y: 0.12 };
    case 'top-center': return { x: 0.50, y: 0.12 };
    case 'top-right': return { x: 0.88, y: 0.12 };
    case 'bottom-left': return { x: 0.12, y: 0.88 };
    case 'bottom-center': return { x: 0.50, y: 0.88 };
    case 'bottom-right': return { x: 0.88, y: 0.88 };
    case 'center':
    default:
      return { x: 0.5, y: defaultY };
  }
}

import type { NodeEntity } from '@/types/document';

export function getTextRatios(node: NodeEntity, defaultY: number = 0.46) {
  const tp = node.textPosition || 'center';
  switch (tp) {
    case 'top-left': return { x: 0.20, y: 0.20 };
    case 'top-right': return { x: 0.80, y: 0.20 };
    case 'bottom-left': return { x: 0.20, y: 0.80 };
    case 'bottom-right': return { x: 0.80, y: 0.80 };
    case 'center':
    default:
      return { x: 0.5, y: defaultY };
  }
}

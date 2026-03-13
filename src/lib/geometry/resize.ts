import { snapValue } from '@/lib/geometry/grid';

export type ResizeHandle = 'nw' | 'ne' | 'se' | 'sw';

interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function resizeRectFromHandle(
  rect: RectLike,
  handle: ResizeHandle,
  point: { x: number; y: number },
  snapEnabled: boolean,
  minWidth = 80,
  minHeight = 60,
): RectLike {
  let left = rect.x;
  let top = rect.y;
  let right = rect.x + rect.width;
  let bottom = rect.y + rect.height;

  if (handle.includes('n')) {
    top = point.y;
  }
  if (handle.includes('s')) {
    bottom = point.y;
  }
  if (handle.includes('w')) {
    left = point.x;
  }
  if (handle.includes('e')) {
    right = point.x;
  }

  if (snapEnabled) {
    left = snapValue(left);
    top = snapValue(top);
    right = snapValue(right);
    bottom = snapValue(bottom);
  }

  if (right - left < minWidth) {
    if (handle.includes('w')) {
      left = right - minWidth;
    } else {
      right = left + minWidth;
    }
  }
  if (bottom - top < minHeight) {
    if (handle.includes('n')) {
      top = bottom - minHeight;
    } else {
      bottom = top + minHeight;
    }
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}
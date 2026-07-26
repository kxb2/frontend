// 크기/회전 조절 제스처가 공통으로 쓰는 순수 계산 (섹션/미디어가 공유, 메모는 자체 방식이라 별개)
export type ResizeHandle = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function horizontalPartOf(handle: ResizeHandle): 'left' | 'right' | null {
  if (handle === 'left' || handle === 'top-left' || handle === 'bottom-left') return 'left';
  if (handle === 'right' || handle === 'top-right' || handle === 'bottom-right') return 'right';
  return null;
}
export function verticalPartOf(handle: ResizeHandle): 'top' | 'bottom' | null {
  if (handle === 'top' || handle === 'top-left' || handle === 'top-right') return 'top';
  if (handle === 'bottom' || handle === 'bottom-left' || handle === 'bottom-right') return 'bottom';
  return null;
}

export interface ResizeBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ComputeResizedBoxParams {
  handle: ResizeHandle;
  start: ResizeBox;
  rotate: number; // 회전된 아이템도 자신의 축 기준으로 드래그가 동작하도록 보정하는 데 사용
  dxScreen: number;
  dyScreen: number;
  keepAspect: boolean; // Shift: 시작 시점 종횡비 유지
  minSize: number;
}

// 변/꼭짓점 드래그로부터 새 박스(x,y,width,height)를 계산 (회전 보정 + Shift 종횡비 고정 포함)
export function computeResizedBox({ handle, start, rotate, dxScreen, dyScreen, keepAspect, minSize }: ComputeResizedBoxParams): ResizeBox {
  const rad = (-rotate * Math.PI) / 180;
  const dx = dxScreen * Math.cos(rad) - dyScreen * Math.sin(rad);
  const dy = dxScreen * Math.sin(rad) + dyScreen * Math.cos(rad);
  const horizontal = horizontalPartOf(handle);
  const vertical = verticalPartOf(handle);

  let width = start.width;
  let height = start.height;
  if (horizontal === 'right') width = Math.max(minSize, start.width + dx);
  if (horizontal === 'left') width = Math.max(minSize, start.width - dx);
  if (vertical === 'bottom') height = Math.max(minSize, start.height + dy);
  if (vertical === 'top') height = Math.max(minSize, start.height - dy);

  if (keepAspect) {
    const aspectRatio = start.width / start.height;
    if (horizontal && vertical) {
      if (Math.abs(width - start.width) >= Math.abs(height - start.height)) height = Math.max(minSize, width / aspectRatio);
      else width = Math.max(minSize, height * aspectRatio);
    } else if (horizontal) {
      height = Math.max(minSize, width / aspectRatio);
    } else if (vertical) {
      width = Math.max(minSize, height * aspectRatio);
    }
  }

  let x = start.x;
  let y = start.y;
  if (horizontal === 'left') x = start.x + (start.width - width);
  if (vertical === 'top') y = start.y + (start.height - height);
  return { x, y, width, height };
}

// Shift를 누른 채 회전하면 15도 단위로 스냅(0/90도 등 수평·수직 정렬이 쉬워짐)
const ROTATION_SNAP_STEP = 15;
export function snapRotationDeg(deltaDeg: number, shiftHeld: boolean): number {
  if (!shiftHeld) return deltaDeg;
  return Math.round(deltaDeg / ROTATION_SNAP_STEP) * ROTATION_SNAP_STEP;
}

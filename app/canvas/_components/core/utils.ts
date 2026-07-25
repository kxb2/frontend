import type { CanvasItem } from '@/types/canvas';
import { MEMO_WIDTH } from '@/app/canvas/_components/tools/memo/layout';

// 아이템 타입별 기본 크기(폭/높이 미지정 시), 대략적 크기만 필요할 때 사용
export function getItemDisplaySize(item: CanvasItem): { width: number; height: number } {
  if (item.type === 'section') return { width: item.width, height: item.height };
  if (item.type === 'memo') return { width: item.width ?? MEMO_WIDTH, height: item.height ?? 80 };
  return { width: item.width ?? 160, height: item.height ?? 107 };
}

// 드래그/회전/스케일 중 페이지 전체 텍스트가 함께 드래그 선택되는 것을 방지
function disableTextSelect() {
  document.body.style.userSelect = 'none';
}
function restoreTextSelect() {
  document.body.style.userSelect = '';
}

// PointerEvent 기반의 드래그/회전/스케일 제스처를 추적
export function trackWindowGesture(onMove: (e: PointerEvent) => void, onUp: (e: PointerEvent) => void) {
  disableTextSelect();
  function move(e: PointerEvent) {
    onMove(e);
  }
  function up(e: PointerEvent) {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    restoreTextSelect();
    onUp(e);
  }
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// 점 (px,py)를 중심 (cx,cy) 기준으로 angleDeg만큼 회전시킨 새 좌표를 반환 (그룹 선택 시 꼭짓점 주변 회전 제스처에 사용)
export function rotateAround(px: number, py: number, cx: number, cy: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: cy + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

import Konva from 'konva';

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

// 주어진 naturalWidth/naturalHeight를 cap (240px) 이하로 맞춤
export function fitWithinCap(naturalWidth: number, naturalHeight: number, cap = 240) {
  if (naturalWidth <= cap && naturalHeight <= cap) return { width: naturalWidth, height: naturalHeight };
  const ratio = Math.min(cap / naturalWidth, cap / naturalHeight);
  return { width: naturalWidth * ratio, height: naturalHeight * ratio };
}

// 주어진 텍스트를 Konva.Text로 렌더링했을 때의 width/height를 측정
export function measureText(text: string, fontSize: number, fontFamily: string, padding = 8, width?: number, lineHeight = 1.2) {
  const node = new Konva.Text({
    text: text || ' ',
    fontSize,
    fontFamily,
    padding,
    lineHeight,
    ...(width ? { width, wrap: 'word' as const } : {}),
  });
  const measuredWidth = width ?? Math.max(node.width(), fontSize * 2);
  const height = Math.max(node.height(), fontSize + padding * 2);
  node.destroy();
  return { width: measuredWidth, height };
}

import Konva from 'konva';
import type { MemoCanvasItem, MemoColor, MemoViewMode } from '@/types/canvas';

// 주어진 텍스트를 Konva.Text로 렌더링했을 때의 width/height를 측정
function measureText(text: string, fontSize: number, fontFamily: string, padding = 8, width?: number, lineHeight = 1.2) {
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

// 메모 레이아웃
export const MEMO_WIDTH = 242;
export const MEMO_HEADER_PAD_X = 32;
const MEMO_HEADER_PAD_Y = 16;
export const MEMO_HEADER_HEIGHT = MEMO_HEADER_PAD_Y * 2 + 12;
export const MEMO_BODY_PAD_X = 32;
export const MEMO_BODY_PAD_Y = 20;
export const MEMO_BODY_GAP = 10;
export const MEMO_CONTENT_FONT_SIZE = 14;
export const MEMO_COUNTER_FONT_SIZE = 12;
export const MEMO_TITLE_FONT_SIZE = 12;
export const MEMO_LINE_HEIGHT = 1.4;
export const MEMO_MAX_CHARS = 3000;
export const MEMO_PLACEHOLDER = '메모를 입력하세요';
export const TEXT_FONT_FAMILY = 'Pretendard, Inter, sans-serif';
export const MEMO_CORNER_RADIUS: [number, number, number, number] = [12, 12, 0, 0];
export const MEMO_BODY_CORNER_RADIUS: [number, number, number, number] = [0, 0, 12, 12];
export const MEMO_ALL_CORNER_RADIUS: [number, number, number, number] = [12, 12, 12, 12]; // 접힘 모드
export const MEMO_BODY_BG = '#1c1f2a';
export const MEMO_TOGGLE_SIZE = 12;
export const MEMO_CHEVRON_PATH = 'M3 4.5L6 7.5L9 4.5';
export const MEMO_FILE_ICON_PATH =
  'M7 1H3C2.73478 1 2.48043 1.10536 2.29289 1.29289C2.10536 1.48043 2 1.73479 2 2V10C2 10.2652 2.10536 10.5196 2.29289 10.7071C2.48043 10.8946 2.73478 11 3 11H9C9.26522 11 9.51957 10.8946 9.70711 10.7071C9.89464 10.5196 10 10.2652 10 10V4M7 1C7.15828 0.999745 7.31504 1.0308 7.46127 1.09139C7.60749 1.15197 7.74028 1.24088 7.852 1.353L9.646 3.147C9.75842 3.25875 9.84759 3.39167 9.90835 3.53808C9.96911 3.68449 10.0003 3.84149 10 4M7 1V3.5C7 3.63261 7.05268 3.75979 7.14645 3.85355C7.24021 3.94732 7.36739 4 7.5 4L10 4';
export const MEMO_PALETTE: Record<MemoColor, { header: string; border: string; fg: string }> = {
  default: { header: '#262c3b', border: '#394257', fg: '#ffffff' },
  purple: { header: '#c255ff', border: '#c255ff', fg: '#ffffff' },
  neon: { header: '#eafb2f', border: '#eafb2f', fg: '#3a4008' },
  red: { header: '#f36060', border: '#f36060', fg: '#ffffff' },
};
// 카운터 줄의 높이 고정, 최초로 실제 렌더링될 때 한 번만 측정해 캐싱
let memoCounterHeightCache: number | null = null;
export function getMemoCounterHeight() {
  if (memoCounterHeightCache === null) {
    memoCounterHeightCache = measureText('0/500', MEMO_COUNTER_FONT_SIZE, TEXT_FONT_FAMILY, 0, undefined, MEMO_LINE_HEIGHT).height;
  }
  return memoCounterHeightCache;
}

// 가로 길이와 자연 폭(MEMO_WIDTH)의 비율 (헤더의 좌우 여백/요소 사이 간격은 이 비율만큼 증가/감소)
export function getMemoWidthRatio(width: number) {
  return width / MEMO_WIDTH;
}

export function getMemoContentWidth(width: number) {
  return width - MEMO_BODY_PAD_X * 2 * getMemoWidthRatio(width);
}

// 본문이 지정된 폭 기준으로 자연스럽게 줄바꿈됐을 때의 높이 (스케일/수동 높이 조절 미적용)
export function measureMemo(text: string, contentWidth: number) {
  return measureText(text || MEMO_PLACEHOLDER, MEMO_CONTENT_FONT_SIZE, TEXT_FONT_FAMILY, 0, contentWidth, MEMO_LINE_HEIGHT).height;
}

// 카드 전체 높이 (렌더 없이 미리 높이 변화량을 알아야 할 때 사용)
export function computeMemoTotalHeight(item: MemoCanvasItem, viewMode: MemoViewMode = item.viewMode) {
  const width = item.width ?? MEMO_WIDTH;
  const contentWidth = getMemoContentWidth(width);
  const naturalContentHeight = measureMemo(item.text, contentWidth);
  const contentHeight = item.height ?? naturalContentHeight;
  const bodyHeight = viewMode === 'collapsed' ? 0 : MEMO_BODY_PAD_Y * 2 + contentHeight + MEMO_BODY_GAP + getMemoCounterHeight();
  return MEMO_HEADER_HEIGHT + bodyHeight;
}

// 가로만 배율(sx) 적용, 세로는 그 가로에서 텍스트가 자연스럽게 줄바꿈된 높이로 재계산 (메모는 항상 내용 기준 높이)
export function computeMemoScalePatch(item: MemoCanvasItem, sx: number) {
  const width = Math.max(160, (item.width ?? MEMO_WIDTH) * sx);
  const height = Math.max(20, measureMemo(item.text, getMemoContentWidth(width)));
  return { width, height };
}

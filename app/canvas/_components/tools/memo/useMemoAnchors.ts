import type { RefObject } from 'react';
import type Konva from 'konva';
import type { MemoCanvasItem } from '@/types/canvas';
import { useItemAnchors } from '@/app/canvas/_components/transform/useItemAnchors';
import type { CornerAnchor } from '@/app/canvas/_components/transform/useRotate';
import type { MemoResizeHandle } from '@/app/canvas/_components/tools/memo/useMemoResize';

export type MemoCornerConfig = Partial<Record<CornerAnchor, { handle: MemoResizeHandle; cursor: string }>>;

// 접힘 모드는 모든 컨트롤을 가로 핸들로 취급
function computeMemoCornerConfig(memoItem: MemoCanvasItem | undefined, isEditing: boolean): MemoCornerConfig {
  if (!memoItem) return {};
  const isFull = (isEditing ? 'full' : memoItem.viewMode) === 'full';
  return {
    'top-left': { handle: isFull ? 'top-left' : 'left', cursor: isFull ? 'nwse-resize' : 'ew-resize' },
    'top-right': { handle: isFull ? 'top-right' : 'right', cursor: isFull ? 'nesw-resize' : 'ew-resize' },
    'bottom-left': { handle: isFull ? 'bottom-left' : 'left', cursor: isFull ? 'nesw-resize' : 'ew-resize' },
    'bottom-right': { handle: isFull ? 'bottom-right' : 'right', cursor: isFull ? 'nwse-resize' : 'ew-resize' },
  };
}

interface UseMemoAnchorsParams {
  memoItem: MemoCanvasItem | undefined;
  // 단독 선택된 메모가 현재 편집 중이면(접힘 여부와 무관하게) 항상 전체 보기 취급
  isEditing: boolean;
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  onResizeStart: (handle: MemoResizeHandle, item: MemoCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void;
}

// 메모 선택 및 확대/축소 컨트롤 (꼭짓점 컨트롤 자체 로직은 useItemAnchors 공용 구현)
export function useMemoAnchors({ memoItem, isEditing, nodeMapRef, onResizeStart }: UseMemoAnchorsParams) {
  const cornerConfig = computeMemoCornerConfig(memoItem, isEditing);
  return useItemAnchors({ item: memoItem, cornerConfig, nodeMapRef, onResizeStart });
}

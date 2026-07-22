import { useEffect, useRef, type RefObject } from 'react';
import type Konva from 'konva';
import type { MemoCanvasItem } from '@/types/canvas';
import { rotateAround } from '@/app/canvas/_components/canvasUtils';
import { CORNER_ANCHORS, CORNER_LOCAL_OFFSETS, type CornerAnchor } from '@/app/canvas/_components/tools/mouse/useRotateZones';
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

interface UseMemoResizeAnchorsParams {
  memoItem: MemoCanvasItem | undefined;
  // 단독 선택된 메모가 현재 편집 중이면(접힘 여부와 무관하게) 항상 전체 보기 취급
  isEditing: boolean;
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  onResizeStart: (handle: MemoResizeHandle, item: MemoCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void;
}

// 메모 선택 및 확대/축소 컨트롤
export function useMemoResizeAnchors({ memoItem, isEditing, nodeMapRef, onResizeStart }: UseMemoResizeAnchorsParams) {
  const anchorRefs = useRef<Partial<Record<CornerAnchor, Konva.Rect>>>({});
  const borderRef = useRef<Konva.Rect>(null);
  const cornerConfig = computeMemoCornerConfig(memoItem, isEditing);

  function syncResizeAnchors() {
    const node = memoItem ? nodeMapRef.current.get(memoItem.id) : undefined;
    const border = borderRef.current;
    if (!node || !memoItem) {
      CORNER_ANCHORS.forEach((corner) => anchorRefs.current[corner]?.visible(false));
      border?.visible(false);
      border?.getLayer()?.batchDraw();
      return;
    }
    // 자식과 무관한 평범한 attr getter라 getClientRect()처럼 숨은 크기가 새어 들어오지 않음
    const width = node.width();
    const totalHeight = node.height();
    const rotation = node.rotation();
    const centerX = node.x();
    const centerY = node.y();
    const offsetX = node.offsetX();
    const offsetY = node.offsetY();
    const topLeftX = centerX - offsetX;
    const topLeftY = centerY - offsetY;

    if (border) {
      border.setAttrs({ x: centerX, y: centerY, offsetX, offsetY, width, height: totalHeight, rotation, visible: true });
    }

    const pivot = { x: width / 2, y: totalHeight / 2 };
    CORNER_ANCHORS.forEach((corner) => {
      const anchorNode = anchorRefs.current[corner];
      if (!anchorNode) return;
      if (!cornerConfig[corner]) {
        anchorNode.visible(false);
        return;
      }
      const local = CORNER_LOCAL_OFFSETS[corner](width, totalHeight);
      const rotated = rotateAround(local.x, local.y, pivot.x, pivot.y, rotation);
      anchorNode.position({ x: rotated.x + topLeftX, y: rotated.y + topLeftY });
      anchorNode.rotation(rotation);
      anchorNode.visible(true);
    });
    node.getLayer()?.batchDraw();
  }

  useEffect(() => {
    syncResizeAnchors();
  });

  function registerResizeAnchor(corner: CornerAnchor, node: Konva.Rect | null) {
    if (node) anchorRefs.current[corner] = node;
    else delete anchorRefs.current[corner];
  }

  function registerBorderNode(node: Konva.Rect | null) {
    borderRef.current = node;
  }

  function handleAnchorMouseDown(corner: CornerAnchor, e: Konva.KonvaEventObject<MouseEvent>) {
    const config = cornerConfig[corner];
    if (!config || !memoItem) return;
    onResizeStart(config.handle, memoItem, e);
  }

  return { registerResizeAnchor, registerBorderNode, syncResizeAnchors, handleAnchorMouseDown, cornerConfig };
}

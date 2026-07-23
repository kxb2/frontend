import { useEffect, useRef, type RefObject } from 'react';
import type Konva from 'konva';
import { rotateAround } from '@/app/canvas/_components/core/utils';
import { CORNER_ANCHORS, CORNER_LOCAL_OFFSETS, type CornerAnchor } from '@/app/canvas/_components/transform/useRotate';

// 꼭짓점 컨트롤 + 자체 테두리 (메모/섹션/미디어가 공유하는 제네릭 로직, 코너별 핸들 의미만 다름)
interface UseItemAnchorsParams<THandle, TItem extends { id: string }> {
  item: TItem | undefined;
  cornerConfig: Partial<Record<CornerAnchor, { handle: THandle; cursor: string }>>;
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  onResizeStart: (handle: THandle, item: TItem, e: Konva.KonvaEventObject<MouseEvent>) => void;
}

export function useItemAnchors<THandle, TItem extends { id: string }>({ item, cornerConfig, nodeMapRef, onResizeStart }: UseItemAnchorsParams<THandle, TItem>) {
  const anchorRefs = useRef<Partial<Record<CornerAnchor, Konva.Rect>>>({});
  const borderRef = useRef<Konva.Rect>(null);

  function syncResizeAnchors() {
    const node = item ? nodeMapRef.current.get(item.id) : undefined;
    const border = borderRef.current;
    if (!node || !item) {
      CORNER_ANCHORS.forEach((corner) => anchorRefs.current[corner]?.visible(false));
      border?.visible(false);
      border?.getLayer()?.batchDraw();
      return;
    }
    // 자식과 무관한 평범한 attr getter라 getClientRect()처럼 숨은 크기가 새어 들어오지 않음
    const width = node.width();
    const height = node.height();
    const rotation = node.rotation();
    const centerX = node.x();
    const centerY = node.y();
    const offsetX = node.offsetX();
    const offsetY = node.offsetY();
    const topLeftX = centerX - offsetX;
    const topLeftY = centerY - offsetY;

    if (border) {
      border.setAttrs({ x: centerX, y: centerY, offsetX, offsetY, width, height, rotation, visible: true });
    }

    const pivot = { x: width / 2, y: height / 2 };
    CORNER_ANCHORS.forEach((corner) => {
      const anchorNode = anchorRefs.current[corner];
      if (!anchorNode) return;
      if (!cornerConfig[corner]) {
        anchorNode.visible(false);
        return;
      }
      const local = CORNER_LOCAL_OFFSETS[corner](width, height);
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
    if (!config || !item) return;
    onResizeStart(config.handle, item, e);
  }

  return { registerResizeAnchor, registerBorderNode, syncResizeAnchors, handleAnchorMouseDown, cornerConfig };
}

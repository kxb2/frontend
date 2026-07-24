import { useRef } from 'react';
import type Konva from 'konva';
import type { CanvasItem, SectionCanvasItem } from '@/types/canvas';
import { computeMemoScalePatch } from '@/app/canvas/_components/tools/memo/layout';
import type { MemoLiveResize } from '@/app/canvas/_components/tools/memo/useMemoResize';
import { useItemResize, type ItemLiveResize } from '@/app/canvas/_components/transform/useItemResize';
import type { ResizeBox, ResizeHandle } from '@/app/canvas/_components/transform/math';

export type SectionResizeHandle = ResizeHandle;
export type SectionLiveResize = ItemLiveResize;

interface UpdatePatch {
  id: string;
  x: number;
  y: number;
  rotate: number;
  width?: number;
  height?: number;
}

interface UseSectionResizeParams {
  items: CanvasItem[];
  nodeMapRef: React.RefObject<Map<string, Konva.Group>>;
  screenToLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onUpdateItems: (patches: UpdatePatch[]) => void;
  onMemoLiveOverride: (id: string, value: MemoLiveResize | null) => void;
}

const MIN_SIZE = 60;

// 섹션 전용 크기 조절, 공용 useItemResize + 자식(메모/미디어) 동반 스케일 (메모는 내용 기준 재계산, 미디어는 노드 scale로 즉시 반영)
export function useSectionResize({ items, nodeMapRef, screenToLogical, onUpdateItems, onMemoLiveOverride }: UseSectionResizeParams) {
  // 제스처 시작 시점의 섹션/자식 스냅샷 (라이브/커밋 계산의 기준)
  const startBoxRef = useRef<ResizeBox>({ x: 0, y: 0, width: 0, height: 0 });
  const childrenRef = useRef<Array<{ id: string; x: number; y: number }>>([]);

  function scaleChildren(box: ResizeBox, sx: number, sy: number, live: boolean): UpdatePatch[] {
    const start = startBoxRef.current;
    const patches: UpdatePatch[] = [];
    childrenRef.current.forEach((child) => {
      const newX = box.x + (child.x - start.x) * sx;
      const newY = box.y + (child.y - start.y) * sy;
      const childItem = items.find((i) => i.id === child.id);
      if (childItem?.type === 'memo') {
        const patch = computeMemoScalePatch(childItem, sx);
        onMemoLiveOverride(child.id, live ? { id: child.id, x: newX, y: newY, width: patch.width, height: patch.height } : null);
        if (!live) patches.push({ id: child.id, x: newX, y: newY, rotate: childItem.rotate, width: patch.width, height: patch.height });
        return;
      }
      const node = nodeMapRef.current.get(child.id);
      if (live) {
        if (!node) return;
        node.scaleX(sx);
        node.scaleY(sy);
        node.x(newX + node.offsetX() * sx);
        node.y(newY + node.offsetY() * sy);
      } else {
        node?.scaleX(1);
        node?.scaleY(1);
        if (childItem) patches.push({ id: child.id, x: newX, y: newY, rotate: childItem.rotate, width: (childItem.width ?? 0) * sx, height: (childItem.height ?? 0) * sy });
      }
    });
    return patches;
  }

  return useItemResize<SectionCanvasItem>({
    screenToLogical,
    onUpdateItems,
    minSize: MIN_SIZE,
    getStart: (item) => ({ x: item.x, y: item.y, width: item.width, height: item.height }),
    onStart: (item, start) => {
      startBoxRef.current = start;
      childrenRef.current = items.filter((child) => child.parentId === item.id).map((child) => ({ id: child.id, x: child.x, y: child.y }));
    },
    onLiveScale: (_item, box, sx, sy) => scaleChildren(box, sx, sy, true),
    onCommitScale: (_item, box, sx, sy) => scaleChildren(box, sx, sy, false),
  });
}

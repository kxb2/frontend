import { useRef, useState } from 'react';
import type Konva from 'konva';
import { computeResizedBox, type ResizeBox, type ResizeHandle } from '@/app/canvas/_components/transform/math';
import { trackWindowGesture } from '@/app/canvas/_components/core/utils';

export interface ItemLiveResize extends ResizeBox {
  id: string;
}

interface UpdatePatch {
  id: string;
  x: number;
  y: number;
  rotate: number;
  width?: number;
  height?: number;
}

interface UseItemResizeParams<TItem extends { id: string; rotate: number }> {
  screenToLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onUpdateItems: (patches: UpdatePatch[]) => void;
  getStart: (item: TItem) => ResizeBox;
  minSize: number;
  onStart?: (item: TItem, start: ResizeBox) => void; // 섹션의 자식 스냅샷처럼 제스처 시작 시점에 한 번만 필요
  onLiveScale?: (item: TItem, box: ResizeBox, sx: number, sy: number) => void; // 섹션 자식 실시간 동반 스케일 (미디어는 생략)
  onCommitScale?: (item: TItem, box: ResizeBox, sx: number, sy: number) => UpdatePatch[]; // 커밋 시 자식 patch 추가
}

// 변/꼭짓점 드래그 크기 조절 공용 골격(제스처 추적 + Shift 종횡비 고정 + 커밋), 섹션/미디어가 공유, 자식 스케일은 콜백으로 위임
export function useItemResize<TItem extends { id: string; rotate: number }>({
  screenToLogical,
  onUpdateItems,
  getStart,
  minSize,
  onStart,
  onLiveScale,
  onCommitScale,
}: UseItemResizeParams<TItem>) {
  const [liveResize, setLiveResize] = useState<ItemLiveResize | null>(null);
  const latestRef = useRef<ItemLiveResize | null>(null);

  function startResize(handle: ResizeHandle, item: TItem, e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    const startLogical = screenToLogical(e.evt.clientX, e.evt.clientY);
    const start = getStart(item);
    onStart?.(item, start);

    trackWindowGesture(
      (moveEvent) => {
        const cur = screenToLogical(moveEvent.clientX, moveEvent.clientY);
        const box = computeResizedBox({
          handle,
          start,
          rotate: item.rotate,
          dxScreen: cur.x - startLogical.x,
          dyScreen: cur.y - startLogical.y,
          keepAspect: moveEvent.shiftKey,
          minSize,
        });
        latestRef.current = { id: item.id, ...box };
        setLiveResize(latestRef.current);
        onLiveScale?.(item, box, box.width / start.width, box.height / start.height);
      },
      () => {
        const current = latestRef.current;
        latestRef.current = null;
        setLiveResize(null);
        if (!current || current.id !== item.id) return;
        const patches: UpdatePatch[] = [{ id: item.id, x: current.x, y: current.y, rotate: item.rotate, width: current.width, height: current.height }];
        if (onCommitScale) patches.push(...onCommitScale(item, current, current.width / start.width, current.height / start.height));
        onUpdateItems(patches);
      },
    );
  }

  return { liveResize, startResize };
}

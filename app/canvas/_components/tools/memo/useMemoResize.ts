import { useRef, useState } from 'react';
import type Konva from 'konva';
import type { MemoCanvasItem } from '@/types/canvas';
import { MEMO_WIDTH, getMemoContentWidth, measureMemo } from '@/app/canvas/_components/tools/memo/layout';
import { trackWindowGesture } from '@/app/canvas/_components/core/utils';
import { horizontalPartOf, verticalPartOf, type ResizeHandle } from '@/app/canvas/_components/transform/math';

export type MemoResizeHandle = ResizeHandle;

export interface MemoLiveResize {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UpdatePatch {
  id: string;
  x: number;
  y: number;
  rotate: number;
  width?: number;
  height?: number;
}

interface UseMemoResizeParams {
  screenToLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onUpdateItems: (patches: UpdatePatch[]) => void;
}

// 메모 전용 크기 조절 훅
export function useMemoResize({ screenToLogical, onUpdateItems }: UseMemoResizeParams) {
  const [liveResize, setLiveResize] = useState<MemoLiveResize | null>(null);
  const latestRef = useRef<MemoLiveResize | null>(null); // 마지막으로 드래그 중인 아이템의 상태를 저장, 드래그 종료 시점에 onUpdateItems 호출, 최신 상태 참조

  function startResize(handle: MemoResizeHandle, item: MemoCanvasItem, e: Konva.KonvaEventObject<PointerEvent | MouseEvent>) {
    e.cancelBubble = true;
    const startLogical = screenToLogical((e.evt as MouseEvent).clientX, (e.evt as MouseEvent).clientY);
    const startWidth = item.width ?? MEMO_WIDTH;
    const startHeight = item.height ?? measureMemo(item.text, getMemoContentWidth(startWidth));
    const startX = item.x;
    const startY = item.y;
    const horizontal = horizontalPartOf(handle);
    const vertical = verticalPartOf(handle);
    const rad = (-item.rotate * Math.PI) / 180; // 아이템이 회전돼 있어도 가로/세로 드래그가 아이템 자신의 축 기준으로 동작하도록 보정

    trackWindowGesture(
      (moveEvent) => {
        const curLogical = screenToLogical(moveEvent.clientX, moveEvent.clientY);
        const dxScreen = curLogical.x - startLogical.x;
        const dyScreen = curLogical.y - startLogical.y;
        const dx = dxScreen * Math.cos(rad) - dyScreen * Math.sin(rad);
        const dy = dxScreen * Math.sin(rad) + dyScreen * Math.cos(rad);

        let width = startWidth;
        let height = startHeight;
        let x = startX;
        let y = startY;
        if (horizontal === 'right') width = Math.max(160, startWidth + dx);
        if (horizontal === 'left') {
          width = Math.max(160, startWidth - dx);
          x = startX + (startWidth - width);
        }
        if (vertical === 'bottom') height = Math.max(20, startHeight + dy);
        if (vertical === 'top') {
          height = Math.max(20, startHeight - dy);
          y = startY + (startHeight - height);
        }
        const next = { id: item.id, x, y, width, height };
        latestRef.current = next;
        setLiveResize(next);
      },
      () => {
        const current = latestRef.current;
        latestRef.current = null;
        setLiveResize(null);
        if (current && current.id === item.id) {
          onUpdateItems([{ id: item.id, x: current.x, y: current.y, rotate: item.rotate, width: current.width, height: current.height }]);
        }
      },
    );
  }

  return { liveResize, startResize };
}

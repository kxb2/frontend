import { useEffect, useRef, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem } from '@/types/canvas';
import { rotateAround, trackWindowGesture } from '@/app/canvas/_components/core/utils';
import { expandSectionChildrenIds } from '@/app/canvas/_components/transform/useSelect';
import { snapRotationDeg } from '@/app/canvas/_components/transform/math';
import { isSelectTool, type Tool } from '@/app/canvas/_components/core/Toolbar';

export const CORNER_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
export type CornerAnchor = (typeof CORNER_ANCHORS)[number];
export const CORNER_LOCAL_OFFSETS: Record<CornerAnchor, (w: number, h: number) => { x: number; y: number }> = {
  'top-left': () => ({ x: 0, y: 0 }),
  'top-right': (w) => ({ x: w, y: 0 }),
  'bottom-left': (_w, h) => ({ x: 0, y: h }),
  'bottom-right': (w, h) => ({ x: w, y: h }),
};
// 회전 가능 영역이 아이템 안쪽으로 파고들지 않게 함
export const CORNER_ZONE_PIVOT: Record<CornerAnchor, { x: number; y: number }> = {
  'top-left': { x: 40, y: 40 },
  'top-right': { x: 0, y: 40 },
  'bottom-left': { x: 40, y: 0 },
  'bottom-right': { x: 0, y: 0 },
};
// 회전 가능 영역에 마우스를 올리면 크기 조절과 구분되는 회전 커서를 보여줌
export const ROTATE_CURSOR =
  'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4a8 8 0 1 0 7.75 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" fill="black" stroke="white" stroke-width="0.5"/></svg>\') 12 12, pointer';

interface UseRotateParams {
  tool: Tool;
  selectedIds: Set<string>;
  items: CanvasItem[]; // 선택된 섹션의 소속 아이템을 같이 회전시키기 위함
  transformerRef: RefObject<Konva.Transformer | null>;
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  scale: number;
  stagePos: { x: number; y: number };
  screenToLogical: (clientX: number, clientY: number) => { x: number; y: number };
  syncConnectors: () => void;
  syncResizeAnchors?: () => void; // 메모의 컨트롤(useMemoAnchors)도 매 프레임 명시적으로 동기화
  onRotateEnd: () => void;
}

// 꼭짓점 4개에 회전 가능 영역을 별도로 마련하고, 기본 앵커는 크기 변경만 가능하게 함
export function useRotate({
  tool,
  selectedIds,
  items,
  transformerRef,
  nodeMapRef,
  scale,
  stagePos,
  screenToLogical,
  syncConnectors,
  syncResizeAnchors,
  onRotateEnd,
}: UseRotateParams) {
  const rotateZoneRefs = useRef<Partial<Record<CornerAnchor, Konva.Rect>>>({});

  // Transformer의 현재 박스를 기준으로 꼭짓점 4개의 실제 위치를 계산해 회전 가능 영역을 그리로 옮김
  function getTransformerLocalBox(transformer: Konva.Transformer) {
    return {
      x: (transformer.x() - stagePos.x) / scale,
      y: (transformer.y() - stagePos.y) / scale,
      w: transformer.width() / scale,
      h: transformer.height() / scale,
    };
  }

  function syncRotateZones() {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const hasSelection = isSelectTool(tool) && transformer.nodes().length > 0;
    if (!hasSelection) {
      CORNER_ANCHORS.forEach((corner) => rotateZoneRefs.current[corner]?.visible(false));
      transformer.getLayer()?.batchDraw();
      return;
    }
    const { x, y, w, h } = getTransformerLocalBox(transformer);
    const rot = transformer.rotation();
    CORNER_ANCHORS.forEach((corner) => {
      const local = CORNER_LOCAL_OFFSETS[corner](w, h);
      const pos = rotateAround(x + local.x, y + local.y, x, y, rot);
      const node = rotateZoneRefs.current[corner];
      if (!node) return;
      node.position(pos);
      node.rotation(rot);
      node.visible(true);
    });
    transformer.getLayer()?.batchDraw();
  }

  // 회전 가능 영역을 Transformer의 회전과 위치 변경에 따라 동기화
  useEffect(() => {
    syncRotateZones();
  });

  function registerRotateZone(corner: CornerAnchor, node: Konva.Rect | null) {
    if (node) rotateZoneRefs.current[corner] = node;
    else delete rotateZoneRefs.current[corner];
  }

  // 회전 가능 영역에서 마우스 다운 이벤트가 발생하면, 선택된 노드들을 회전시킴
  function handleRotateZonePointerDown(e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    const transformer = transformerRef.current;
    if (!transformer) return;
    const { x, y, w, h } = getTransformerLocalBox(transformer);
    const rot = transformer.rotation();
    const center = rotateAround(x + w / 2, y + h / 2, x, y, rot);

    // 선택된 섹션이 있으면 그 소속 아이템들도 함께 회전 대상에 포함 (섹션은 그룹처럼 동작)
    const nodes = Array.from(expandSectionChildrenIds(items, selectedIds))
      .map((id) => nodeMapRef.current.get(id))
      .filter((node): node is Konva.Group => !!node);
    if (nodes.length === 0) return;
    const startStates = nodes.map((node) => ({ id: node.id(), x: node.x(), y: node.y(), rotation: node.rotation() }));

    const startLogical = screenToLogical(e.evt.clientX, e.evt.clientY);
    const startAngle = Math.atan2(startLogical.y - center.y, startLogical.x - center.x);

    trackWindowGesture(
      (moveEvent) => {
        const cur = screenToLogical(moveEvent.clientX, moveEvent.clientY);
        const curAngle = Math.atan2(cur.y - center.y, cur.x - center.x);
        // Shift를 누른 채면 15도 단위로 스냅(수평/수직 정렬이 쉬워짐)
        const deltaDeg = snapRotationDeg(((curAngle - startAngle) * 180) / Math.PI, moveEvent.shiftKey);
        startStates.forEach((start) => {
          const node = nodeMapRef.current.get(start.id);
          if (!node) return;
          const rotated = rotateAround(start.x, start.y, center.x, center.y, deltaDeg);
          node.position(rotated);
          node.rotation(start.rotation + deltaDeg);
        });
        transformer.forceUpdate();
        syncConnectors();
        syncRotateZones();
        syncResizeAnchors?.();
      },
      () => {
        onRotateEnd();
      },
    );
  }

  return { registerRotateZone, syncRotateZones, handleRotateZonePointerDown };
}

'use client';

import { useRef } from 'react';
import type Konva from 'konva';
import { Group, Rect } from 'react-konva';
import type { CanvasItem, SectionCanvasItem } from '@/types/canvas';
import { computeMemoScalePatch } from '@/app/canvas/_components/tools/memo/layout';
import type { MemoLiveResize } from '@/app/canvas/_components/tools/memo/useMemoResize';
import type { SectionLiveResize, SectionResizeHandle } from '@/app/canvas/_components/tools/section/useSectionResize';
import { isItemListeningTool, isSelectTool, type Tool } from '@/app/canvas/_components/core/Toolbar';
import { ResizeEdges } from '@/app/canvas/_components/transform/ResizeEdges';

interface SectionItemProps {
  item: SectionCanvasItem;
  tool: Tool;
  items: CanvasItem[]; // 이 섹션 소속(parentId) 자식을 찾기 위함
  nodeMapRef: React.RefObject<Map<string, Konva.Group>>;
  isSelected: boolean;
  showIndividualBorder: boolean;
  liveResize?: SectionLiveResize; // 변 드래그로 크기 조절 중 실시간 폭/높이/위치
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>, item: SectionCanvasItem) => void;
  onConnectorStart: (e: Konva.KonvaEventObject<MouseEvent>, item: SectionCanvasItem) => void;
  onLiveChange: (item: SectionCanvasItem) => void;
  onGestureEnd: () => void;
  onResizeStart: (handle: SectionResizeHandle, item: SectionCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void; // 변 자체 드래그(꼭짓점은 Overlay의 동그란 컨트롤이 담당)
  onMemoLiveOverride: (id: string, value: MemoLiveResize | null) => void; // 다중선택으로 Transformer가 섹션을 리사이즈할 때 메모 자식의 실시간 내용 기준 크기를 신고
  registerNode: (id: string, node: Konva.Group | null) => void;
}

// 섹션 (그룹처럼 동작 -- 단독 선택 시엔 꼭짓점 동그란 컨트롤 + 변 자체 드래그로 리사이즈, 다중선택 땐 공유 Transformer로 함께 리사이즈)
export default function SectionItem({
  item,
  tool,
  items,
  nodeMapRef,
  isSelected,
  showIndividualBorder,
  liveResize,
  onSelect,
  onConnectorStart,
  onLiveChange,
  onGestureEnd,
  onResizeStart,
  onMemoLiveOverride,
  registerNode,
}: SectionItemProps) {
  const lastPos = useRef({ x: 0, y: 0 });
  // 다중선택 Transformer 리사이즈 시작 시점의 섹션/자식 top-left 스냅샷 (라이브 스케일 비율 계산의 기준)
  const transformStart = useRef<{ x: number; y: number; children: Array<{ id: string; x: number; y: number }> } | null>(null);

  function setGroupRef(node: Konva.Group | null) {
    registerNode(item.id, node);
  }

  function handleGroupMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool === 'connector') onConnectorStart(e, item);
    else onSelect(e, item);
  }

  function handleDragStart(e: Konva.KonvaEventObject<DragEvent>) {
    lastPos.current = { x: e.target.x(), y: e.target.y() };
  }

  // 섹션을 드래그하면 소속 아이템들도 같은 델타만큼 명령형으로 함께 이동
  function handleDragMove(e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const dx = node.x() - lastPos.current.x;
    const dy = node.y() - lastPos.current.y;
    lastPos.current = { x: node.x(), y: node.y() };
    items.forEach((child) => {
      if (child.parentId !== item.id) return;
      const childNode = nodeMapRef.current.get(child.id);
      if (!childNode) return;
      childNode.x(childNode.x() + dx);
      childNode.y(childNode.y() + dy);
    });
    onLiveChange(item);
  }

  // 다중선택 Transformer 리사이즈 시작 시점의 섹션/자식 top-left 좌표를 스냅샷
  function handleTransformStart() {
    const node = nodeMapRef.current.get(item.id);
    if (!node) return;
    const children = items
      .filter((child) => child.parentId === item.id)
      .map((child) => {
        const childNode = nodeMapRef.current.get(child.id);
        if (!childNode) return null;
        return { id: child.id, x: childNode.x() - childNode.offsetX(), y: childNode.y() - childNode.offsetY() };
      })
      .filter((c): c is { id: string; x: number; y: number } => !!c);
    transformStart.current = { x: node.x() - node.offsetX(), y: node.y() - node.offsetY(), children };
  }

  // 다중선택 그룹 리사이즈: 자식도 같은 비율로 이동 (미디어는 raw scale 그대로, 메모는 가로만 배율+세로는 내용 기준 재계산)
  function handleTransform(e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    const start = transformStart.current;
    if (start) {
      const sx = node.scaleX();
      const sy = node.scaleY();
      const curX = node.x() - node.offsetX() * sx;
      const curY = node.y() - node.offsetY() * sy;
      start.children.forEach((child) => {
        const relX = child.x - start.x;
        const relY = child.y - start.y;
        const newX = curX + relX * sx;
        const newY = curY + relY * sy;
        const childItem = items.find((i) => i.id === child.id);
        if (childItem?.type === 'memo') {
          const { width, height } = computeMemoScalePatch(childItem, sx);
          onMemoLiveOverride(child.id, { id: child.id, x: newX, y: newY, width, height });
          return;
        }
        const childNode = nodeMapRef.current.get(child.id);
        if (!childNode) return;
        childNode.scaleX(sx);
        childNode.scaleY(sy);
        childNode.x(newX + childNode.offsetX() * sx);
        childNode.y(newY + childNode.offsetY() * sy);
      });
    }
    onLiveChange(item);
  }

  const x = liveResize?.x ?? item.x;
  const y = liveResize?.y ?? item.y;
  const width = liveResize?.width ?? item.width;
  const height = liveResize?.height ?? item.height;
  const canResize = isSelected && isSelectTool(tool);

  return (
    <Group
      ref={setGroupRef}
      id={item.id}
      x={x + width / 2}
      y={y + height / 2}
      offsetX={width / 2}
      offsetY={height / 2}
      width={width}
      height={height}
      rotation={item.rotate}
      scaleX={1}
      scaleY={1}
      draggable={isSelectTool(tool)}
      listening={isItemListeningTool(tool)}
      onMouseDown={handleGroupMouseDown}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={onGestureEnd}
      onTransformStart={handleTransformStart}
      onTransform={handleTransform}
      onTransformEnd={onGestureEnd}
    >
      <Rect width={width} height={height} fill="rgba(57,66,87,0.2)" stroke="#394257" strokeWidth={1} cornerRadius={8} />
      {showIndividualBorder && <Rect width={width} height={height} stroke="#c255ff" strokeWidth={2} listening={false} />}
      {canResize && <ResizeEdges width={width} height={height} onEdgeMouseDown={(edge, e) => onResizeStart(edge, item, e)} />}
    </Group>
  );
}

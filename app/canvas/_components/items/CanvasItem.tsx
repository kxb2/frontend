'use client';

import type Konva from 'konva';
import type { CanvasItem, MediaCanvasItem, MemoCanvasItem, SectionCanvasItem } from '@/types/canvas';
import type { Tool } from '@/app/canvas/_components/core/Toolbar';
import MediaItem from '@/app/canvas/_components/items/MediaItem';
import MemoItem from '@/app/canvas/_components/items/MemoItem';
import SectionItem from '@/app/canvas/_components/items/SectionItem';
import type { MemoLiveResize, MemoResizeHandle } from '@/app/canvas/_components/tools/memo/useMemoResize';
import type { SectionLiveResize, SectionResizeHandle } from '@/app/canvas/_components/tools/section/useSectionResize';
import type { ItemLiveResize } from '@/app/canvas/_components/transform/useItemResize';
import type { ResizeHandle } from '@/app/canvas/_components/transform/math';

interface CanvasKonvaItemProps {
  item: CanvasItem;
  tool: Tool;
  stageScale: number;
  items: CanvasItem[]; // 섹션이 자신의 자식을 찾을 때만 사용
  nodeMapRef: React.RefObject<Map<string, Konva.Group>>;
  isSelected: boolean;
  showIndividualBorder: boolean;
  isEditing: boolean;
  liveText?: string; // 메모 편집 중 textarea 실시간 입력된 값
  liveResize?: MemoLiveResize; // 메모 테두리 크기 조절 중 실시간 폭/높이/위치
  sectionLiveResize?: SectionLiveResize; // 섹션 변 드래그 크기 조절 중 실시간 폭/높이/위치
  mediaLiveResize?: ItemLiveResize; // 이미지/영상 변 드래그 크기 조절 중 실시간 폭/높이/위치
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) => void;
  onConnectorStart: (e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) => void;
  onToggleColorPicker: (item: CanvasItem) => void;
  onCycleViewMode: (item: CanvasItem) => void;
  onResizeStart: (handle: MemoResizeHandle, item: MemoCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onSectionResizeStart: (handle: SectionResizeHandle, item: SectionCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMediaResizeStart: (handle: ResizeHandle, item: MediaCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onGestureEnd: () => void;
  onLiveChange: (item: CanvasItem) => void;
  onItemDblClick: (item: CanvasItem) => void;
  onTaintCanvas: () => void; // CORS 없이 그려진 이미지/영상이 있어 캔버스가 오염됐음을 신고 (썸네일 캡처 스킵용)
  onMemoLiveOverride: (id: string, value: MemoLiveResize | null) => void; // 섹션 전파/다중선택 리사이즈 중 메모의 실시간 내용 기준 크기를 신고
  registerNode: (id: string, node: Konva.Group | null) => void;
  registerEditableNode: (id: string, node: Konva.Node | null) => void;
  registerMenuNode: (id: string, node: Konva.Group | null) => void;
}

// CanvasItem을 item.type에 따라 MediaItem/MemoItem/SectionItem으로 위임
export default function CanvasKonvaItem({
  item,
  tool,
  stageScale,
  items,
  nodeMapRef,
  isSelected,
  showIndividualBorder,
  isEditing,
  liveText,
  liveResize,
  sectionLiveResize,
  mediaLiveResize,
  onSelect,
  onConnectorStart,
  onToggleColorPicker,
  onCycleViewMode,
  onResizeStart,
  onSectionResizeStart,
  onMediaResizeStart,
  onGestureEnd,
  onLiveChange,
  onItemDblClick,
  onTaintCanvas,
  onMemoLiveOverride,
  registerNode,
  registerEditableNode,
  registerMenuNode,
}: CanvasKonvaItemProps) {
  if (item.type === 'image' || item.type === 'video') {
    return (
      <MediaItem
        item={item}
        tool={tool}
        stageScale={stageScale}
        isSelected={isSelected}
        showIndividualBorder={showIndividualBorder}
        liveResize={mediaLiveResize?.id === item.id ? mediaLiveResize : undefined}
        onSelect={onSelect}
        onConnectorStart={onConnectorStart}
        onItemDblClick={onItemDblClick}
        onLiveChange={onLiveChange}
        onGestureEnd={onGestureEnd}
        onResizeStart={onMediaResizeStart}
        onTaintCanvas={onTaintCanvas}
        registerNode={registerNode}
      />
    );
  }

  if (item.type === 'memo') {
    return (
      <MemoItem
        item={item}
        tool={tool}
        isSelected={isSelected}
        showIndividualBorder={showIndividualBorder}
        isEditing={isEditing}
        liveText={liveText}
        liveResize={liveResize}
        onSelect={onSelect}
        onConnectorStart={onConnectorStart}
        onToggleColorPicker={onToggleColorPicker}
        onCycleViewMode={onCycleViewMode}
        onResizeStart={onResizeStart}
        onGestureEnd={onGestureEnd}
        onLiveChange={onLiveChange}
        onItemDblClick={onItemDblClick}
        onMemoLiveOverride={onMemoLiveOverride}
        registerNode={registerNode}
        registerEditableNode={registerEditableNode}
        registerMenuNode={registerMenuNode}
      />
    );
  }

  if (item.type === 'section') {
    return (
      <SectionItem
        item={item}
        tool={tool}
        items={items}
        nodeMapRef={nodeMapRef}
        isSelected={isSelected}
        showIndividualBorder={showIndividualBorder}
        liveResize={sectionLiveResize?.id === item.id ? sectionLiveResize : undefined}
        onSelect={onSelect}
        onConnectorStart={onConnectorStart}
        onLiveChange={onLiveChange}
        onGestureEnd={onGestureEnd}
        onResizeStart={onSectionResizeStart}
        onMemoLiveOverride={onMemoLiveOverride}
        registerNode={registerNode}
      />
    );
  }

  return null;
}

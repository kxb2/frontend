'use client';

import type Konva from 'konva';
import type { CanvasItem, MemoCanvasItem } from '@/types/canvas';
import type { Tool } from '@/app/canvas/_components/toolbar';
import MediaItem from '@/app/canvas/_components/items/MediaItem';
import MemoItem from '@/app/canvas/_components/items/MemoItem';
import type { MemoLiveResize, MemoResizeHandle } from '@/app/canvas/_components/tools/memo/useMemoResize';

interface CanvasKonvaItemProps {
  item: CanvasItem;
  tool: Tool;
  stageScale: number;
  isSelected: boolean;
  showIndividualBorder: boolean;
  isEditing: boolean;
  liveText?: string; // 메모 편집 중 textarea 실시간 입력된 값
  liveResize?: MemoLiveResize; // 메모 테두리 크기 조절 중 실시간 폭/높이/위치
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) => void;
  onConnectorStart: (e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) => void;
  onToggleColorPicker: (item: CanvasItem) => void;
  onCycleViewMode: (item: CanvasItem) => void;
  onResizeStart: (handle: MemoResizeHandle, item: MemoCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onGestureEnd: () => void;
  onLiveChange: (item: CanvasItem) => void;
  onItemDblClick: (item: CanvasItem) => void;
  registerNode: (id: string, node: Konva.Group | null) => void;
  registerEditableNode: (id: string, node: Konva.Node | null) => void;
  registerMenuNode: (id: string, node: Konva.Group | null) => void;
}

// CanvasItem을 item.type에 따라 MediaItem/MemoItem으로 위임
export default function CanvasKonvaItem({
  item,
  tool,
  stageScale,
  isSelected,
  showIndividualBorder,
  isEditing,
  liveText,
  liveResize,
  onSelect,
  onConnectorStart,
  onToggleColorPicker,
  onCycleViewMode,
  onResizeStart,
  onGestureEnd,
  onLiveChange,
  onItemDblClick,
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
        showIndividualBorder={showIndividualBorder}
        onSelect={onSelect}
        onConnectorStart={onConnectorStart}
        onItemDblClick={onItemDblClick}
        onLiveChange={onLiveChange}
        onGestureEnd={onGestureEnd}
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
        registerNode={registerNode}
        registerEditableNode={registerEditableNode}
        registerMenuNode={registerMenuNode}
      />
    );
  }

  return null;
}

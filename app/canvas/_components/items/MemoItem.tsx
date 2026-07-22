'use client';

import { useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import { Circle, Group, Path, Rect, Text as KonvaText } from 'react-konva';
import type { MemoCanvasItem, MemoViewMode } from '@/types/canvas';
import { isItemListeningTool, isSelectTool, type Tool } from '@/app/canvas/_components/toolbar';
import type { MemoLiveResize, MemoResizeHandle } from '@/app/canvas/_components/tools/memo/useMemoResize';
import {
  MEMO_ALL_CORNER_RADIUS,
  MEMO_BODY_BG,
  MEMO_BODY_CORNER_RADIUS,
  MEMO_BODY_GAP,
  MEMO_BODY_PAD_X,
  MEMO_BODY_PAD_Y,
  MEMO_CHEVRON_PATH,
  MEMO_CONTENT_FONT_SIZE,
  MEMO_CORNER_RADIUS,
  MEMO_COUNTER_FONT_SIZE,
  MEMO_FILE_ICON_PATH,
  MEMO_HEADER_HEIGHT,
  MEMO_HEADER_PAD_X,
  MEMO_LINE_HEIGHT,
  MEMO_MAX_CHARS,
  MEMO_PALETTE,
  MEMO_PLACEHOLDER,
  MEMO_TITLE_FONT_SIZE,
  MEMO_TOGGLE_SIZE,
  MEMO_WIDTH,
  TEXT_FONT_FAMILY,
  getMemoContentWidth,
  getMemoCounterHeight,
  getMemoWidthRatio,
  measureMemo,
} from '@/app/canvas/_components/tools/memo/memoLayout';

interface MemoItemProps {
  item: MemoCanvasItem;
  tool: Tool;
  isSelected: boolean;
  showIndividualBorder: boolean;
  isEditing: boolean;
  liveText?: string; // 메모 편집 중 textarea 실시간 입력된 값
  liveResize?: MemoLiveResize; // 메모 테두리 크기 조절 중 실시간 폭/높이/위치
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>, item: MemoCanvasItem) => void;
  onConnectorStart: (e: Konva.KonvaEventObject<MouseEvent>, item: MemoCanvasItem) => void;
  onToggleColorPicker: (item: MemoCanvasItem) => void;
  onCycleViewMode: (item: MemoCanvasItem) => void;
  onResizeStart: (handle: MemoResizeHandle, item: MemoCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void;
  onGestureEnd: () => void;
  onLiveChange: (item: MemoCanvasItem) => void;
  onItemDblClick: (item: MemoCanvasItem) => void;
  registerNode: (id: string, node: Konva.Group | null) => void;
  registerEditableNode: (id: string, node: Konva.Node | null) => void;
  registerMenuNode: (id: string, node: Konva.Group | null) => void;
}

// 메모
export default function MemoItem({
  item,
  tool,
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
}: MemoItemProps) {
  const groupRef = useRef<Konva.Group>(null);

  function setGroupRef(node: Konva.Group | null) {
    groupRef.current = node;
    registerNode(item.id, node);
  }

  // 커넥터/선택 툴에 따라 이벤트 분기
  function handleGroupMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool === 'connector') onConnectorStart(e, item);
    else onSelect(e, item);
  }

  const palette = MEMO_PALETTE[item.color];
  const effectiveX = liveResize?.x ?? item.x;
  const effectiveY = liveResize?.y ?? item.y;
  const width = liveResize?.width ?? item.width ?? MEMO_WIDTH;
  // 가로 조절 로직 (메모 헤더)
  const ratio = getMemoWidthRatio(width);
  const contentWidth = getMemoContentWidth(width);
  // 세로 조절 로직 (메모 본문)
  const textForSizing = isEditing && liveText !== undefined ? liveText : item.text;
  const naturalContentHeight = useMemo(() => measureMemo(textForSizing, contentWidth), [textForSizing, contentWidth]); // 텍스트/폭이 그대로면 재계산을 건너뛰도록 메모이즈
  const contentHeight = liveResize?.height ?? item.height ?? naturalContentHeight;
  const [scrollOffset, setScrollOffset] = useState(0);
  const maxScroll = Math.max(0, naturalContentHeight - contentHeight);
  const effectiveScroll = Math.min(scrollOffset, maxScroll);
  function handleContentWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    if (isEditing || maxScroll <= 0) return;
    e.cancelBubble = true;
    e.evt.preventDefault();
    setScrollOffset((prev) => Math.min(maxScroll, Math.max(0, prev + e.evt.deltaY)));
  }
  const title = `메모 ${String(item.seq).padStart(3, '0')}`;
  const headerHeight = MEMO_HEADER_HEIGHT;
  // 편집 중에는 접힘 모드여도 항상 전체 보기로 전환
  const effectiveViewMode: MemoViewMode = isEditing ? 'full' : item.viewMode;
  const bodyHeight = effectiveViewMode === 'collapsed' ? 0 : MEMO_BODY_PAD_Y * 2 + contentHeight + MEMO_BODY_GAP + getMemoCounterHeight();
  const totalHeight = headerHeight + bodyHeight;
  const toggleRotation = item.viewMode === 'collapsed' ? 0 : 180;

  // 메모 헤더 레이아웃
  const headerMargin = MEMO_HEADER_PAD_X * ratio;
  const iconTitleGap = 8 * ratio;
  const toggleDotsGap = 8 * ratio;
  const iconX = headerMargin;
  const titleX = headerMargin + 12 + iconTitleGap;
  const dotsX = width - headerMargin - 20;
  const toggleX = dotsX - toggleDotsGap - MEMO_TOGGLE_SIZE;
  const bodyPadX = MEMO_BODY_PAD_X * ratio;
  const canResize = isSelected && isSelectTool(tool);
 
  // 확대/축소
  const resizeEdgeInset = 16;
  const resizeZoneThickness = 10;

  function setResizeCursor(cursor: string) {
    return (e: Konva.KonvaEventObject<MouseEvent>) => {
      const container = e.target.getStage()?.container();
      if (container) container.style.cursor = cursor;
    };
  }
  const clearCursor = setResizeCursor('');

  return (
    <Group
      ref={setGroupRef}
      id={item.id}
      x={effectiveX + width / 2}
      y={effectiveY + totalHeight / 2}
      offsetX={width / 2}
      offsetY={totalHeight / 2}
      width={width}
      height={totalHeight}
      rotation={item.rotate}
      scaleX={1}
      scaleY={1}
      draggable={isSelectTool(tool)}
      listening={isItemListeningTool(tool)}
      onMouseDown={handleGroupMouseDown}
      onDblClick={() => onItemDblClick(item)}
      onDragMove={() => onLiveChange(item)}
      onTransform={() => onLiveChange(item)}
      onDragEnd={onGestureEnd}
      onTransformEnd={onGestureEnd}
    >
      <Rect
        width={width}
        height={headerHeight}
        fill={palette.header}
        stroke={palette.border}
        strokeWidth={1}
        cornerRadius={effectiveViewMode === 'collapsed' ? MEMO_ALL_CORNER_RADIUS : MEMO_CORNER_RADIUS}
      />
      {effectiveViewMode !== 'collapsed' && (
        <Rect y={headerHeight} width={width} height={bodyHeight} fill={MEMO_BODY_BG} stroke={palette.border} strokeWidth={1} cornerRadius={MEMO_BODY_CORNER_RADIUS} />
      )}
      <Path data={MEMO_FILE_ICON_PATH} x={iconX} y={(headerHeight - 12) / 2} stroke={palette.fg} strokeWidth={1} lineCap="round" lineJoin="round" listening={false} />
      <KonvaText
        text={title}
        x={titleX}
        y={0}
        height={headerHeight}
        verticalAlign="middle"
        fontSize={MEMO_TITLE_FONT_SIZE}
        fontStyle="bold"
        fontFamily={TEXT_FONT_FAMILY}
        fill={palette.fg}
        listening={false}
      />
      {/* 접힘/전체 보기 */}
      <Group
        x={toggleX}
        y={(headerHeight - MEMO_TOGGLE_SIZE) / 2}
        width={MEMO_TOGGLE_SIZE}
        height={MEMO_TOGGLE_SIZE}
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onCycleViewMode(item);
        }}
        onDblClick={(e) => {
          e.cancelBubble = true; // 빠른 연타로 인한 버블링 버그 방지
        }}
      >
        <Rect x={-4} y={-4} width={MEMO_TOGGLE_SIZE + 8} height={MEMO_TOGGLE_SIZE + 8} fill="transparent" />
        <Group x={MEMO_TOGGLE_SIZE / 2} y={MEMO_TOGGLE_SIZE / 2} offsetX={MEMO_TOGGLE_SIZE / 2} offsetY={MEMO_TOGGLE_SIZE / 2} rotation={toggleRotation}>
          <Path data={MEMO_CHEVRON_PATH} stroke={palette.fg} strokeWidth={1.5} lineCap="round" lineJoin="round" listening={false} />
        </Group>
      </Group>
      <Group
        ref={(node) => registerMenuNode(item.id, node)}
        x={dotsX}
        y={(headerHeight - 4) / 2}
        width={20}
        height={4}
        onMouseDown={(e) => {
          e.cancelBubble = true;
          onToggleColorPicker(item);
        }}
        onDblClick={(e) => {
          e.cancelBubble = true; // 빠른 연타로 인한 버블링 버그 방지
        }}
      >
        {/* 컬러 선택 */}
        <Rect x={-6} y={-10} width={32} height={24} fill="transparent" />
        <Circle x={2} y={2} radius={2} fill={palette.fg} />
        <Circle x={10} y={2} radius={2} fill={palette.fg} />
        <Circle x={18} y={2} radius={2} fill={palette.fg} />
      </Group>
      {effectiveViewMode === 'full' && (
        <Group
          x={bodyPadX}
          y={headerHeight + MEMO_BODY_PAD_Y}
          width={contentWidth}
          height={contentHeight}
          clipX={0}
          clipY={0}
          clipWidth={contentWidth}
          clipHeight={contentHeight}
          onWheel={handleContentWheel}
        >
          <Group
            ref={(node) => registerEditableNode(item.id, node)}
            x={contentWidth / 2}
            y={contentHeight / 2}
            offsetX={contentWidth / 2}
            offsetY={contentHeight / 2}
            width={contentWidth}
            height={contentHeight}
            onDblClick={() => onItemDblClick(item)}
          >
            <KonvaText
              text={item.text || MEMO_PLACEHOLDER}
              y={-effectiveScroll}
              fontSize={MEMO_CONTENT_FONT_SIZE}
              fontFamily={TEXT_FONT_FAMILY}
              fill={item.text ? '#bfc7d6' : 'rgba(191,199,214,0.4)'}
              lineHeight={MEMO_LINE_HEIGHT}
              width={contentWidth}
              height={naturalContentHeight}
              wrap="word"
              visible={!isEditing}
            />
          </Group>
        </Group>
      )}
      {effectiveViewMode !== 'collapsed' && (
        <KonvaText
          text={`${(isEditing && liveText !== undefined ? liveText : item.text).length}/${MEMO_MAX_CHARS}`}
          x={bodyPadX}
          y={headerHeight + bodyHeight - MEMO_BODY_PAD_Y - getMemoCounterHeight()}
          width={contentWidth}
          align="right"
          fontSize={MEMO_COUNTER_FONT_SIZE}
          fontFamily={TEXT_FONT_FAMILY}
          fill="#525252"
          listening={false}
        />
      )}
      {showIndividualBorder && <Rect width={width} height={totalHeight} stroke="#c255ff" strokeWidth={2} listening={false} />}
      {/* 메모 테두리 선 = 가로/세로 사이즈 컨트롤 */}
      {canResize && (
        <>
          <Rect
            x={0}
            y={resizeEdgeInset}
            width={resizeZoneThickness}
            height={Math.max(0, totalHeight - resizeEdgeInset * 2)}
            fill="transparent"
            onMouseDown={(e) => onResizeStart('left', item, e)}
            onMouseEnter={setResizeCursor('ew-resize')}
            onMouseLeave={clearCursor}
          />
          <Rect
            x={width - resizeZoneThickness}
            y={resizeEdgeInset}
            width={resizeZoneThickness}
            height={Math.max(0, totalHeight - resizeEdgeInset * 2)}
            fill="transparent"
            onMouseDown={(e) => onResizeStart('right', item, e)}
            onMouseEnter={setResizeCursor('ew-resize')}
            onMouseLeave={clearCursor}
          />
          {effectiveViewMode === 'full' && (
            <>
              <Rect
                x={resizeEdgeInset}
                y={0}
                width={Math.max(0, width - resizeEdgeInset * 2)}
                height={resizeZoneThickness}
                fill="transparent"
                onMouseDown={(e) => onResizeStart('top', item, e)}
                onMouseEnter={setResizeCursor('ns-resize')}
                onMouseLeave={clearCursor}
              />
              <Rect
                x={resizeEdgeInset}
                y={totalHeight - resizeZoneThickness}
                width={Math.max(0, width - resizeEdgeInset * 2)}
                height={resizeZoneThickness}
                fill="transparent"
                onMouseDown={(e) => onResizeStart('bottom', item, e)}
                onMouseEnter={setResizeCursor('ns-resize')}
                onMouseLeave={clearCursor}
              />
            </>
          )}
        </>
      )}
    </Group>
  );
}

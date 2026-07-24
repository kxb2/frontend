'use client';

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type Konva from 'konva';
import { Layer, Stage } from 'react-konva';
import type { CanvasItem, CanvasProps, MediaCanvasItem } from '@/types/canvas';
import CanvasKonvaItem from '@/app/canvas/_components/items/CanvasItem';
import { computeMemoScalePatch } from '@/app/canvas/_components/tools/memo/layout';
import Lines from '@/app/canvas/_components/tools/connector/Lines';
import Handles from '@/app/canvas/_components/tools/connector/Handles';
import Overlay from '@/app/canvas/_components/transform/Overlay';
import MemoEdit from '@/app/canvas/_components/tools/memo/MemoEdit';
import MemoColorPicker from '@/app/canvas/_components/tools/memo/MemoColorPicker';
import { useMemoEdit } from '@/app/canvas/_components/tools/memo/useMemoEdit';
import { useMemoColorPicker } from '@/app/canvas/_components/tools/memo/useMemoColorPicker';
import { useMemoResize, type MemoLiveResize } from '@/app/canvas/_components/tools/memo/useMemoResize';
import { useMemoAnchors } from '@/app/canvas/_components/tools/memo/useMemoAnchors';
import { useSectionResize } from '@/app/canvas/_components/tools/section/useSectionResize';
import { useItemResize } from '@/app/canvas/_components/transform/useItemResize';
import { useItemAnchors } from '@/app/canvas/_components/transform/useItemAnchors';
import { type CornerAnchor } from '@/app/canvas/_components/transform/useRotate';
import type { ResizeHandle } from '@/app/canvas/_components/transform/math';
import { useConnector } from '@/app/canvas/_components/tools/connector/useConnector';
import { useSelect } from '@/app/canvas/_components/transform/useSelect';
import { useRotate } from '@/app/canvas/_components/transform/useRotate';
import { useViewport } from '@/app/canvas/_components/core/useViewport';
import { expandSectionChildrenIds } from '@/app/canvas/_components/transform/useSelect';
import { isSelectTool } from '@/app/canvas/_components/core/Toolbar';
import { MEMO_PALETTE, MEMO_WIDTH } from '@/app/canvas/_components/tools/memo/layout';

// 섹션/미디어 꼭짓점 컨트롤 공통 설정
const DIAGONAL_CORNER_CONFIG: Record<CornerAnchor, { handle: ResizeHandle; cursor: string }> = {
  'top-left': { handle: 'top-left', cursor: 'nwse-resize' },
  'top-right': { handle: 'top-right', cursor: 'nesw-resize' },
  'bottom-left': { handle: 'bottom-left', cursor: 'nesw-resize' },
  'bottom-right': { handle: 'bottom-right', cursor: 'nwse-resize' },
};

export interface CanvasHandle {
  getThumbnail: () => string | undefined;
}

const THUMBNAIL_PIXEL_RATIO = 0.2;

// CORS 오염으로 toDataURL을 못 쓸 때의 대체 썸네일
function renderFallbackThumbnail(items: CanvasItem[], scale: number, stagePos: { x: number; y: number }, width: number, height: number): string | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * THUMBNAIL_PIXEL_RATIO));
  canvas.height = Math.max(1, Math.round(height * THUMBNAIL_PIXEL_RATIO));
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  ctx.fillStyle = '#141518';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  items.forEach((item) => {
    const w = (item.type === 'memo' ? (item.width ?? MEMO_WIDTH) : item.type === 'section' ? item.width : (item.width ?? 120)) * scale * THUMBNAIL_PIXEL_RATIO;
    const h = (item.type === 'memo' ? (item.height ?? 80) : item.type === 'section' ? item.height : (item.height ?? 80)) * scale * THUMBNAIL_PIXEL_RATIO;
    const x = (item.x * scale + stagePos.x) * THUMBNAIL_PIXEL_RATIO;
    const y = (item.y * scale + stagePos.y) * THUMBNAIL_PIXEL_RATIO;
    ctx.fillStyle = item.type === 'section' ? 'rgba(57,66,87,0.5)' : item.type === 'memo' ? MEMO_PALETTE[item.color].header : '#3a3f4d';
    ctx.fillRect(x, y, w, h);
  });
  return canvas.toDataURL();
}

const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    tool,
    items,
    connectors,
    onDropFiles,
    onUpdateItems,
    onBringToFront,
    onDeleteItems,
    onAddConnector,
    onDeleteConnector,
    onReconnectConnector,
    onAddMemoItem,
    onCreateSection,
    onGroupItems,
    onUngroupItems,
    onEditItemText,
    onSetMemoColor,
    onSetMemoViewMode,
    onToolChange,
  }: CanvasProps,
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeMapRef = useRef(new Map<string, Konva.Group>());
  // crossOrigin 없이 그려진 이미지/영상이 있으면 true (MediaItem이 신고, 한 번 오염되면 계속 true)
  const taintedRef = useRef(false);
  function markCanvasTainted() {
    taintedRef.current = true;
  }

  const clearConnectorSelectionRef = useRef<() => void>(() => {}); // useSelect이 useConnector보다 먼저 만들어져 직접 참조를 주고받을 수 없으므로 ref로 우회
  const commitScheduledRef = useRef(false);
  const childDragLastPosRef = useRef(new Map<string, { x: number; y: number }>());

  const { size, scale, stagePos, setStagePos, handleWheel, screenToLogical } = useViewport({ rootRef, gridRef, stageRef });

  // 캔버스 썸네일
  const hasMedia = items.some((item) => item.type === 'image' || item.type === 'video');
  useImperativeHandle(ref, () => ({
    getThumbnail: () => {
      if (taintedRef.current || hasMedia) return renderFallbackThumbnail(items, scale, stagePos, size.width, size.height);
      // 선택 테두리가 썸네일에 찍히지 않도록 캡처 시 숨김
      const transformer = transformerRef.current;
      const wasVisible = transformer?.visible();
      transformer?.visible(false);
      const sectionUiNodes = stageRef.current?.find('.selection-border') ?? [];
      const priorVisibility = sectionUiNodes.map((node) => node.visible());
      sectionUiNodes.forEach((node) => node.visible(false));
      try {
        return stageRef.current?.toDataURL({ pixelRatio: THUMBNAIL_PIXEL_RATIO });
      } catch {
        return renderFallbackThumbnail(items, scale, stagePos, size.width, size.height);
      } finally {
        if (transformer && wasVisible !== undefined) {
          transformer.visible(wasVisible);
          transformer.getLayer()?.batchDraw();
        }
        sectionUiNodes.forEach((node, i) => node.visible(priorVisibility[i]));
      }
    },
  }));

  const { selectedIds, selectionBox, handleStageMouseDown, handleItemMouseDown, clearSelection, selectOnly } = useSelect({
    tool,
    items,
    nodeMapRef,
    onBringToFront,
    onDeleteItems,
    onCreateSection,
    onGroupItems,
    onUngroupItems,
    stageRef,
    clearConnectorSelectionRef,
  });

  const {
    previewLineRef,
    selectedConnectorId,
    registerLine,
    registerDot,
    syncConnectors,
    handleConnectorMouseDown,
    handleConnectorClick,
    handleReconnectHandleDown,
    clearConnectorSelection,
  } = useConnector({
    tool,
    connectors,
    nodeMapRef,
    stageRef,
    screenToLogical,
    onAddConnector,
    onDeleteConnector,
    onReconnectConnector,
    clearItemSelection: clearSelection,
  });

  useEffect(() => {
    clearConnectorSelectionRef.current = clearConnectorSelection;
  }, [clearConnectorSelection]);

  const { editingItemId, overlayRect, draftText, registerEditableNode, startEditing, handlePlacementClick, handleFinishEditing, handleDraftChange } = useMemoEdit({
    items,
    scale,
    stagePos,
    stageRef,
    screenToLogical,
    onAddMemoItem,
    onEditItemText,
    onToolChange,
    onFinishSelect: selectOnly,
  });

  const { openMemoId, rect: colorPickerRect, registerMenuNode, toggleColorPicker, closeColorPicker } = useMemoColorPicker({ items, scale, stagePos });

  const { liveResize, startResize } = useMemoResize({ screenToLogical, onUpdateItems });

  // 섹션/다중선택 변형 시 메모가 내용 기준 높이로 보이게 하는 라이브 오버라이드
  const [memoLiveOverrides, setMemoLiveOverrides] = useState<Map<string, MemoLiveResize>>(new Map());
  function setMemoLiveOverride(id: string, value: MemoLiveResize | null) {
    setMemoLiveOverrides((prev) => {
      if (!value && !prev.has(id)) return prev;
      const next = new Map(prev);
      if (value) next.set(id, value);
      else next.delete(id);
      return next;
    });
  }

  // id로 아이템을 반복 조회할 때 items.find 대신 쓰는 캐시
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  // 메모 단독 선택 시 자체 컨트롤만 사용
  const singleSelectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : undefined;
  const singleSelectedItem = singleSelectedId !== undefined ? itemsById.get(singleSelectedId) : undefined;
  const selectedMemoItem = isSelectTool(tool) && singleSelectedItem?.type === 'memo' ? singleSelectedItem : undefined;
  const isSingleMemoSelected = !!selectedMemoItem;
  // 섹션 단독 선택, 꼭짓점 컨트롤 + 변 자체 드래그로 자유 변형
  const selectedSectionItem = isSelectTool(tool) && singleSelectedItem?.type === 'section' ? singleSelectedItem : undefined;
  const isSingleSectionSelected = !!selectedSectionItem;
  const memoAnchors = useMemoAnchors({
    memoItem: selectedMemoItem,
    isEditing: !!selectedMemoItem && editingItemId === selectedMemoItem.id,
    nodeMapRef,
    onResizeStart: startResize,
  });
  const { liveResize: sectionLiveResize, startResize: startSectionResize } = useSectionResize({
    items,
    nodeMapRef,
    screenToLogical,
    onUpdateItems,
    onMemoLiveOverride: setMemoLiveOverride,
  });
  const sectionAnchors = useItemAnchors({ item: selectedSectionItem, cornerConfig: DIAGONAL_CORNER_CONFIG, nodeMapRef, onResizeStart: startSectionResize });
  // 이미지/영상 단독 선택, 꼭짓점 컨트롤 + 변 자체 드래그로 자유 변형(useItemResize를 바로 사용)
  const selectedMediaItem = isSelectTool(tool) && (singleSelectedItem?.type === 'image' || singleSelectedItem?.type === 'video') ? singleSelectedItem : undefined;
  const isSingleMediaSelected = !!selectedMediaItem;
  const { liveResize: mediaLiveResize, startResize: startMediaResize } = useItemResize<MediaCanvasItem>({
    screenToLogical,
    onUpdateItems,
    minSize: 40,
    getStart: (item) => ({ x: item.x, y: item.y, width: item.width ?? 120, height: item.height ?? 80 }),
  });
  const mediaAnchors = useItemAnchors({ item: selectedMediaItem, cornerConfig: DIAGONAL_CORNER_CONFIG, nodeMapRef, onResizeStart: startMediaResize });

  // 메모/섹션/미디어 꼭짓점 컨트롤을 한 번에 동기화 (여러 제스처 콜백에서 반복 호출됨)
  function syncAllResizeAnchors() {
    memoAnchors.syncResizeAnchors();
    sectionAnchors.syncResizeAnchors();
    mediaAnchors.syncResizeAnchors();
  }

  function handleToggleColorPicker(item: CanvasItem) {
    if (!isSelectTool(tool)) return;
    toggleColorPicker(item);
  }

  // 전체 보기/접힘
  function handleCycleViewMode(item: CanvasItem) {
    if (item.type !== 'memo') return;
    onSetMemoViewMode(item.id);
  }

  // 아이템의 새 중심점(cx,cy)을 담고 있는 섹션의 id를 찾음 (최상위 섹션들만 검사, 뒤에 있는(위에 그려진) 섹션 우선)
  function findContainingSectionId(cx: number, cy: number): string | undefined {
    for (let i = items.length - 1; i >= 0; i -= 1) {
      const candidate = items[i];
      if (candidate.type !== 'section') continue;
      if (cx >= candidate.x && cx <= candidate.x + candidate.width && cy >= candidate.y && cy <= candidate.y + candidate.height) return candidate.id;
    }
    return undefined;
  }

  // 선택된 노드들의 드래그/회전/스케일 결과를 하나의 onUpdateItems 호출로 묶어 커밋
  function commitSelectedNodes() {
    // 선택된 섹션이 있으면 그 소속 아이템들도 함께 커밋 대상에 포함
    const idsToCommit = expandSectionChildrenIds(items, selectedIds);

    const patches = Array.from(idsToCommit)
      .map((id) => {
        const node = nodeMapRef.current.get(id);
        if (!node) return null;
        const item = itemsById.get(id);

        // 메모는 라이브 오버라이드(내용 기준 크기)가 있으면 그 값을 그대로 신뢰
        const memoOverride = item?.type === 'memo' ? memoLiveOverrides.get(id) : undefined;
        if (memoOverride) {
          const rotate = node.rotation();
          let parentId = item?.parentId;
          if (selectedIds.has(id)) parentId = findContainingSectionId(memoOverride.x + memoOverride.width / 2, memoOverride.y + memoOverride.height / 2);
          return { id, x: memoOverride.x, y: memoOverride.y, rotate, width: memoOverride.width, height: memoOverride.height, parentId };
        }

        const x = node.x() - node.offsetX();
        const y = node.y() - node.offsetY();
        const rotate = node.rotation();
        const sx = node.scaleX();
        const sy = node.scaleY();
        // Transformer가 남긴 scale은 width/height에 접어넣고 1로 리셋
        node.scaleX(1);
        node.scaleY(1);

        // 메모/이미지·영상/섹션 모두 item.scale로 통째로 안 늘리고 sx/sy를 width/height에 직접 곱함
        let width: number | undefined;
        let height: number | undefined;
        if (item?.type === 'memo') {
          ({ width, height } = computeMemoScalePatch(item, sx));
        } else if (item?.type === 'image' || item?.type === 'video' || item?.type === 'section') {
          width = node.width() * sx;
          height = node.height() * sy;
        }

        // 섹션 자신이 아니면서 원래 직접 선택된 아이템만 소속(parentId)을 재판정 (자식은 상대 위치가 동일하므로 재판정 불필요)
        let parentId = item?.parentId;
        if (item?.type !== 'section' && selectedIds.has(id)) {
          const w = width ?? item?.width ?? 0;
          const h = height ?? item?.height ?? 0;
          parentId = findContainingSectionId(x + w / 2, y + h / 2);
        }

        if (width !== undefined && height !== undefined) return { id, x, y, rotate, width, height, parentId };
        return { id, x, y, rotate, parentId };
      })
      .filter((patch): patch is Exclude<typeof patch, null> => !!patch);
    if (patches.length > 0) onUpdateItems(patches);
    // 이번 제스처에서 쓰인 라이브 오버라이드는 커밋했으니 비움 (안 비우면 다음 렌더에서 방금 커밋한 실제 값 대신 낡은 오버라이드가 계속 우선 적용됨)
    if (memoLiveOverrides.size > 0) setMemoLiveOverrides(new Map());
    childDragLastPosRef.current.clear();
  }

  // 다중 선택 제스처는 노드 수만큼 dragend/transformend가 중복 발화하므로 한 틱 안의 중복 호출을 하나의 커밋으로 결합
  function scheduleCommit() {
    if (commitScheduledRef.current) return;
    commitScheduledRef.current = true;
    queueMicrotask(() => {
      commitScheduledRef.current = false;
      commitSelectedNodes();
    });
  }

  const { registerRotateZone, syncRotateZones, handleRotateZonePointerDown } = useRotate({
    tool,
    selectedIds,
    items,
    transformerRef,
    nodeMapRef,
    scale,
    stagePos,
    screenToLogical,
    syncConnectors,
    syncResizeAnchors: syncAllResizeAnchors,
    onRotateEnd: commitSelectedNodes,
  });

  // 테두리/컨트롤 실시간 동기화
  useLayoutEffect(() => {
    if (!liveResize && !sectionLiveResize && !mediaLiveResize) return;
    const transformer = transformerRef.current;
    if (transformer) transformer.nodes(transformer.nodes()); // nodes() 재부착으로 위치 재측정
    syncConnectors();
    syncRotateZones();
    syncAllResizeAnchors();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync 함수들은 매 렌더 새로 생성되므로 deps에 넣지 않음
  }, [liveResize, sectionLiveResize, mediaLiveResize]);

  function registerNode(id: string, node: Konva.Group | null) {
    if (node) nodeMapRef.current.set(id, node);
    else nodeMapRef.current.delete(id);
  }

  // 더블클릭: 섹션 대신 아이템 자신을 선택, 메모는 편집 시작
  function handleItemDblClick(item: CanvasItem) {
    if (item.parentId || item.groupId) selectOnly(item.id);
    if (item.type !== 'memo') return;
    startEditing(item.id);
  }

  // 선택된 노드를 Transformer에 결합/분리
  useLayoutEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    if (isSelectTool(tool) && selectedIds.size >= 1) {
      // 섹션도 Transformer엔 붙이되 (회전 가능 영역이 Transformer의 박스 계산에 의존) 앵커/테두리만 숨김
      const nodes = Array.from(selectedIds)
        .map((id) => nodeMapRef.current.get(id))
        .filter((node): node is Konva.Group => !!node);
      transformer.nodes(nodes);
    } else {
      transformer.nodes([]);
    }
    syncConnectors();
    syncRotateZones();
    syncAllResizeAnchors();
    transformer.getLayer()?.batchDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncRotateZones/syncResizeAnchors는 매 렌더 새로 생성되는 함수라 deps에 넣으면 무의미해짐
  }, [tool, selectedIds, items]);

  // 미선택 섹션 소속 아이템을 드래그하면, 섹션+형제도 같은 델타만큼 명령형으로 함께 이동
  function forwardChildDragToSection(item: CanvasItem) {
    const isDrilledIn = selectedIds.size === 1 && selectedIds.has(item.id);
    if (!item.parentId || isDrilledIn) {
      childDragLastPosRef.current.delete(item.id);
      return;
    }
    const node = nodeMapRef.current.get(item.id);
    const sectionNode = nodeMapRef.current.get(item.parentId);
    const last = childDragLastPosRef.current.get(item.id);
    if (node && sectionNode && last) {
      const dx = node.x() - last.x;
      const dy = node.y() - last.y;
      sectionNode.x(sectionNode.x() + dx);
      sectionNode.y(sectionNode.y() + dy);
      items.forEach((sibling) => {
        if (sibling.parentId !== item.parentId || sibling.id === item.id) return;
        const siblingNode = nodeMapRef.current.get(sibling.id);
        if (siblingNode) {
          siblingNode.x(siblingNode.x() + dx);
          siblingNode.y(siblingNode.y() + dy);
        }
      });
    }
    if (node) childDragLastPosRef.current.set(item.id, { x: node.x(), y: node.y() });
  }

  // 드래그/변형 중 컨트롤 위치를 함께 갱신 (명령형 갱신이라 재렌더가 없어서 필요)
  function handleItemLiveChange(item: CanvasItem) {
    forwardChildDragToSection(item);
    syncConnectors();
    syncRotateZones();
    syncAllResizeAnchors();
  }

  const editingItem = editingItemId ? itemsById.get(editingItemId) : undefined;
  const colorPickerItem = openMemoId ? itemsById.get(openMemoId) : undefined;

  // 렌더 순서(z-order): 0=섹션(항상 맨 아래), 1=미선택, 2=선택 (items/selectedIds 바뀔 때만 재정렬)
  const orderedItems = useMemo(() => {
    function getRenderTier(item: CanvasItem): number {
      if (item.type === 'section') return 0;
      return selectedIds.has(item.id) ? 2 : 1;
    }
    return [...items].sort((a, b) => getRenderTier(a) - getRenderTier(b));
  }, [items, selectedIds]);

  // 개별 테두리
  function showIndividualBorder(item: CanvasItem) {
    return selectedIds.has(item.id) && selectedIds.size > 1;
  }

  function renderItem(item: CanvasItem) {
    return (
      <CanvasKonvaItem
        key={item.id}
        item={item}
        tool={tool}
        stageScale={scale}
        items={items}
        nodeMapRef={nodeMapRef}
        isSelected={selectedIds.size === 1 && selectedIds.has(item.id)}
        showIndividualBorder={showIndividualBorder(item)}
        isEditing={editingItemId === item.id}
        liveText={editingItemId === item.id ? draftText : undefined}
        liveResize={item.type === 'memo' ? (liveResize?.id === item.id ? liveResize : memoLiveOverrides.get(item.id)) : undefined}
        sectionLiveResize={sectionLiveResize ?? undefined}
        mediaLiveResize={mediaLiveResize ?? undefined}
        onSelect={handleItemMouseDown}
        onConnectorStart={handleConnectorMouseDown}
        onToggleColorPicker={handleToggleColorPicker}
        onCycleViewMode={handleCycleViewMode}
        onResizeStart={startResize}
        onSectionResizeStart={startSectionResize}
        onMediaResizeStart={startMediaResize}
        registerMenuNode={registerMenuNode}
        onGestureEnd={scheduleCommit}
        onLiveChange={handleItemLiveChange}
        onItemDblClick={handleItemDblClick}
        onTaintCanvas={markCanvasTainted}
        onMemoLiveOverride={setMemoLiveOverride}
        registerNode={registerNode}
        registerEditableNode={registerEditableNode}
      />
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative h-full w-full overflow-hidden bg-background"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length === 0) return;
        const pos = screenToLogical(e.clientX, e.clientY);
        onDropFiles(e.dataTransfer.files, pos.x, pos.y);
      }}
    >
      <div
        ref={gridRef}
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'linear-gradient(to right, #38393c 1px, transparent 1px), linear-gradient(to bottom, #38393c 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          backgroundPosition: '0px 0px',
        }}
      />
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={tool === 'hand'}
        onWheel={handleWheel}
        onMouseDown={(e) => {
          handleStageMouseDown(e);
          handlePlacementClick(tool, e);
        }}
        onDragMove={(e) => {
          if (e.target !== stageRef.current) return;
          setStagePos({ x: e.target.x(), y: e.target.y() });
        }}
      >
        <Layer>
          <Lines
            connectors={connectors}
            nodeMapRef={nodeMapRef}
            selectedConnectorId={selectedConnectorId}
            tool={tool}
            registerLine={registerLine}
            registerDot={registerDot}
            onConnectorClick={handleConnectorClick}
            previewLineRef={previewLineRef}
          />
          {orderedItems.map(renderItem)}
          <Handles
            connectors={connectors}
            selectedConnectorId={selectedConnectorId}
            nodeMapRef={nodeMapRef}
            scale={scale}
            onReconnectHandleDown={handleReconnectHandleDown}
          />
          <Overlay
            tool={tool}
            selectedIds={selectedIds}
            scale={scale}
            transformerRef={transformerRef}
            registerRotateZone={registerRotateZone}
            onRotateZonePointerDown={handleRotateZonePointerDown}
            disableCornerAnchors={isSingleMemoSelected || isSingleSectionSelected || isSingleMediaSelected}
            anchorSets={[memoAnchors, sectionAnchors, mediaAnchors].map((a) => ({
              cornerConfig: a.cornerConfig,
              registerResizeAnchor: a.registerResizeAnchor,
              onAnchorMouseDown: a.handleAnchorMouseDown,
              registerBorderNode: a.registerBorderNode,
            }))}
          />
        </Layer>
      </Stage>

      {editingItemId && overlayRect && (
        <MemoEdit
          editingItem={editingItem}
          editingItemId={editingItemId}
          overlayRect={overlayRect}
          onFinishEditing={handleFinishEditing}
          onChangeText={handleDraftChange}
        />
      )}

      {openMemoId && colorPickerRect && colorPickerItem?.type === 'memo' && (
        <MemoColorPicker
          rect={colorPickerRect}
          selected={colorPickerItem.color}
          onSelect={(color) => {
            onSetMemoColor(openMemoId, color);
            closeColorPicker();
          }}
          onClose={closeColorPicker}
        />
      )}

      {selectionBox && (
        <div
          className="pointer-events-none absolute border border-primary bg-primary/10"
          style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.w, height: selectionBox.h }}
        />
      )}
    </div>
  );
});

export default Canvas;

'use client';

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import type Konva from 'konva';
import { Layer, Stage } from 'react-konva';
import type { CanvasItem, CanvasProps } from '@/types/canvas';
import CanvasKonvaItem from '@/app/canvas/_components/items/CanvasItem';
import { computeMemoScalePatch } from '@/app/canvas/_components/tools/memo/memoLayout';
import ConnectorLines from '@/app/canvas/_components/tools/connector/ConnectorLines';
import ReconnectHandles from '@/app/canvas/_components/tools/connector/ReconnectHandles';
import SelectionOverlay from '@/app/canvas/_components/tools/mouse/SelectionOverlay';
import MemoEditOverlay from '@/app/canvas/_components/tools/memo/MemoEditOverlay';
import MemoColorPicker from '@/app/canvas/_components/tools/memo/MemoColorPicker';
import { useMemoEditing } from '@/app/canvas/_components/tools/memo/useMemoEditing';
import { useMemoColorPicker } from '@/app/canvas/_components/tools/memo/useMemoColorPicker';
import { useMemoResize } from '@/app/canvas/_components/tools/memo/useMemoResize';
import { useMemoResizeAnchors } from '@/app/canvas/_components/tools/memo/useMemoResizeAnchors';
import { useConnector } from '@/app/canvas/_components/tools/connector/useConnector';
import { useSelection } from '@/app/canvas/_components/tools/mouse/useSelection';
import { useRotateZones } from '@/app/canvas/_components/tools/mouse/useRotateZones';
import { useStagePanZoom } from '@/app/canvas/_components/useStagePanZoom';
import { isSelectTool } from '@/app/canvas/_components/toolbar';

export interface CanvasHandle {
  getThumbnail: () => string | undefined;
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
    onSetGroup,
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

  // 캔버스 전환 드롭다운의 썸네일 캡처용
  useImperativeHandle(ref, () => ({
    getThumbnail: () => stageRef.current?.toDataURL({ pixelRatio: 0.2 }),
  }));
  const clearConnectorSelectionRef = useRef<() => void>(() => {}); // useSelection이 useConnector보다 먼저 만들어져 직접 참조를 주고받을 수 없으므로 ref로 우회
  const commitScheduledRef = useRef(false);

  const { size, scale, stagePos, setStagePos, handleWheel, screenToLogical } = useStagePanZoom({ rootRef, gridRef, stageRef });

  const { selectedIds, selectionBox, handleStageMouseDown, handleItemMouseDown, clearSelection, selectOnly } = useSelection({
    tool,
    items,
    nodeMapRef,
    onBringToFront,
    onDeleteItems,
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

  const { editingItemId, overlayRect, draftText, registerEditableNode, startEditing, handlePlacementClick, handleFinishEditing, handleDraftChange } = useMemoEditing({
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

  // id로 아이템을 반복 조회할 때 items.find 대신 쓰는 캐시
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  // 메모 단독 선택 시 자체 컨트롤만 사용
  const singleSelectedId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : undefined;
  const singleSelectedItem = singleSelectedId !== undefined ? itemsById.get(singleSelectedId) : undefined;
  const selectedMemoItem = isSelectTool(tool) && singleSelectedItem?.type === 'memo' ? singleSelectedItem : undefined;
  const isSingleMemoSelected = !!selectedMemoItem;
  const { registerResizeAnchor, registerBorderNode, syncResizeAnchors, handleAnchorMouseDown, cornerConfig: memoCornerConfig } = useMemoResizeAnchors({
    memoItem: selectedMemoItem,
    isEditing: !!selectedMemoItem && editingItemId === selectedMemoItem.id,
    nodeMapRef,
    onResizeStart: startResize,
  });

  function handleToggleColorPicker(item: CanvasItem) {
    if (!isSelectTool(tool)) return;
    toggleColorPicker(item);
  }

  // 전체 보기/접힘
  function handleCycleViewMode(item: CanvasItem) {
    if (item.type !== 'memo') return;
    onSetMemoViewMode(item.id);
  }

  // 선택된 노드들의 드래그/회전/스케일 결과를 하나의 onUpdateItems 호출로 묶어 커밋
  function commitSelectedNodes() {
    const patches = Array.from(selectedIds)
      .map((id) => {
        const node = nodeMapRef.current.get(id);
        if (!node) return null;
        const x = node.x() - node.offsetX();
        const y = node.y() - node.offsetY();
        const rotate = node.rotation();
        const sx = node.scaleX();
        const sy = node.scaleY();

        // 메모는 item.scale로 통째로 안 늘리고 sx/sy를 width/height에 직접 곱함
        const item = itemsById.get(id);
        if (item?.type === 'memo') {
          const { width, height } = computeMemoScalePatch(item, sx, sy);
          return { id, x, y, rotate, scale: item.scale, width, height };
        }
        return { id, x, y, rotate, scale: sx };
      })
      .filter((patch): patch is Exclude<typeof patch, null> => !!patch);
    if (patches.length > 0) onUpdateItems(patches);
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

  const { registerRotateZone, syncRotateZones, handleRotateZonePointerDown } = useRotateZones({
    tool,
    selectedIds,
    transformerRef,
    nodeMapRef,
    scale,
    stagePos,
    screenToLogical,
    syncConnectors,
    syncResizeAnchors,
    onRotateEnd: commitSelectedNodes,
  });

  // 테두리/컨트롤 실시간 동기화
  useLayoutEffect(() => {
    if (!liveResize) return;
    const transformer = transformerRef.current;
    if (transformer) transformer.nodes(transformer.nodes()); // nodes() 재부착으로 위치 재측정
    syncConnectors();
    syncRotateZones();
    syncResizeAnchors();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync 함수들은 매 렌더 새로 생성되므로 deps에 넣지 않음
  }, [liveResize]);

  // 섹션 도구를 벗어나는 순간 selectedIds에 있던 것들을 그룹으로 확정
  const prevToolRef = useRef(tool);
  useEffect(() => {
    const prevTool = prevToolRef.current;
    prevToolRef.current = tool;
    if (prevTool === 'section' && tool !== 'section' && selectedIds.size > 0) {
      onSetGroup(Array.from(selectedIds));
    }
  }, [tool, selectedIds, onSetGroup]);

  function registerNode(id: string, node: Konva.Group | null) {
    if (node) nodeMapRef.current.set(id, node);
    else nodeMapRef.current.delete(id);
  }

  // 더블클릭 (편집 시작 + 그룹에서의 선택)
  function handleItemDblClick(item: CanvasItem) {
    const isIsolated = selectedIds.size === 1 && selectedIds.has(item.id);
    if (item.groupId && !isIsolated) {
      selectOnly(item.id);
      return;
    }
    if (item.type !== 'memo') return;
    startEditing(item.id);
  }

  // 선택된 노드를 Transformer에 결합/분리
  useLayoutEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    if (isSelectTool(tool) && selectedIds.size >= 1) {
      const nodes = Array.from(selectedIds)
        .map((id) => nodeMapRef.current.get(id))
        .filter((node): node is Konva.Group => !!node);
      transformer.nodes(nodes);
    } else {
      transformer.nodes([]);
    }
    syncConnectors();
    syncRotateZones();
    syncResizeAnchors();
    transformer.getLayer()?.batchDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncRotateZones/syncResizeAnchors는 매 렌더 새로 생성되는 함수라 deps에 넣으면 무의미해짐
  }, [tool, selectedIds, items]);

  // 드래그/변형 중 컨트롤 위치를 함께 갱신 (명령형 갱신이라 재렌더가 없어서 필요)
  function handleItemLiveChange() {
    syncConnectors();
    syncRotateZones();
    syncResizeAnchors();
  }

  const editingItem = editingItemId ? itemsById.get(editingItemId) : undefined;
  const colorPickerItem = openMemoId ? itemsById.get(openMemoId) : undefined;

  // 렌더 순서(z-order): 0=미선택, 1=선택 (items/selectedIds 바뀔 때만 재정렬)
  const orderedItems = useMemo(() => {
    function getRenderTier(item: CanvasItem): number {
      return selectedIds.has(item.id) ? 1 : 0;
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
        isSelected={selectedIds.size === 1 && selectedIds.has(item.id)}
        showIndividualBorder={showIndividualBorder(item)}
        isEditing={editingItemId === item.id}
        liveText={editingItemId === item.id ? draftText : undefined}
        liveResize={item.type === 'memo' && liveResize?.id === item.id ? liveResize : undefined}
        onSelect={handleItemMouseDown}
        onConnectorStart={handleConnectorMouseDown}
        onToggleColorPicker={handleToggleColorPicker}
        onCycleViewMode={handleCycleViewMode}
        onResizeStart={startResize}
        registerMenuNode={registerMenuNode}
        onGestureEnd={scheduleCommit}
        onLiveChange={handleItemLiveChange}
        onItemDblClick={handleItemDblClick}
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
          backgroundSize: '80px 80px',
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
          <ConnectorLines
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
          <ReconnectHandles
            connectors={connectors}
            selectedConnectorId={selectedConnectorId}
            nodeMapRef={nodeMapRef}
            scale={scale}
            onReconnectHandleDown={handleReconnectHandleDown}
          />
          <SelectionOverlay
            tool={tool}
            selectedIds={selectedIds}
            scale={scale}
            transformerRef={transformerRef}
            registerRotateZone={registerRotateZone}
            onRotateZonePointerDown={handleRotateZonePointerDown}
            disableCornerAnchors={isSingleMemoSelected}
            memoCornerConfig={memoCornerConfig}
            registerResizeAnchor={registerResizeAnchor}
            onResizeAnchorMouseDown={handleAnchorMouseDown}
            registerBorderNode={registerBorderNode}
          />
        </Layer>
      </Stage>

      {editingItemId && overlayRect && (
        <MemoEditOverlay
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

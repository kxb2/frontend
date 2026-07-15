'use client';

import { useEffect, useRef } from 'react';
import type Konva from 'konva';
import { Layer, Stage } from 'react-konva';
import type { CanvasItem, CanvasProps } from '@/types/canvas';
import CanvasKonvaItem from '@/app/canvas/_components/canvasItem';
import CanvasSwitcher from '@/app/canvas/_components/canvasSwitcher';
import ConnectorLines from '@/app/canvas/_components/tools/connector/ConnectorLines';
import ReconnectHandles from '@/app/canvas/_components/tools/connector/ReconnectHandles';
import SelectionOverlay from '@/app/canvas/_components/tools/mouse/SelectionOverlay';
import TextEditOverlay from '@/app/canvas/_components/tools/text/TextEditOverlay';
import { useTextEditing } from '@/app/canvas/_components/tools/text/useTextEditing';
import { useCommentPins } from '@/app/canvas/_components/tools/comment/useCommentPins';
import { useConnector } from '@/app/canvas/_components/tools/connector/useConnector';
import { useSelection } from '@/app/canvas/_components/tools/mouse/useSelection';
import { useRotateZones } from '@/app/canvas/_components/tools/mouse/useRotateZones';
import { useStagePanZoom } from '@/app/canvas/_components/useStagePanZoom';
import { isSelectTool } from '@/app/canvas/_components/toolbar';

export default function Canvas({
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
  onAddTextItem,
  onAddCommentItem,
  onSetGroup,
  onEditItemText,
  onToolChange,
}: CanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeMapRef = useRef(new Map<string, Konva.Group>());
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

  const { editingItemId, overlayRect, registerEditableNode, startEditing, handlePlacementClick, handleFinishEditing } = useTextEditing({
    items,
    scale,
    stagePos,
    stageRef,
    screenToLogical,
    onAddTextItem,
    onEditItemText,
    onToolChange,
    onFinishSelect: selectOnly,
  });

  const { resolveItemForRender, syncDependentComments, handleCommentTargetClick } = useCommentPins({
    tool,
    items,
    nodeMapRef,
    onAddCommentItem,
    onToolChange,
    startEditing,
  });

  // 선택된 노드들의 드래그/회전/스케일 결과를 하나의 onUpdateItems 호출로 묶어 커밋
  function commitSelectedNodes() {
    const patches = Array.from(selectedIds)
      .map((id) => {
        const item = items.find((i) => i.id === id);
        if (item?.type === 'comment') return null;
        const node = nodeMapRef.current.get(id);
        if (!node) return null;
        return { id, x: node.x() - node.offsetX(), y: node.y() - node.offsetY(), rotate: node.rotation(), scale: node.scaleX() };
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
    items,
    selectedIds,
    transformerRef,
    nodeMapRef,
    scale,
    stagePos,
    screenToLogical,
    syncConnectors,
    syncDependentComments,
    onRotateEnd: commitSelectedNodes,
  });

  // 섹션 도구를 벗어나는 순간 selectedIds에 있던 것들을 그룹으로 확정
  const prevToolRef = useRef(tool);
  useEffect(() => {
    const prevTool = prevToolRef.current;
    prevToolRef.current = tool;
    if (prevTool === 'section' && tool !== 'section' && selectedIds.size > 0) {
      onSetGroup(Array.from(selectedIds));
    }
  }, [tool, selectedIds, onSetGroup]);

  // 이미지/영상을 참조하는 댓글 동기화
  function registerNode(id: string, node: Konva.Group | null) {
    if (node) {
      nodeMapRef.current.set(id, node);
      syncDependentComments(id);
    } else {
      nodeMapRef.current.delete(id);
    }
  }

  // 더블클릭 (편집 시작 + 그룹에서의 선택)
  function handleItemDblClick(item: CanvasItem) {
    const isIsolated = selectedIds.size === 1 && selectedIds.has(item.id);
    if (item.groupId && !isIsolated) {
      selectOnly(item.id);
      return;
    }
    if (item.type !== 'text' && item.type !== 'comment') return;
    startEditing(item.id);
  }

  // 선택된 노드를 Transformer에 결합/분리, 선택된 노드의 댓글 위치 갱신을 동시에 수행
  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    if (isSelectTool(tool) && selectedIds.size >= 1) {
      const commentIds = new Set(items.filter((it) => it.type === 'comment').map((it) => it.id));
      const nodes = Array.from(selectedIds)
        .filter((id) => !commentIds.has(id))
        .map((id) => nodeMapRef.current.get(id))
        .filter((node): node is Konva.Group => !!node);
      transformer.nodes(nodes);
    } else {
      transformer.nodes([]);
    }
    syncRotateZones();
    transformer.getLayer()?.batchDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncRotateZones는 매 렌더 새로 생성되는 함수라 deps에 넣으면 무의미해짐
  }, [tool, selectedIds, items]);

  // 드래그/변형이 진행 중일 때마다 커넥터/회전 가능 영역/댓글의 위치를 함께 갱신
  function handleItemLiveChange(item: CanvasItem) {
    syncConnectors();
    syncRotateZones();
    syncDependentComments(item.id);
  }

  const editingItem = items.find((i) => i.id === editingItemId);

  // 렌더 순서(z-order) 계층: 0=미선택 요소, 1=미선택 요소의 댓글, 2=선택된 요소, 3=선택된 요소의 댓글
  function getRenderTier(item: CanvasItem): number {
    const isSelected = selectedIds.has(item.id);
    if (item.type === 'comment') return selectedIds.has(item.targetId) ? 3 : isSelected ? 2 : 1;
    return isSelected ? 2 : 0;
  }
  const orderedItems = [...items].sort((a, b) => getRenderTier(a) - getRenderTier(b));

  // 개별 테두리
  function showIndividualBorder(item: CanvasItem) {
    if (!selectedIds.has(item.id)) return false;
    return item.type === 'comment' || selectedIds.size > 1;
  }

  // 비동기 이미지/영상 로드 중 좌상단 폴백 위치가 찍히지 않도록 함
  function isReady(item: CanvasItem) {
    return item.type !== 'comment' || !!nodeMapRef.current.get(item.targetId);
  }

  function renderItem(item: CanvasItem) {
    return (
      <CanvasKonvaItem
        key={item.id}
        item={resolveItemForRender(item)}
        tool={tool}
        stageScale={scale}
        showIndividualBorder={showIndividualBorder(item)}
        isEditing={editingItemId === item.id}
        isReady={isReady(item)}
        onSelect={handleItemMouseDown}
        onConnectorStart={handleConnectorMouseDown}
        onCommentTarget={handleCommentTargetClick}
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
            onConnectorClick={handleConnectorClick}
            previewLineRef={previewLineRef}
          />
          {/* eslint-disable-next-line react-hooks/refs -- 의도적: isReady가 매 렌더 최신 등록 여부를 직접 읽음 */}
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
          />
        </Layer>
      </Stage>

      <CanvasSwitcher />

      {editingItemId && overlayRect && (
        <TextEditOverlay editingItem={editingItem} editingItemId={editingItemId} overlayRect={overlayRect} onFinishEditing={handleFinishEditing} />
      )}

      {selectionBox && (
        <div
          className="pointer-events-none absolute border border-primary bg-primary/10"
          style={{ left: selectionBox.x, top: selectionBox.y, width: selectionBox.w, height: selectionBox.h }}
        />
      )}
    </div>
  );
}

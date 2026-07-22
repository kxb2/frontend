import { useEffect, useRef, useState, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem, Connector } from '@/types/canvas';
import { trackWindowGesture } from '@/app/canvas/_components/canvasUtils';
import type { Tool } from '@/app/canvas/_components/toolbar';
import { getConnectorAnchors, getConnectorCurvePoints, getNodeAnchorTowardPoint, type ConnectorAnchor } from '@/app/canvas/_components/tools/connector/connectorCurve';

interface UseConnectorParams {
  tool: Tool;
  connectors: Connector[];
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  stageRef: RefObject<Konva.Stage | null>;
  screenToLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onAddConnector: (fromId: string, toId: string) => void;
  onDeleteConnector: (id: string) => void;
  onReconnectConnector: (id: string, end: 'from' | 'to', newNodeId: string) => void;
  clearItemSelection: () => void;
}

// 커넥터는 좌표 없이 {id,fromId,toId}만 저장하고 항상 두 노드의 현재 위치에서 다시 계산
export function useConnector({
  tool,
  connectors,
  nodeMapRef,
  stageRef,
  screenToLogical,
  onAddConnector,
  onDeleteConnector,
  onReconnectConnector,
  clearItemSelection,
}: UseConnectorParams) {
  const lineRefs = useRef(new Map<string, Konva.Line>());
  const dotRefs = useRef(new Map<string, { from: Konva.Circle | null; to: Konva.Circle | null }>());
  const previewLineRef = useRef<Konva.Line>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  function registerLine(id: string, line: Konva.Line | null) {
    if (line) lineRefs.current.set(id, line);
    else lineRefs.current.delete(id);
  }

  // 커넥터 양 끝
  function registerDot(id: string, end: 'from' | 'to', node: Konva.Circle | null) {
    const entry = dotRefs.current.get(id) ?? { from: null, to: null };
    entry[end] = node;
    if (entry.from || entry.to) dotRefs.current.set(id, entry);
    else dotRefs.current.delete(id);
  }

  // 커넥터를 그릴 때 마우스가 올라간 노드의 id를 찾음
  function findRegisteredAncestorId(node: Konva.Node | null): string | undefined {
    while (node && !(node.id() && nodeMapRef.current.has(node.id()))) {
      node = node.getParent();
    }
    return node?.id();
  }

  // 요소 이동 시 커넥터 위치를 동기화
  function syncConnectors() {
    let layer: Konva.Layer | null = null;
    for (const connector of connectors) {
      const line = lineRefs.current.get(connector.id);
      const fromNode = nodeMapRef.current.get(connector.fromId);
      const toNode = nodeMapRef.current.get(connector.toId);
      if (!line || !fromNode || !toNode) continue;
      const { from, to } = getConnectorAnchors(fromNode, toNode);
      line.points(getConnectorCurvePoints(from, to));
      const dots = dotRefs.current.get(connector.id);
      dots?.from?.position(from);
      dots?.to?.position(to);
      layer = line.getLayer();
    }
    layer?.batchDraw();
  }

  // 마우스 툴에서 커넥터 자체를 클릭하면 선택 가능
  function handleConnectorClick(e: Konva.KonvaEventObject<MouseEvent>, connectorId: string) {
    if (tool !== 'mouse') return;
    e.cancelBubble = true;
    clearItemSelection();
    setSelectedConnectorId(connectorId);
  }

  function clearConnectorSelection() {
    setSelectedConnectorId(null);
  }

  // Backspace/Delete로 선택된 커넥터 삭제(아이템 삭제와는 별개 경로)
  useEffect(() => {
    if (tool !== 'mouse' || !selectedConnectorId) return;
    function handleDeleteKey(e: KeyboardEvent) {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      onDeleteConnector(selectedConnectorId!);
      setSelectedConnectorId(null);
    }
    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [tool, selectedConnectorId, onDeleteConnector]);

  // 끝점 핸들을 드래그하면 그 끝만 커서를 따라가고, 드롭한 곳에 유효한 노드가 없으면 원래 위치로 되돌림
  function handleReconnectHandleDown(e: Konva.KonvaEventObject<MouseEvent>, connectorId: string, end: 'from' | 'to') {
    if (tool !== 'mouse') return;
    e.cancelBubble = true;
    const stage = stageRef.current;
    const connector = connectors.find((c) => c.id === connectorId);
    const line = lineRefs.current.get(connectorId);
    if (!stage || !connector || !line) return;

    const fixedId = end === 'from' ? connector.toId : connector.fromId;
    const fixedNode = nodeMapRef.current.get(fixedId);
    if (!fixedNode) return;

    trackWindowGesture(
      (moveEvent) => {
        const cur = screenToLogical(moveEvent.clientX, moveEvent.clientY);
        const fixed = getNodeAnchorTowardPoint(fixedNode, cur.x, cur.y);
        const free: ConnectorAnchor = { x: cur.x, y: cur.y, horizontalTangent: !fixed.horizontalTangent };
        const points = end === 'from' ? getConnectorCurvePoints(free, fixed) : getConnectorCurvePoints(fixed, free);
        line.points(points);
        line.getLayer()?.batchDraw();
      },
      (upEvent) => {
        const rect = stage.container().getBoundingClientRect();
        const target = stage.getIntersection({ x: upEvent.clientX - rect.left, y: upEvent.clientY - rect.top });
        const newId = findRegisteredAncestorId(target);
        if (newId && newId !== fixedId) onReconnectConnector(connectorId, end, newId);
        syncConnectors();
      },
    );
  }

  // 커넥터 미리보기 선
  function handleConnectorMouseDown(e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) {
    if (tool !== 'connector') return;
    e.cancelBubble = true;
    const stage = stageRef.current;
    const fromNode = nodeMapRef.current.get(item.id);
    const preview = previewLineRef.current;
    if (!stage || !fromNode || !preview) return;

    const initialCur = screenToLogical(e.evt.clientX, e.evt.clientY);
    const initialStart = getNodeAnchorTowardPoint(fromNode, initialCur.x, initialCur.y);
    preview.points(getConnectorCurvePoints(initialStart, { x: initialCur.x, y: initialCur.y, horizontalTangent: !initialStart.horizontalTangent }));
    preview.visible(true);
    preview.getLayer()?.batchDraw();

    trackWindowGesture(
      (moveEvent) => {
        const cur = screenToLogical(moveEvent.clientX, moveEvent.clientY);
        const start = getNodeAnchorTowardPoint(fromNode, cur.x, cur.y);
        preview.points(getConnectorCurvePoints(start, { x: cur.x, y: cur.y, horizontalTangent: !start.horizontalTangent }));
        preview.getLayer()?.batchDraw();
      },
      (upEvent) => {
        preview.visible(false);
        preview.getLayer()?.batchDraw();
        const rect = stage.container().getBoundingClientRect();
        const target = stage.getIntersection({ x: upEvent.clientX - rect.left, y: upEvent.clientY - rect.top });
        const toId = findRegisteredAncestorId(target);
        if (toId && toId !== item.id) onAddConnector(item.id, toId);
      },
    );
  }

  return {
    previewLineRef,
    selectedConnectorId,
    registerLine,
    registerDot,
    syncConnectors,
    handleConnectorMouseDown,
    handleConnectorClick,
    handleReconnectHandleDown,
    clearConnectorSelection,
  };
}

import { useEffect, useRef, useState, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem } from '@/types/canvas';
import { MEMO_CONTENT_FONT_SIZE } from '@/app/canvas/_components/tools/memo/memoLayout';
import type { Tool } from '@/app/canvas/_components/toolbar';

export interface OverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
  rotationDeg: number;
  fontSize: number;
}

interface UseMemoEditingParams {
  items: CanvasItem[];
  scale: number;
  stagePos: { x: number; y: number };
  stageRef: RefObject<Konva.Stage | null>;
  screenToLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onAddMemoItem: (x: number, y: number) => string;
  onEditItemText: (id: string, text: string) => void;
  onToolChange: (tool: Tool) => void;
  onFinishSelect: (id: string) => void;
}

// 메모 인라인 편집용 HTML textarea 및 빈 캔버스 메모 배치
export function useMemoEditing({ items, scale, stagePos, stageRef, screenToLogical, onAddMemoItem, onEditItemText, onToolChange, onFinishSelect }: UseMemoEditingParams) {
  const editableNodeMapRef = useRef(new Map<string, Konva.Node>());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null);
  const [draftText, setDraftText] = useState('');

  function registerEditableNode(id: string, node: Konva.Node | null) {
    if (node) editableNodeMapRef.current.set(id, node);
    else editableNodeMapRef.current.delete(id);
  }

  function startEditing(id: string) {
    const item = items.find((i) => i.id === id);
    setDraftText(item?.type === 'memo' ? item.text : '');
    setEditingItemId(id);
  }

  // 메모 도구로 빈 캔버스를 클릭하면 그 자리에 생성하고 편집 모드로 진입
  function handlePlacementClick(tool: Tool, e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool !== 'memo') return;
    const stage = stageRef.current;
    if (!stage || e.target !== stage) return;
    const pos = screenToLogical(e.evt.clientX, e.evt.clientY);
    const id = onAddMemoItem(pos.x, pos.y);
    startEditing(id);
    onToolChange('mouse');
  }

  // 편집을 마치면 커밋하고 그 아이템을 선택 상태로 지정
  function handleFinishEditing(id: string, text: string) {
    onEditItemText(id, text);
    setEditingItemId(null);
    onFinishSelect(id);
  }

  // textarea에 입력할 때마다 글자 수 카운터가 즉시 반영되도록 값을 갱신
  function handleDraftChange(text: string) {
    setDraftText(text);
  }

  // editingItemId가 가리키는 노드(메모 본문 영역)의 화면상 위치/크기/회전을 textarea CSS로 변환해 동기화
  useEffect(() => {
    if (!editingItemId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverlayRect(null);
      return;
    }
    const node = editableNodeMapRef.current.get(editingItemId);
    if (!node) {
      setOverlayRect(null);
      return;
    }
    const abs = node.getAbsolutePosition();
    const absScale = node.getAbsoluteScale();
    setOverlayRect({
      left: abs.x,
      top: abs.y,
      width: node.width() * absScale.x,
      height: node.height() * absScale.y,
      rotationDeg: node.getAbsoluteRotation(),
      fontSize: MEMO_CONTENT_FONT_SIZE * absScale.x,
    });
  }, [editingItemId, scale, stagePos, items, draftText]);

  return {
    editingItemId,
    overlayRect,
    draftText,
    registerEditableNode,
    startEditing,
    handlePlacementClick,
    handleFinishEditing,
    handleDraftChange,
  };
}

import { useEffect, useRef, useState, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem } from '@/types/canvas';
import { COMMENT_BUBBLE_BG, COMMENT_BUBBLE_FONT_SIZE, COMMENT_BUBBLE_PADDING, COMMENT_BUBBLE_RADIUS, TEXT_FONT_SIZE, TEXT_PADDING } from '@/app/canvas/_components/canvasItem';
import type { Tool } from '@/app/canvas/_components/toolbar';

export interface OverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
  rotationDeg: number;
  fontSize: number;
  padding: number;
  borderRadius: number;
  background: string;
  kind: 'text' | 'comment';
}

interface UseTextEditingParams {
  items: CanvasItem[];
  scale: number;
  stagePos: { x: number; y: number };
  stageRef: RefObject<Konva.Stage | null>;
  screenToLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onAddTextItem: (x: number, y: number) => string;
  onEditItemText: (id: string, text: string) => void;
  onToolChange: (tool: Tool) => void;
  onFinishSelect: (id: string) => void;
}

// 텍스트/댓글 인라인 편집용 HTML textarea 및 빈 캔버스 텍스트 배치
export function useTextEditing({ items, scale, stagePos, stageRef, screenToLogical, onAddTextItem, onEditItemText, onToolChange, onFinishSelect }: UseTextEditingParams) {
  const editableNodeMapRef = useRef(new Map<string, Konva.Node>());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null);

  function registerEditableNode(id: string, node: Konva.Node | null) {
    if (node) editableNodeMapRef.current.set(id, node);
    else editableNodeMapRef.current.delete(id);
  }

  function startEditing(id: string) {
    setEditingItemId(id);
  }

  // 텍스트 도구로 캔버스를 클릭하면 그 자리에 생성하고 편집 모드로 진입
  function handlePlacementClick(tool: Tool, e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool !== 'text') return;
    const stage = stageRef.current;
    if (!stage || e.target !== stage) return;
    const pos = screenToLogical(e.evt.clientX, e.evt.clientY);
    const id = onAddTextItem(pos.x, pos.y);
    startEditing(id);
    onToolChange('mouse');
  }

  // 편집을 마치면 커밋하고 그 아이템을 선택 상태로 지정
  function handleFinishEditing(id: string, text: string) {
    onEditItemText(id, text);
    setEditingItemId(null);
    onFinishSelect(id);
  }

  // editingItemId가 가리키는 노드의 화면상 위치/크기/회전을 textarea CSS로 변환해 동기화
  useEffect(() => {
    if (!editingItemId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOverlayRect(null);
      return;
    }
    const node = editableNodeMapRef.current.get(editingItemId);
    const editingItem = items.find((i) => i.id === editingItemId);
    if (!node || !editingItem) {
      setOverlayRect(null);
      return;
    }
    const abs = node.getAbsolutePosition();
    const absScale = node.getAbsoluteScale();
    const kind: 'text' | 'comment' = editingItem.type === 'comment' ? 'comment' : 'text';
    const baseFontSize = kind === 'comment' ? COMMENT_BUBBLE_FONT_SIZE : TEXT_FONT_SIZE;
    const basePadding = kind === 'comment' ? COMMENT_BUBBLE_PADDING : TEXT_PADDING;
    setOverlayRect({
      left: abs.x,
      top: abs.y,
      width: node.width() * absScale.x,
      height: node.height() * absScale.y,
      rotationDeg: node.getAbsoluteRotation(),
      fontSize: baseFontSize * absScale.x,
      padding: basePadding * absScale.x,
      borderRadius: kind === 'comment' ? COMMENT_BUBBLE_RADIUS * absScale.x : 0,
      background: kind === 'comment' ? COMMENT_BUBBLE_BG : 'transparent',
      kind,
    });
  }, [editingItemId, scale, stagePos, items]);

  return {
    editingItemId,
    overlayRect,
    registerEditableNode,
    startEditing,
    handlePlacementClick,
    handleFinishEditing,
  };
}

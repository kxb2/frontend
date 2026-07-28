import { useEffect, useRef, useState, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem, SelectionBox } from '@/types/canvas';
import {
  MEMO_BODY_GAP,
  MEMO_BODY_PAD_Y,
  MEMO_CONTENT_FONT_SIZE,
  MEMO_HEADER_HEIGHT,
  MEMO_MIN_WIDTH,
  MEMO_TITLE_FONT_SIZE,
  getMemoCounterHeight,
} from '@/app/canvas/_components/tools/memo/layout';
import { trackWindowGesture } from '@/app/canvas/_components/core/utils';
import type { Tool } from '@/app/canvas/_components/core/Toolbar';

export interface OverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
  rotationDeg: number;
  fontSize: number;
}

interface UseMemoEditParams {
  items: CanvasItem[];
  scale: number;
  stagePos: { x: number; y: number };
  stageRef: RefObject<Konva.Stage | null>;
  screenToLogical: (clientX: number, clientY: number) => { x: number; y: number };
  onAddMemoItem: (x: number, y: number, width?: number, height?: number) => string;
  onEditItemText: (id: string, text: string) => void;
  onEditItemTitle: (id: string, title: string) => void;
  onToolChange: (tool: Tool) => void;
  onFinishSelect: (id: string) => void;
}

// 드래그로 지정한 영역이 이보다 작으면 클릭으로 취급(기본 크기로 생성), 크면 그린 영역 그대로의 크기로 생성
const MIN_MEMO_DRAG_SIZE = 8;
// 드래그로 만든 메모가 너무 작아 못 쓰게 되지 않도록 하는 최소 세로 크기 (가로는 리사이즈와 동일하게 MEMO_MIN_WIDTH를 그대로 씀)
const MEMO_MIN_DRAG_CONTENT_HEIGHT = 90;
// 드래그 영역 보정
const MEMO_NON_CONTENT_HEIGHT = MEMO_HEADER_HEIGHT + MEMO_BODY_PAD_Y * 2 + MEMO_BODY_GAP + getMemoCounterHeight();

// 메모 인라인 편집용 HTML textarea 및 빈 캔버스 메모 배치
export function useMemoEdit({
  items,
  scale,
  stagePos,
  stageRef,
  screenToLogical,
  onAddMemoItem,
  onEditItemText,
  onEditItemTitle,
  onToolChange,
  onFinishSelect,
}: UseMemoEditParams) {
  const editableNodeMapRef = useRef(new Map<string, Konva.Node>());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [overlayRect, setOverlayRect] = useState<OverlayRect | null>(null);
  const [draftText, setDraftText] = useState('');
  const [dragBox, setDragBox] = useState<SelectionBox | null>(null);

  // 제목 인라인 편집 상태
  const titleNodeMapRef = useRef(new Map<string, Konva.Node>());
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleOverlayRect, setTitleOverlayRect] = useState<OverlayRect | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  function registerEditableNode(id: string, node: Konva.Node | null) {
    if (node) editableNodeMapRef.current.set(id, node);
    else editableNodeMapRef.current.delete(id);
  }

  function registerTitleNode(id: string, node: Konva.Node | null) {
    if (node) titleNodeMapRef.current.set(id, node);
    else titleNodeMapRef.current.delete(id);
  }

  function startEditing(id: string) {
    const item = items.find((i) => i.id === id);
    setDraftText(item?.type === 'memo' ? item.text : '');
    setEditingItemId(id);
  }

  // 제목을 더블클릭하면 현재 표시 중인 제목(직접 지정한 제목 또는 자동 번호 제목) 그대로를 채워서 편집 시작
  function startEditingTitle(id: string, currentDisplayTitle: string) {
    setDraftTitle(currentDisplayTitle);
    setEditingTitleId(id);
  }

  // 메모 도구로 빈 캔버스를 클릭하면 그 자리에 기본 크기로, 드래그하면 그린 영역 크기로 생성
  function handlePlacementMouseDown(tool: Tool, e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool !== 'memo') return;
    const stage = stageRef.current;
    if (!stage || e.target !== stage) return;
    const rect = stage.container().getBoundingClientRect();
    const startX = e.evt.clientX - rect.left;
    const startY = e.evt.clientY - rect.top;
    let lastBox = { x: startX, y: startY, w: 0, h: 0 };
    setDragBox(lastBox);

    trackWindowGesture(
      (moveEvent) => {
        const curX = moveEvent.clientX - rect.left;
        const curY = moveEvent.clientY - rect.top;
        lastBox = { x: Math.min(startX, curX), y: Math.min(startY, curY), w: Math.abs(curX - startX), h: Math.abs(curY - startY) };
        setDragBox(lastBox);
      },
      () => {
        setDragBox(null);
        let id: string;
        if (lastBox.w < MIN_MEMO_DRAG_SIZE && lastBox.h < MIN_MEMO_DRAG_SIZE) {
          const pos = screenToLogical(rect.left + startX, rect.top + startY);
          id = onAddMemoItem(pos.x, pos.y);
        } else {
          const topLeft = screenToLogical(rect.left + lastBox.x, rect.top + lastBox.y);
          const bottomRight = screenToLogical(rect.left + lastBox.x + lastBox.w, rect.top + lastBox.y + lastBox.h);
          const width = Math.max(MEMO_MIN_WIDTH, bottomRight.x - topLeft.x);
          const totalHeight = Math.max(MEMO_NON_CONTENT_HEIGHT + MEMO_MIN_DRAG_CONTENT_HEIGHT, bottomRight.y - topLeft.y);
          const contentHeight = totalHeight - MEMO_NON_CONTENT_HEIGHT;
          id = onAddMemoItem(topLeft.x, topLeft.y, width, contentHeight);
        }
        startEditing(id);
        onToolChange('mouse');
      },
    );
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

  // 제목 편집을 마치면 커밋 (빈 문자열은 자동 번호 제목으로 되돌림)
  function handleFinishEditingTitle(id: string, title: string) {
    onEditItemTitle(id, title);
    setEditingTitleId(null);
  }

  function handleTitleDraftChange(title: string) {
    setDraftTitle(title);
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

  // editingTitleId가 가리키는 노드(메모 제목 영역)의 화면상 위치/크기/회전을 input CSS로 변환해 동기화
  useEffect(() => {
    if (!editingTitleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitleOverlayRect(null);
      return;
    }
    const node = titleNodeMapRef.current.get(editingTitleId);
    if (!node) {
      setTitleOverlayRect(null);
      return;
    }
    const abs = node.getAbsolutePosition();
    const absScale = node.getAbsoluteScale();
    setTitleOverlayRect({
      left: abs.x,
      top: abs.y,
      width: node.width() * absScale.x,
      height: node.height() * absScale.y,
      rotationDeg: node.getAbsoluteRotation(),
      fontSize: MEMO_TITLE_FONT_SIZE * absScale.x,
    });
  }, [editingTitleId, scale, stagePos, items, draftTitle]);

  return {
    editingItemId,
    overlayRect,
    draftText,
    dragBox,
    registerEditableNode,
    startEditing,
    handlePlacementMouseDown,
    handleFinishEditing,
    handleDraftChange,
    editingTitleId,
    titleOverlayRect,
    draftTitle,
    registerTitleNode,
    startEditingTitle,
    handleFinishEditingTitle,
    handleTitleDraftChange,
  };
}

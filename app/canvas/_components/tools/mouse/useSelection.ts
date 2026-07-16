import { useEffect, useState, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem, SelectionBox } from '@/types/canvas';
import { trackWindowGesture } from '@/app/canvas/_components/canvasUtils';
import { isSelectTool, type Tool } from '@/app/canvas/_components/toolbar';

interface UseSelectionParams {
  tool: Tool;
  items: CanvasItem[];
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  onBringToFront: (ids: string[]) => void;
  onDeleteItems: (ids: string[]) => void;
  stageRef: RefObject<Konva.Stage | null>;
  clearConnectorSelectionRef: RefObject<() => void>;
}

// 선택, 다중 선택, 삭제 기능
export function useSelection({ tool, items, nodeMapRef, onBringToFront, onDeleteItems, stageRef, clearConnectorSelectionRef }: UseSelectionParams) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

  // 같은 그룹의 아이템은 그중 하나만 클릭에 걸려도 전부 함께 선택됨 (그룹이 아니면 자기 자신만 반환)
  function expandGroup(id: string): string[] {
    const item = items.find((it) => it.id === id);
    if (!item?.groupId) return [id];
    return items.filter((it) => it.groupId === item.groupId).map((it) => it.id);
  }

  function handleStageMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (!isSelectTool(tool)) return;
    const stage = stageRef.current;
    if (!stage || e.target !== stage) return; // 아이템 위 클릭은 handleItemMouseDown이 처리
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    clearConnectorSelectionRef.current();
    if (!e.evt.shiftKey) setSelectedIds(new Set());
    setSelectionBox({ x: pointer.x, y: pointer.y, w: 0, h: 0 });

    const stageScale = stage.scaleX();
    const stagePos = { x: stage.x(), y: stage.y() };
    const startX = pointer.x;
    const startY = pointer.y;
    const startItems = items;
    let lastIds: string[] = [];

    trackWindowGesture(
      (moveEvent) => {
        const rect = stage.container().getBoundingClientRect();
        const curX = moveEvent.clientX - rect.left;
        const curY = moveEvent.clientY - rect.top;
        const box = { x: Math.min(startX, curX), y: Math.min(startY, curY), w: Math.abs(curX - startX), h: Math.abs(curY - startY) };
        setSelectionBox(box);

        // 아이템의 렌더된 바운딩 박스와 클릭이 조금이라도 겹치면 선택
        const idsInBox = startItems
          .filter((item) => {
            const node = nodeMapRef.current.get(item.id);
            if (!node) return false;
            const localRect = node.getClientRect(); // 부모(Layer) 기준 로컬 좌표, 회전/스케일 반영된 축맞춤 박스
            const left = stagePos.x + localRect.x * stageScale;
            const top = stagePos.y + localRect.y * stageScale;
            const right = stagePos.x + (localRect.x + localRect.width) * stageScale;
            const bottom = stagePos.y + (localRect.y + localRect.height) * stageScale;
            return left <= box.x + box.w && right >= box.x && top <= box.y + box.h && bottom >= box.y;
          })
          .map((item) => item.id);
        // 그룹의 일부만 클릭에 걸려도 그룹 전체를 선택
        const expandedIds = new Set(idsInBox);
        idsInBox.forEach((id) => expandGroup(id).forEach((groupedId) => expandedIds.add(groupedId)));
        setSelectedIds(expandedIds);
        lastIds = Array.from(expandedIds);
      },
      () => {
        setSelectionBox(null);
        onBringToFront(lastIds);
      },
    );
  }

  function handleItemMouseDown(e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) {
    if (!isSelectTool(tool)) return;
    e.cancelBubble = true;
    clearConnectorSelectionRef.current();

    // 아이템이 그룹에 속해 있으면 그룹 전체를 하나처럼 취급
    const groupIds = expandGroup(item.id);

    if (e.evt.shiftKey) {
      const next = new Set(selectedIds);
      const allSelected = groupIds.every((id) => next.has(id));
      groupIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      const ids = Array.from(next);
      onBringToFront(ids);
      setSelectedIds(next);
      return;
    }

    const ids = groupIds.some((id) => selectedIds.has(id)) ? Array.from(selectedIds) : groupIds;
    onBringToFront(ids);
    setSelectedIds(new Set(ids));
  }

  useEffect(() => {
    if (!isSelectTool(tool)) return;
    function handleDeleteKey(e: KeyboardEvent) {
      if (selectedIds.size === 0) return;
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      onDeleteItems(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [tool, selectedIds, onDeleteItems]);

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // 텍스트/댓글 도구로 아이템을 배치한 직후 편집을 마치면 그 아이템을 바로 선택 상태로 지정
  function selectOnly(id: string) {
    setSelectedIds(new Set([id]));
  }

  return { selectedIds, selectionBox, handleStageMouseDown, handleItemMouseDown, clearSelection, selectOnly };
}

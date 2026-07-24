import { useEffect, useState, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem, SelectionBox } from '@/types/canvas';
import { trackWindowGesture } from '@/app/canvas/_components/core/utils';
import { isSelectTool, type Tool } from '@/app/canvas/_components/core/Toolbar';

// 주어진 id 집합에 선택된 섹션의 소속(parentId) 아이템 id들을 함께 포함시킴 (섹션은 그룹처럼 회전/스케일/이동에 자식을 동반함)
export function expandSectionChildrenIds(items: CanvasItem[], ids: Iterable<string>) {
  const expanded = new Set(ids);
  Array.from(expanded).forEach((id) => {
    const isSection = items.find((item) => item.id === id)?.type === 'section';
    if (!isSection) return;
    items.forEach((child) => {
      if (child.parentId === id) expanded.add(child.id);
    });
  });
  return expanded;
}

interface UseSelectParams {
  tool: Tool;
  items: CanvasItem[];
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  onBringToFront: (ids: string[]) => void;
  onDeleteItems: (ids: string[]) => void;
  onCreateSection: (box: SelectionBox, memberIds: string[]) => string;
  onGroupItems: (ids: string[]) => void;
  onUngroupItems: (ids: string[]) => void;
  stageRef: RefObject<Konva.Stage | null>;
  clearConnectorSelectionRef: RefObject<() => void>;
}

// 섹션으로 취급하기엔 너무 작은(사실상 클릭에 가까운) 드래그는 무시
const MIN_SECTION_SIZE = 8;

// 섹션 소속(parentId)은 섹션으로, Ctrl+G 그룹(groupId)은 같은 groupId를 가진 전원으로 확장
function expandMembership(ids: string[], items: CanvasItem[]): string[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const expanded = new Set(ids.map((id) => itemsById.get(id)?.parentId ?? id));
  const groupIds = new Set(Array.from(expanded).map((id) => itemsById.get(id)?.groupId).filter((g): g is string => !!g));
  if (groupIds.size > 0) items.forEach((item) => item.groupId && groupIds.has(item.groupId) && expanded.add(item.id));
  return Array.from(expanded);
}

// 선택, 다중 선택, 삭제, 섹션 도구로 박스 그리기, Ctrl+G 그룹화/해제
export function useSelect({ tool, items, nodeMapRef, onBringToFront, onDeleteItems, onCreateSection, onGroupItems, onUngroupItems, stageRef, clearConnectorSelectionRef }: UseSelectParams) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);

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
    let lastBox = { x: startX, y: startY, w: 0, h: 0 };

    trackWindowGesture(
      (moveEvent) => {
        const rect = stage.container().getBoundingClientRect();
        const curX = moveEvent.clientX - rect.left;
        const curY = moveEvent.clientY - rect.top;
        const box = { x: Math.min(startX, curX), y: Math.min(startY, curY), w: Math.abs(curX - startX), h: Math.abs(curY - startY) };
        lastBox = box;
        setSelectionBox(box);

        // 아이템의 렌더된 바운딩 박스와 클릭이 조금이라도 겹치면 선택 (섹션 소속 아이템은 섹션 자체를, 그룹 소속 아이템은 그룹 전체를 선택)
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
        lastIds = expandMembership(idsInBox, startItems);
        if (tool !== 'section') setSelectedIds(new Set(lastIds));
      },
      () => {
        setSelectionBox(null);
        if (tool === 'section') {
          if (lastBox.w < MIN_SECTION_SIZE && lastBox.h < MIN_SECTION_SIZE) return;
          const logicalBox = {
            x: (lastBox.x - stagePos.x) / stageScale,
            y: (lastBox.y - stagePos.y) / stageScale,
            w: lastBox.w / stageScale,
            h: lastBox.h / stageScale,
          };
          onCreateSection(logicalBox, lastIds);
        } else {
          onBringToFront(lastIds);
        }
      },
    );
  }

  function handleItemMouseDown(e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) {
    if (!isSelectTool(tool)) return;
    e.cancelBubble = true;
    clearConnectorSelectionRef.current();
    // 섹션 소속 아이템은 섹션 전체를 우선 선택, 더블클릭으로 이미 자신만 선택된 상태면 그대로 유지
    const isDrilledIn = selectedIds.size === 1 && selectedIds.has(item.id);
    const targetIds = isDrilledIn ? [item.id] : expandMembership([item.id], items);

    if (e.evt.shiftKey) {
      const next = new Set(selectedIds);
      const allSelected = targetIds.every((id) => next.has(id));
      targetIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      const ids = Array.from(next);
      onBringToFront(ids);
      setSelectedIds(next);
      return;
    }

    // 클릭 대상이 이미 현재 선택에 포함돼 있으면(다중선택 중 하나를 다시 눌러 드래그 시작하는 경우) 선택을 그대로 유지
    const ids = targetIds.some((id) => selectedIds.has(id)) ? Array.from(selectedIds) : targetIds;
    onBringToFront(ids);
    setSelectedIds(new Set(ids));
  }

  useEffect(() => {
    if (!isSelectTool(tool)) return;
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if ((e.key === 'Backspace' || e.key === 'Delete') && selectedIds.size > 0) {
        onDeleteItems(Array.from(selectedIds));
        setSelectedIds(new Set());
        return;
      }

      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'g') return;
      e.preventDefault();

      if (e.shiftKey) {
        // 그룹 해제: 선택된 아이템들이 모두 같은 groupId를 공유할 때만 동작, groupId만 해제(아이템은 그대로 유지/선택)
        const selectedItems = items.filter((it) => selectedIds.has(it.id));
        const groupIds = new Set(selectedItems.map((it) => it.groupId).filter((g): g is string => !!g));
        if (groupIds.size !== 1) return;
        onUngroupItems(Array.from(selectedIds));
        return;
      }

      // 그룹화: 2개 이상 선택된 아이템에 공통 groupId 부여 (섹션 생성이 아니라 다중선택이 계속 함께 동작하도록 태그만 남김)
      if (selectedIds.size < 2) return;
      onGroupItems(Array.from(selectedIds));
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tool, selectedIds, items, onDeleteItems, onGroupItems, onUngroupItems]);

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // 텍스트/댓글 도구로 아이템을 배치한 직후 편집을 마치면 그 아이템을 바로 선택 상태로 지정
  function selectOnly(id: string) {
    setSelectedIds(new Set([id]));
  }

  return { selectedIds, selectionBox, handleStageMouseDown, handleItemMouseDown, clearSelection, selectOnly };
}

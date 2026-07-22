import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import type { CanvasItem } from '@/types/canvas';

export interface ColorPickerRect {
  left: number;
  top: number;
}

// 메모 컬러 팔레트 팝업의 열림 상태 + 화면상 위치 관리
export function useMemoColorPicker({ items, scale, stagePos }: { items: CanvasItem[]; scale: number; stagePos: { x: number; y: number } }) {
  const menuNodeMapRef = useRef(new Map<string, Konva.Group>());
  const [openMemoId, setOpenMemoId] = useState<string | null>(null);
  const [rect, setRect] = useState<ColorPickerRect | null>(null);

  function registerMenuNode(id: string, node: Konva.Group | null) {
    if (node) menuNodeMapRef.current.set(id, node);
    else menuNodeMapRef.current.delete(id);
  }

  function toggleColorPicker(item: CanvasItem) {
    setOpenMemoId((prev) => (prev === item.id ? null : item.id));
  }

  function closeColorPicker() {
    setOpenMemoId(null);
  }

  // 열려 있는 팝업 대상 메뉴 버튼의 화면상 위치 동기화
  useEffect(() => {
    if (!openMemoId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRect(null);
      return;
    }
    const node = menuNodeMapRef.current.get(openMemoId);
    if (!node) {
      setRect(null);
      return;
    }
    const abs = node.getAbsolutePosition();
    const absScale = node.getAbsoluteScale();
    setRect({ left: abs.x + (node.width() * absScale.x) / 2, top: abs.y + node.height() * absScale.y });
  }, [openMemoId, items, scale, stagePos]);

  return { openMemoId, rect, registerMenuNode, toggleColorPicker, closeColorPicker };
}

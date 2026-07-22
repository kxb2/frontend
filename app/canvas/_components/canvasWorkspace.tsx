'use client';

import { useEffect, useRef, useState } from 'react';
import Canvas, { type CanvasHandle } from '@/app/canvas/_components/canvas';
import { useHistoryState } from '@/app/canvas/_components/useHistoryState';
import Toolbar, { Tool } from '@/app/canvas/_components/toolbar';
import { computeMemoTotalHeight } from '@/app/canvas/_components/tools/memo/memoLayout';
import { rotateAround } from '@/app/canvas/_components/canvasUtils';
import type { CanvasDocument, CanvasItem, MemoColor, MemoViewMode } from '@/types/canvas';

let nextId = 0;
function genId() {
  return `${Date.now()}-${nextId++}`;
}

interface CanvasWorkspaceProps {
  initialDoc: CanvasDocument;
  onDocChange: (doc: CanvasDocument) => void;
  onThumbnailChange: (thumbnail: string) => void;
}

// 캔버스 하나의 실제 편집 상태를 담당 (캔버스 전환 시 key로 새로 마운트됨)
export default function CanvasWorkspace({ initialDoc, onDocChange, onThumbnailChange }: CanvasWorkspaceProps) {
  const {
    state: doc,
    set: setDoc,
    commit: commitDoc,
    undo,
    redo,
  } = useHistoryState<CanvasDocument>(initialDoc);
  const { items, connectors } = doc;
  const [tool, setTool] = useState<Tool>('mouse');
  const canvasRef = useRef<CanvasHandle>(null);

  function addFiles(files: FileList | File[], position?: { x: number; y: number }) {
    const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));

    commitDoc((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        ...fileArray.map((file, index) => ({
          id: genId(),
          type: file.type.startsWith('video/') ? ('video' as const) : ('image' as const),
          src: URL.createObjectURL(file),
          x: position ? position.x : 200 + index * 24,
          y: position ? position.y : 200 + index * 24,
          rotate: 0,
          scale: 1,
        })),
      ],
    }));
  }

  // 값 변화가 없으면 커밋하지 않음
  const EPSILON = 0.01;
  function updateItems(patches: Array<Pick<CanvasItem, 'id' | 'x' | 'y' | 'rotate' | 'scale'> & { width?: number; height?: number }>) {
    const patchMap = new Map(patches.map((p) => [p.id, p]));
    const hasRealChange = items.some((item) => {
      const patch = patchMap.get(item.id);
      if (!patch) return false;
      return (
        Math.abs(patch.x - item.x) > EPSILON ||
        Math.abs(patch.y - item.y) > EPSILON ||
        Math.abs(patch.rotate - item.rotate) > EPSILON ||
        Math.abs(patch.scale - item.scale) > EPSILON ||
        (patch.width !== undefined && Math.abs(patch.width - (item.type === 'memo' ? (item.width ?? 0) : 0)) > EPSILON) ||
        (patch.height !== undefined && Math.abs(patch.height - (item.type === 'memo' ? (item.height ?? 0) : 0)) > EPSILON)
      );
    });
    if (!hasRealChange) return;

    commitDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) => (patchMap.has(item.id) ? { ...item, ...patchMap.get(item.id)! } : item)),
    }));
  }

  // 선택된 요소의 z-index를 최상위로 올림
  function bringToFront(ids: string[]) {
    if (ids.length === 0) return;
    setDoc((prev) => {
      const idSet = new Set(ids);
      const rest = prev.items.filter((item) => !idSet.has(item.id));
      const selected = prev.items.filter((item) => idSet.has(item.id));
      return { ...prev, items: [...rest, ...selected] };
    });
  }

  // 선택 요소 삭제
  function deleteItems(ids: string[]) {
    if (ids.length === 0) return;
    commitDoc((prev) => {
      const idSet = new Set(ids);
      return {
        items: prev.items.filter((item) => !idSet.has(item.id)),
        connectors: prev.connectors.filter((c) => !idSet.has(c.fromId) && !idSet.has(c.toId)),
      };
    });
  }

  function addMemoItem(x: number, y: number) {
    const id = genId();
    const seq = items.filter((item) => item.type === 'memo').length + 1;
    commitDoc((prev) => ({
      ...prev,
      items: [...prev.items, { id, type: 'memo' as const, text: '', color: 'default' as const, seq, viewMode: 'full' as const, x, y, rotate: 0, scale: 1 }],
    }));
    return id;
  }

  function editItemText(id: string, text: string) {
    commitDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id && item.type === 'memo' ? { ...item, text } : item)),
    }));
  }

  function setMemoColor(id: string, color: MemoColor) {
    commitDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id && item.type === 'memo' ? { ...item, color } : item)),
    }));
  }

  // 전체 보기/접힘
  function cycleMemoViewMode(id: string) {
    commitDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id || item.type !== 'memo') return item;
        const nextViewMode: MemoViewMode = item.viewMode === 'full' ? 'collapsed' : 'full';
        // 회전된 메모는 item.x/y를 보정해 화면 위치를 고정
        const dh = computeMemoTotalHeight(item, item.viewMode) - computeMemoTotalHeight(item, nextViewMode);
        const v = { x: 0, y: dh / 2 };
        const rotatedV = rotateAround(v.x, v.y, 0, 0, item.rotate);
        return { ...item, viewMode: nextViewMode, x: item.x + (v.x - rotatedV.x), y: item.y + (v.y - rotatedV.y) };
      }),
    }));
  }

  // 2개 이상이면 새 그룹으로 묶고(이전 그룹은 덮어씀), 1개면 그 아이템만 그룹에서 제외 (멤버가 1명 이하로 줄어든 그룹은 자동 해체)
  function setGroup(ids: string[]) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    commitDoc((prev) => {
      const oldGroupIds = new Set(prev.items.filter((item) => idSet.has(item.id) && item.groupId).map((item) => item.groupId!));
      const newGroupId = ids.length >= 2 ? genId() : undefined;
      let nextItems = prev.items.map((item) => (idSet.has(item.id) ? { ...item, groupId: newGroupId } : item));
      oldGroupIds.forEach((oldGroupId) => {
        const remaining = nextItems.filter((item) => item.groupId === oldGroupId);
        if (remaining.length < 2) {
          nextItems = nextItems.map((item) => (item.groupId === oldGroupId ? { ...item, groupId: undefined } : item));
        }
      });
      return { ...prev, items: nextItems };
    });
  }

  function addConnector(fromId: string, toId: string) {
    if (fromId === toId) return;
    if (connectors.some((c) => c.fromId === fromId && c.toId === toId)) return;
    commitDoc((prev) => ({
      ...prev,
      connectors: [...prev.connectors, { id: genId(), fromId, toId }],
    }));
  }

  function deleteConnector(id: string) {
    commitDoc((prev) => ({
      ...prev,
      connectors: prev.connectors.filter((c) => c.id !== id),
    }));
  }

  function reconnectConnector(id: string, end: 'from' | 'to', newNodeId: string) {
    const current = connectors.find((c) => c.id === id);
    if (!current) return;
    const next = end === 'from' ? { ...current, fromId: newNodeId } : { ...current, toId: newNodeId };
    if (next.fromId === next.toId) return;
    if (connectors.some((c) => c.id !== id && c.fromId === next.fromId && c.toId === next.toId)) return;
    commitDoc((prev) => ({
      ...prev,
      connectors: prev.connectors.map((c) => (c.id === id ? next : c)),
    }));
  }

  // 실행취소/재실행 단축키 (Mac: ⌘+Z / ⌘+Shift+Z, Windows: Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // 문서가 바뀔 때마다 캔버스 목록(상위)에 반영 + 썸네일 갱신 (API 연동 전까지는 클라이언트에서만 캡처)
  useEffect(() => {
    onDocChange(doc);
    const raf = requestAnimationFrame(() => {
      const thumbnail = canvasRef.current?.getThumbnail();
      if (thumbnail) onThumbnailChange(thumbnail);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDocChange/onThumbnailChange는 상위 렌더마다 새로 생성되므로 deps에 넣지 않음
  }, [doc]);

  return (
    <>
      <Canvas
        ref={canvasRef}
        tool={tool}
        items={items}
        connectors={connectors}
        onDropFiles={(files, x, y) => addFiles(files, { x, y })}
        onUpdateItems={updateItems}
        onBringToFront={bringToFront}
        onDeleteItems={deleteItems}
        onAddConnector={addConnector}
        onDeleteConnector={deleteConnector}
        onReconnectConnector={reconnectConnector}
        onAddMemoItem={addMemoItem}
        onSetGroup={setGroup}
        onEditItemText={editItemText}
        onSetMemoColor={setMemoColor}
        onSetMemoViewMode={cycleMemoViewMode}
        onToolChange={setTool}
      />
      <Toolbar tool={tool} onToolChange={setTool} onFiles={(files) => addFiles(files)} />
    </>
  );
}

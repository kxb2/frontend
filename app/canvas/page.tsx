'use client';

import { useEffect, useState } from 'react';
import Canvas from '@/app/canvas/_components/canvas';
import { useHistoryState } from '@/app/canvas/_components/useHistoryState';
import Toolbar, { Tool } from '@/app/canvas/_components/toolbar';
import type { CanvasItem, Connector } from '@/types/canvas';

let nextId = 0;

interface CanvasDocument {
  items: CanvasItem[];
  connectors: Connector[];
}

export default function CanvasPage() {
  const {
    state: doc,
    set: setDoc,
    commit: commitDoc,
    undo,
    redo,
  } = useHistoryState<CanvasDocument>({ items: [], connectors: [] });
  const { items, connectors } = doc;
  const [tool, setTool] = useState<Tool>('mouse');

  function addFiles(files: FileList | File[], position?: { x: number; y: number }) {
    const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));

    commitDoc((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        ...fileArray.map((file, index) => ({
          id: `${Date.now()}-${nextId++}`,
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
  function updateItems(patches: Array<Pick<CanvasItem, 'id' | 'x' | 'y' | 'rotate' | 'scale'>>) {
    const patchMap = new Map(patches.map((p) => [p.id, p]));
    const hasRealChange = items.some((item) => {
      const patch = patchMap.get(item.id);
      if (!patch) return false;
      return (
        Math.abs(patch.x - item.x) > EPSILON ||
        Math.abs(patch.y - item.y) > EPSILON ||
        Math.abs(patch.rotate - item.rotate) > EPSILON ||
        Math.abs(patch.scale - item.scale) > EPSILON
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
      prev.items.forEach((item) => {
        if (item.type === 'comment' && idSet.has(item.targetId)) idSet.add(item.id);
      });
      return {
        items: prev.items.filter((item) => !idSet.has(item.id)),
        connectors: prev.connectors.filter((c) => !idSet.has(c.fromId) && !idSet.has(c.toId)),
      };
    });
  }

  function addTextItem(x: number, y: number) {
    const id = `${Date.now()}-${nextId++}`;
    commitDoc((prev) => ({
      ...prev,
      items: [...prev.items, { id, type: 'text' as const, text: '', x, y, rotate: 0, scale: 1 }],
    }));
    return id;
  }

  function addCommentItem(targetId: string) {
    const id = `${Date.now()}-${nextId++}`;
    commitDoc((prev) => ({
      ...prev,
      items: [...prev.items, { id, type: 'comment' as const, text: '', x: 0, y: 0, rotate: 0, scale: 1, targetId }],
    }));
    return id;
  }

  // 편집을 마쳤을 때 빈 텍스트면 캔버스에 빈 상자가 남지 않도록 아이템 자체를 삭제
  function editItemText(id: string, text: string) {
    if (text.trim() === '') {
      deleteItems([id]);
      return;
    }
    commitDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id && (item.type === 'text' || item.type === 'comment') ? { ...item, text } : item)),
    }));
  }

  // 2개 이상이면 새 그룹으로 묶고(이전 그룹은 덮어씀), 1개면 그 아이템만 그룹에서 제외 (멤버가 1명 이하로 줄어든 그룹은 자동 해체)
  function setGroup(ids: string[]) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    commitDoc((prev) => {
      const oldGroupIds = new Set(prev.items.filter((item) => idSet.has(item.id) && item.groupId).map((item) => item.groupId!));
      const newGroupId = ids.length >= 2 ? `${Date.now()}-${nextId++}` : undefined;
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
      connectors: [...prev.connectors, { id: `${Date.now()}-${nextId++}`, fromId, toId }],
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

  return (
    <main className="flex-1 min-h-0">
      <Canvas
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
        onAddTextItem={addTextItem}
        onAddCommentItem={addCommentItem}
        onSetGroup={setGroup}
        onEditItemText={editItemText}
        onToolChange={setTool}
      />
      <Toolbar tool={tool} onToolChange={setTool} onFiles={(files) => addFiles(files)} />
    </main>
  );
}

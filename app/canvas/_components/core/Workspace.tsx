'use client';

import { useEffect, useRef, useState } from 'react';
import Canvas, { type CanvasHandle } from '@/app/canvas/_components/core/Canvas';
import { useHistory } from '@/app/canvas/_components/core/useHistory';
import Toolbar, { Tool } from '@/app/canvas/_components/core/Toolbar';
import { computeMemoTotalHeight } from '@/app/canvas/_components/tools/memo/layout';
import { rotateAround } from '@/app/canvas/_components/core/utils';
import { saveCanvas, uploadCanvasAttachment } from '@/app/api/canvas/api';
import { toSaveRequest } from '@/app/api/canvas/adapter';
import type { CanvasDocument, CanvasItem, MemoColor, MemoViewMode, SelectionBox } from '@/types/canvas';

let nextId = 0;
function genId() {
  return `${Date.now()}-${nextId++}`;
}

const SAVE_DEBOUNCE_MS = 1000;

export type SaveState = 'saving' | 'saved' | 'error';

interface WorkspaceProps {
  canvasId: number; // 백엔드 캔버스 id (저장/첨부 업로드에 사용)
  initialDoc: CanvasDocument;
  onSaveStateChange: (state: SaveState) => void;
  onThumbnailChange: (thumbnail: string) => void;
}

// 캔버스 하나의 실제 편집 상태를 담당 (캔버스 전환 시 key로 새로 마운트됨)
export default function Workspace({ canvasId, initialDoc, onSaveStateChange, onThumbnailChange }: WorkspaceProps) {
  const {
    state: doc,
    set: setDoc,
    commit: commitDoc,
    undo,
    redo,
  } = useHistory<CanvasDocument>(initialDoc);
  const { items, connectors } = doc;
  const [tool, setTool] = useState<Tool>('mouse');
  const canvasRef = useRef<CanvasHandle>(null);

  // 순간적인 네트워크 실패(터널/백엔드 불안정)에만 1회 재시도 (파일 형식 거부 같은 확정적 실패는 재시도해도 똑같이 실패하므로 제외)
  async function uploadWithRetry(file: File, retriesLeft = 1): Promise<Awaited<ReturnType<typeof uploadCanvasAttachment>>> {
    try {
      return await uploadCanvasAttachment(canvasId, file);
    } catch (error) {
      if (retriesLeft <= 0 || !(error instanceof TypeError)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return uploadWithRetry(file, retriesLeft - 1);
    }
  }

  // 여러 파일을 한 번에 불러올 때 겹치지 않도록 그리드로 배치 (기본 미디어 크기 상한 240 기준 간격)
  const DROP_GRID_COLS = 3;
  const DROP_GRID_CELL = 260;
  function addFiles(files: FileList | File[], position?: { x: number; y: number }) {
    const fileArray = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    const baseX = position ? position.x : 200;
    const baseY = position ? position.y : 200;
    const newItems = fileArray.map((file, index) => ({
      id: genId(),
      type: file.type.startsWith('video/') ? ('video' as const) : ('image' as const),
      src: URL.createObjectURL(file), // 업로드 완료 전까지의 낙관적 미리보기
      x: baseX + (index % DROP_GRID_COLS) * DROP_GRID_CELL,
      y: baseY + Math.floor(index / DROP_GRID_COLS) * DROP_GRID_CELL,
      rotate: 0,
    }));

    commitDoc((prev) => ({ ...prev, items: [...prev.items, ...newItems] }));

    // 백그라운드에서 실제 파일을 순차 업로드, 끝나면 src를 실제 주소로 교체
    newItems.reduce(
      (chain, newItem, index) =>
        chain.then(() =>
          uploadWithRetry(fileArray[index])
            .then((result) => {
              setDoc((prev) => ({
                ...prev,
                items: prev.items.map((item) => (item.id === newItem.id ? { ...item, src: result.contentUrl } : item)),
              }));
            })
            .catch((error) => {
              // blob: 미리보기가 남으면 저장 보류 상태가 영구히 걸려 다른 아이템까지 저장이 막히므로, 실패한 아이템은 제거하고 알림
              console.error('첨부 파일 업로드 실패:', error);
              URL.revokeObjectURL(newItem.src);
              setDoc((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== newItem.id) }));
              alert(`파일 업로드에 실패해 캔버스에서 제외했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            }),
        ),
      Promise.resolve(),
    );
  }

  // 값 변화가 없으면 커밋하지 않음
  const EPSILON = 0.01;
  function updateItems(patches: Array<Pick<CanvasItem, 'id' | 'x' | 'y' | 'rotate'> & Partial<{ width: number; height: number; parentId: string | undefined }>>) {
    const patchMap = new Map(patches.map((p) => [p.id, p]));
    const hasRealChange = items.some((item) => {
      const patch = patchMap.get(item.id);
      if (!patch) return false;
      return (
        Math.abs(patch.x - item.x) > EPSILON ||
        Math.abs(patch.y - item.y) > EPSILON ||
        Math.abs(patch.rotate - item.rotate) > EPSILON ||
        (patch.width !== undefined && Math.abs(patch.width - (item.width ?? 0)) > EPSILON) ||
        (patch.height !== undefined && Math.abs(patch.height - (item.height ?? 0)) > EPSILON) ||
        ('parentId' in patch && patch.parentId !== item.parentId)
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

  // 선택 요소 삭제 (섹션이 삭제 대상이면 소속 아이템도 함께 삭제)
  function deleteItems(ids: string[]) {
    if (ids.length === 0) return;
    commitDoc((prev) => {
      const idSet = new Set(ids);
      prev.items.forEach((item) => {
        if (item.parentId && idSet.has(item.parentId)) idSet.add(item.id);
      });
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
      items: [...prev.items, { id, type: 'memo' as const, text: '', color: 'default' as const, seq, viewMode: 'full' as const, x, y, rotate: 0 }],
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

  // 섹션 도구로 그린 박스로 새 섹션 아이템을 생성. 박스 안에 든 기존 아이템들은 이 섹션 소속(parentId)이 됨
  function addSectionItem(box: SelectionBox, memberIds: string[]) {
    const id = genId();
    const memberSet = new Set(memberIds);
    commitDoc((prev) => ({
      ...prev,
      items: [
        ...prev.items.map((item) => (memberSet.has(item.id) && item.type !== 'section' ? { ...item, parentId: id } : item)),
        { id, type: 'section' as const, x: box.x, y: box.y, width: box.w, height: box.h, rotate: 0 },
      ],
    }));
    return id;
  }

  // Ctrl+G: 선택된 아이템들에 공통 groupId를 부여해, 이후 하나만 클릭해도 전체가 함께 선택/이동되게 함
  function groupItems(ids: string[]) {
    if (ids.length < 2) return;
    const groupId = genId();
    const idSet = new Set(ids);
    commitDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) => (idSet.has(item.id) ? { ...item, groupId } : item)),
    }));
  }

  // Ctrl+Shift+G: groupId만 해제 (아이템 자체는 그대로 유지)
  function ungroupItems(ids: string[]) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    commitDoc((prev) => ({
      ...prev,
      items: prev.items.map((item) => (idSet.has(item.id) ? { ...item, groupId: undefined } : item)),
    }));
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

  // 마운트 직후에도 썸네일이 있어야 해서 저장과 무관하게 캡처만 함. 이미지 로딩 시간을 두고 몇 차례 재캡처해 최신화
  useEffect(() => {
    const timeouts = [0, 500, 1500, 3000].map((delay) =>
      setTimeout(() => {
        const thumbnail = canvasRef.current?.getThumbnail();
        if (thumbnail) onThumbnailChange(thumbnail);
      }, delay),
    );
    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 한 번만 예약하면 됨
  }, []);

  // 문서가 바뀔 때마다 (1) 디바운스 후 백엔드에 저장 (2) 썸네일 갱신(클라이언트에서만 캡처)
  const initialDocRef = useRef(initialDoc);
  useEffect(() => {
    if (doc === initialDocRef.current) return; // 마운트 직후는 저장할 필요 없음 (참조 비교라 StrictMode 이중 호출에도 안전)
    onSaveStateChange('saving');

    // 업로드 중(blob: 미리보기)이면 저장 보류
    const hasPendingUpload = doc.items.some((item) => (item.type === 'image' || item.type === 'video') && item.src.startsWith('blob:'));
    const saveTimeout = hasPendingUpload
      ? undefined
      : setTimeout(() => {
          saveCanvas(canvasId, toSaveRequest(doc))
            .then(() => onSaveStateChange('saved'))
            .catch(() => onSaveStateChange('error'));
        }, SAVE_DEBOUNCE_MS);

    const raf = requestAnimationFrame(() => {
      const thumbnail = canvasRef.current?.getThumbnail();
      if (thumbnail) onThumbnailChange(thumbnail);
    });
    return () => {
      clearTimeout(saveTimeout);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onSaveStateChange/onThumbnailChange는 상위 렌더마다 새로 생성되므로 deps에 넣지 않음
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
        onCreateSection={addSectionItem}
        onGroupItems={groupItems}
        onUngroupItems={ungroupItems}
        onEditItemText={editItemText}
        onSetMemoColor={setMemoColor}
        onSetMemoViewMode={cycleMemoViewMode}
        onToolChange={setTool}
      />
      <Toolbar tool={tool} onToolChange={setTool} onFiles={(files) => addFiles(files)} />
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Switcher from '@/app/canvas/_components/core/Switcher';
import Workspace, { type SaveState } from '@/app/canvas/_components/core/Workspace';
import { createCanvas, getCanvas, listCanvases } from '@/app/api/canvas/api';
import { fromDetailResponse } from '@/app/api/canvas/adapter';
import type { CanvasDocument, CanvasEntry } from '@/types/canvas';

const EMPTY_DOC: CanvasDocument = { items: [], connectors: [] };

const SAVE_STATE_LABEL: Record<SaveState, string> = {
  saving: '저장 중...',
  saved: '저장됨',
  error: '저장 실패',
};

// localStorage에 캐싱
const THUMBNAIL_STORAGE_PREFIX = 'kxb2-canvas-thumbnail-';
const LAST_ACTIVE_STORAGE_KEY = 'kxb2-canvas-last-active-id';

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 공간 초과 등은 무시
  }
}

function loadCachedThumbnail(id: string): string | undefined {
  return safeLocalStorageGet(THUMBNAIL_STORAGE_PREFIX + id) ?? undefined;
}
function saveCachedThumbnail(id: string, thumbnail: string) {
  safeLocalStorageSet(THUMBNAIL_STORAGE_PREFIX + id, thumbnail);
}
function loadLastActiveId(): string | null {
  return safeLocalStorageGet(LAST_ACTIVE_STORAGE_KEY);
}
function saveLastActiveId(id: string) {
  safeLocalStorageSet(LAST_ACTIVE_STORAGE_KEY, id);
}

// updatedAt(ISO 문자열)을 "n분 전" 같은 상대 시간으로 표시
function formatRelativeTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  return `${Math.floor(diffHour / 24)}일 전`;
}

export default function CanvasPage() {
  const [canvases, setCanvases] = useState<CanvasEntry[] | null>(null); // null이면 목록 로딩 중
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadedDocs, setLoadedDocs] = useState<Record<string, CanvasDocument>>({}); // 활성화된 적 있는 캔버스만 문서를 지연 로드해서 캐싱

  // 최초 로드: 캔버스 목록 조회, 하나도 없으면 새로 생성해서 시드
  useEffect(() => {
    (async () => {
      try {
        const list = await listCanvases();
        if (list.length === 0) {
          const created = await createCanvas();
          const id = String(created.canvasId);
          setCanvases([{ id, name: created.title ?? 'Canvas 1', state: '저장됨', time: '방금 전' }]);
          setLoadedDocs({ [id]: EMPTY_DOC });
          setActiveId(id);
          saveLastActiveId(id);
          return;
        }
        const sorted = [...list].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        setCanvases(sorted.map((item) => ({ id: String(item.id), name: item.title ?? `Canvas ${item.id}`, state: '저장됨', time: formatRelativeTime(item.updatedAt), thumbnail: loadCachedThumbnail(String(item.id)) })));
        // 새로고침 전 마지막으로 보고 있던 캔버스가 있으면 그걸 우선 사용 (없거나 삭제됐으면 가장 최근에 저장된 캔버스로 대체)
        const lastActiveId = loadLastActiveId();
        const fallbackId = String(sorted[sorted.length - 1].id);
        const initialActiveId = lastActiveId && sorted.some((item) => String(item.id) === lastActiveId) ? lastActiveId : fallbackId;
        setActiveId(initialActiveId);
        saveLastActiveId(initialActiveId);
      } catch (error) {
        console.error(error);
        setLoadError(true);
      }
    })();
  }, []);

  // 활성 캔버스가 바뀔 때마다 최신 문서를 불러옴
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await getCanvas(Number(activeId));
        if (cancelled) return;
        setLoadedDocs((prev) => ({ ...prev, [activeId]: fromDetailResponse(detail) }));
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        alert('캔버스를 불러오지 못했습니다.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  async function addCanvas() {
    try {
      const created = await createCanvas();
      const id = String(created.canvasId);
      setCanvases((prev) => [...(prev ?? []), { id, name: created.title ?? 'Canvas', state: '저장됨', time: '방금 전' }]);
      setLoadedDocs((prev) => ({ ...prev, [id]: EMPTY_DOC }));
      setActiveId(id);
      saveLastActiveId(id);
    } catch (error) {
      console.error(error);
      alert('캔버스 생성에 실패했습니다.');
    }
  }

  // 캔버스 전환: 캐시된 문서를 지워서 위 effect가 최신 상태를 다시 불러오게 하고, 마지막으로 보던 캔버스로 기억해둠
  function selectActiveId(id: string) {
    setLoadedDocs((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActiveId(id);
    saveLastActiveId(id);
  }

  function handleSaveStateChange(state: SaveState) {
    if (!activeId) return;
    setCanvases(
      (prev) =>
        prev?.map((canvas) => (canvas.id === activeId ? { ...canvas, state: SAVE_STATE_LABEL[state], ...(state === 'saved' ? { time: '방금 전' } : {}) } : canvas)) ?? prev,
    );
  }

  function handleThumbnailChange(thumbnail: string) {
    if (!activeId) return;
    setCanvases((prev) => prev?.map((canvas) => (canvas.id === activeId ? { ...canvas, thumbnail } : canvas)) ?? prev);
    saveCachedThumbnail(activeId, thumbnail);
  }

  if (loadError) {
    return (
      <main className="relative flex flex-1 min-h-0 items-center justify-center">
        <p className="text-text-secondary">캔버스 목록을 불러오지 못했습니다.</p>
      </main>
    );
  }

  const activeCanvas = canvases?.find((canvas) => canvas.id === activeId);
  const activeDoc = activeId ? loadedDocs[activeId] : undefined;
  if (!canvases || !activeId || !activeCanvas || !activeDoc) {
    return <main className="relative flex-1 min-h-0" />;
  }

  return (
    <main className="relative flex-1 min-h-0">
      <Switcher canvases={canvases} selectedId={activeId} onSelect={selectActiveId} onAdd={addCanvas} />
      <Workspace key={activeId} canvasId={Number(activeId)} initialDoc={activeDoc} onSaveStateChange={handleSaveStateChange} onThumbnailChange={handleThumbnailChange} />
    </main>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Switcher from '@/app/canvas/_components/core/Switcher';
import Workspace, { type SaveState } from '@/app/canvas/_components/core/Workspace';
import { createCanvas, getCanvas, listCanvases } from '@/app/api/canvas/api';
import { fromDetailResponse } from '@/app/api/canvas/adapter';
import { formatRelativeTime } from '@/app/utils/time';
import { loadLastSavedAt } from '@/app/utils/savedAt';
import { loadLastActiveCanvasId, saveLastActiveCanvasId } from '@/app/utils/lastSelected';
import type { CanvasDocument, CanvasEntry } from '@/types/canvas';

const EMPTY_DOC: CanvasDocument = { items: [], connectors: [] };

const SAVE_STATE_LABEL: Record<SaveState, string> = {
  saving: '저장 중...',
  saved: '저장됨',
  error: '저장 실패',
};

// localStorage에 캐싱
const THUMBNAIL_STORAGE_PREFIX = 'kxb2-canvas-thumbnail-';

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
const loadLastActiveId = loadLastActiveCanvasId;
const saveLastActiveId = saveLastActiveCanvasId;

export default function CanvasPage() {
  return (
    <Suspense fallback={<main className="relative flex-1 min-h-0" />}>
      <CanvasPageInner />
    </Suspense>
  );
}

// useSearchParams()를 쓰려면 Suspense 경계 안에 있어야 해서 실제 내용은 이 안에 분리
function CanvasPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [canvases, setCanvases] = useState<CanvasEntry[] | null>(null); // null이면 목록 로딩 중
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadedDocs, setLoadedDocs] = useState<Record<string, CanvasDocument>>({}); // 활성화된 적 있는 캔버스만 문서를 지연 로드해서 캐싱

  // 캔버스 목록을 조회해 CanvasEntry[]로 변환 (생성순 정렬 + 로컬에 기록된 저장 시각 우선 사용)
  async function refreshCanvasList() {
    const list = await listCanvases();
    const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const entries = sorted.map((item) => ({ id: String(item.id), name: item.title ?? `Canvas ${item.id}`, state: '저장됨', time: formatRelativeTime(loadLastSavedAt(String(item.id)) ?? item.updatedAt), thumbnail: loadCachedThumbnail(String(item.id)) }));
    setCanvases(entries);
    return { list, entries };
  }

  // 최초 로드: 캔버스 목록 조회, 하나도 없으면 새로 생성해서 시드
  useEffect(() => {
    (async () => {
      try {
        const { list } = await refreshCanvasList();
        if (list.length === 0) {
          const created = await createCanvas();
          const id = String(created.canvasId);
          setCanvases([{ id, name: created.title ?? 'Canvas 1', state: '저장됨', time: '방금 전' }]);
          setLoadedDocs({ [id]: EMPTY_DOC });
          setActiveId(id);
          saveLastActiveId(id);
          return;
        }
        // 마지막으로 보던 캔버스가 있으면 그걸 우선 사용, 없으면 가장 최근에 수정된 캔버스
        const lastActiveId = loadLastActiveId();
        const mostRecentlyUpdated = [...list].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
        const fallbackId = String(mostRecentlyUpdated.id);
        const initialActiveId = lastActiveId && list.some((item) => String(item.id) === lastActiveId) ? lastActiveId : fallbackId;
        setActiveId(initialActiveId);
        saveLastActiveId(initialActiveId);
      } catch (error) {
        console.error(error);
        setLoadError(true);
      }
    })();
  }, []);

  // 라이브러리 등에서 ?id=로 특정 캔버스를 지정해 들어온 경우 그 캔버스로 전환 (쿼리만 바뀌는 경우는 리마운트가 안 되므로 별도로 반응해야 함)
  useEffect(() => {
    if (!canvases) return;
    const idFromQuery = searchParams.get('id');
    if (!idFromQuery) return;
    (async () => {
      if (canvases.some((canvas) => canvas.id === idFromQuery)) {
        selectActiveId(idFromQuery);
      } else {
        // 라이브러리에서 방금 새로 만든 캔버스처럼, 이 페이지가 가진 목록엔 아직 없을 수 있으니 한 번 더 조회
        try {
          const { entries } = await refreshCanvasList();
          if (entries.some((entry) => entry.id === idFromQuery)) selectActiveId(idFromQuery);
        } catch (error) {
          console.error(error);
        }
      }
      router.replace('/canvas');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshCanvasList/selectActiveId/router는 매 렌더 새로 만들어지거나 고정
  }, [canvases, searchParams]);

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
    // 이미 활성 상태면 아무것도 안 함, activeId가 그대로일 시 캐시만 지우면 빈 화면이 됨
    if (id === activeId) return;
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

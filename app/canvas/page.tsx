'use client';

import { useState } from 'react';
import CanvasSwitcher from '@/app/canvas/_components/canvasSwitcher';
import CanvasWorkspace from '@/app/canvas/_components/canvasWorkspace';
import type { CanvasDocument, CanvasEntry } from '@/types/canvas';

let nextCanvasId = 1;

const EMPTY_DOC: CanvasDocument = { items: [], connectors: [] };

const INITIAL_CANVASES: CanvasEntry[] = [{ id: '1', name: 'Canvas 1', state: '저장됨', time: '방금전', doc: EMPTY_DOC }];

export default function CanvasPage() {
  const [canvases, setCanvases] = useState<CanvasEntry[]>(INITIAL_CANVASES);
  const [activeId, setActiveId] = useState(INITIAL_CANVASES[0].id);
  const activeCanvas = canvases.find((canvas) => canvas.id === activeId) ?? canvases[0];

  // 실제 캔버스 생성/삭제 흐름이 API와 붙기 전까지는 목록에 빈 캔버스만 추가
  function addCanvas() {
    nextCanvasId += 1;
    const id = `${nextCanvasId}`;
    setCanvases((prev) => [...prev, { id, name: `Canvas ${nextCanvasId}`, state: '변경사항 없음', time: '방금전', doc: EMPTY_DOC }]);
    setActiveId(id);
  }

  function handleDocChange(doc: CanvasDocument) {
    setCanvases((prev) => prev.map((canvas) => (canvas.id === activeId ? { ...canvas, doc } : canvas)));
  }

  function handleThumbnailChange(thumbnail: string) {
    setCanvases((prev) => prev.map((canvas) => (canvas.id === activeId ? { ...canvas, thumbnail } : canvas)));
  }

  return (
    <main className="relative flex-1 min-h-0">
      <CanvasSwitcher canvases={canvases} selectedId={activeId} onSelect={setActiveId} onAdd={addCanvas} />
      <CanvasWorkspace key={activeId} initialDoc={activeCanvas.doc} onDocChange={handleDocChange} onThumbnailChange={handleThumbnailChange} />
    </main>
  );
}

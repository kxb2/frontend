'use client';

import { useEffect, useRef, useState } from 'react';
import ChevronDownIcon from '@/app/components/icons/chevron-down.svg';

// 임시 캔버스 목록 데이터
const CANVASES = [
  { id: 1, name: 'Canvas 1', state: '저장됨', time: '방금전' },
  { id: 2, name: 'Canvas 2', state: '변경사항 없음', time: '2분 전' },
  { id: 3, name: 'Canvas 3', state: '저장됨', time: '5분 전' },
];

export default function CanvasSwitcher() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(1);
  const selected = CANVASES.find((canvas) => canvas.id === selectedId) ?? CANVASES[0];
  const rootRef = useRef<HTMLDivElement>(null);

  // 드롭다운이 열려있을 때 바깥을 클릭하면 닫힘
  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="absolute left-5 top-5 z-20 flex flex-col items-start gap-3"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-black bg-card px-5 py-3">
        <div className="size-5 shrink-0 bg-white" />
        <div className="flex items-center gap-3.5">
          <p className="text-title-semibold text-text-primary">{selected.name}</p>
          <div className="flex items-center justify-center rounded-xl bg-background px-2 py-1">
            <p className="text-caption-12 text-primary-variant">{selected.state}</p>
          </div>
        </div>
        <ChevronDownIcon className={`size-6 shrink-0 text-text-primary transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="flex w-81.5 flex-col items-start gap-4.75 overflow-hidden rounded-2xl bg-card px-6.5 py-5.5">
          <div className="flex w-full flex-col items-start">
            {CANVASES.map((canvas) => {
              const isSelected = canvas.id === selectedId;
              return (
                <button
                  key={canvas.id}
                  type="button"
                  onClick={() => setSelectedId(canvas.id)}
                  className={`group flex w-full cursor-pointer items-center gap-4.25 rounded-2xl p-3 text-left ${isSelected ? 'bg-card-secondary' : 'hover:bg-background/40'}`}
                >
                  <div className={`h-8.25 w-19 shrink-0 rounded-xl border bg-background ${isSelected ? 'border-primary' : 'border-border'}`} />
                  <div className="flex flex-col items-start gap-px">
                    <p className={`text-label-semibold-14 font-en ${isSelected ? 'text-primary-variant' : 'text-text-primary'}`}>{canvas.name}</p>
                    <p className={`text-label-regular-14 ${isSelected ? 'text-text-secondary' : 'text-[#a1a8bd] group-hover:text-text-secondary'}`}>
                      {canvas.state} · {canvas.time}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

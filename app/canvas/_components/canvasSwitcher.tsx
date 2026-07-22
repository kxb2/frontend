'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ChevronDownIcon from '@/app/components/icons/chevron-down.svg';
import PlusIcon from '@/app/components/icons/plus.svg';
import type { CanvasEntry } from '@/types/canvas';

interface CanvasSwitcherProps {
  canvases: CanvasEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
}

export default function CanvasSwitcher({ canvases, selectedId, onSelect, onAdd }: CanvasSwitcherProps) {
  const [open, setOpen] = useState(false);
  const selected = canvases.find((canvas) => canvas.id === selectedId) ?? canvases[0];
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 새 캔버스가 추가되면 목록 맨 아래로 스크롤
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [canvases.length]);

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
          <div ref={listRef} className="scrollbar-none flex max-h-62 w-full flex-col items-start overflow-y-auto">
            {canvases.map((canvas) => {
              const isSelected = canvas.id === selectedId;
              return (
                <button
                  key={canvas.id}
                  type="button"
                  onClick={() => onSelect(canvas.id)}
                  className={`group flex w-full cursor-pointer items-center gap-4.25 rounded-2xl p-3 text-left ${isSelected ? 'bg-card-secondary' : 'hover:bg-background/40'}`}
                >
                  <div className={`relative h-8.25 w-19 shrink-0 overflow-hidden rounded-xl border bg-background ${isSelected ? 'border-primary' : 'border-border'}`}>
                    {canvas.thumbnail && <Image src={canvas.thumbnail} alt="" fill unoptimized className="object-cover" />}
                  </div>
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

          <div className="h-px w-full bg-border" />

          <button type="button" onClick={onAdd} className="flex cursor-pointer items-center gap-3 text-left">
            <PlusIcon className="box-border size-6 shrink-0 p-1.25 text-text-secondary [&>path]:stroke-[1.25]" />
            <p className="text-label-semibold-14 text-text-secondary">새 캔버스 추가</p>
          </button>
        </div>
      )}
    </div>
  );
}

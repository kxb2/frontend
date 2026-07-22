'use client';

import { useEffect, useRef } from 'react';
import CheckIcon from '@/app/canvas/_components/tools/memo/check.svg';
import type { MemoColor } from '@/types/canvas';
import type { ColorPickerRect } from '@/app/canvas/_components/tools/memo/useMemoColorPicker';

const SWATCHES: { color: MemoColor; hex: string }[] = [
  { color: 'default', hex: '#bfc7d6' },
  { color: 'purple', hex: '#c255ff' },
  { color: 'neon', hex: '#c7d63a' },
  { color: 'red', hex: '#f36060' },
];

interface MemoColorPickerProps {
  rect: ColorPickerRect;
  selected: MemoColor;
  onSelect: (color: MemoColor) => void;
  onClose: () => void;
}

// 메모 컬러 팔레트 팝업
export default function MemoColorPicker({ rect, selected, onSelect, onClose }: MemoColorPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div
      ref={rootRef}
      className="absolute z-30 flex items-center gap-3 rounded-xl border border-text-secondary bg-card px-4 py-3"
      style={{ left: rect.left, top: rect.top, transform: 'translate(-50%, 8px)' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {SWATCHES.map(({ color, hex }) => {
        const isSelected = color === selected;
        return (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-pressed={isSelected}
            onClick={() => onSelect(color)}
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-lg"
            style={{ backgroundColor: hex }}
          >
            {isSelected && <CheckIcon className="size-3 text-white" />}
          </button>
        );
      })}
    </div>
  );
}

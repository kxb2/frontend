'use client';

import { useRef } from 'react';
import MouseIcon from '@/app/canvas/_components/icons/mouse.svg';
import HandIcon from '@/app/canvas/_components/icons/hand.svg';
import ImageIcon from '@/app/canvas/_components/icons/image.svg';
import MemoIcon from '@/app/canvas/_components/icons/memo.svg';
import ConnectorIcon from '@/app/canvas/_components/icons/connector.svg';
import SectionIcon from '@/app/canvas/_components/icons/section.svg';

export type Tool = 'mouse' | 'hand' | 'image' | 'memo' | 'connector' | 'section';

export function isSelectTool(tool: Tool) {
  return tool === 'mouse' || tool === 'section';
}

export function isItemListeningTool(tool: Tool) {
  return isSelectTool(tool) || tool === 'connector';
}

interface ToolButtonProps {
  selected?: boolean;
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}

function ToolButton({ selected, label, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg ${selected ? 'bg-background text-primary' : 'text-text-secondary hover:bg-border'}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex h-7 w-1 shrink-0 items-center justify-center">
      <div className="h-7 w-px bg-text-secondary" />
    </div>
  );
}

interface ToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  onFiles: (files: FileList) => void;
}

export default function Toolbar({ tool, onToolChange, onFiles }: ToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed bottom-5 left-1/2 z-50 flex h-13 -translate-x-1/2 items-center gap-2.5 rounded-[15px] border border-white/25 bg-card p-2.5 backdrop-blur-[15px] drop-shadow-[0px_20px_25px_rgba(52,69,94,0.13)]">
      <ToolButton label="선택" selected={tool === 'mouse'} onClick={() => onToolChange('mouse')}>
        <MouseIcon className="size-5" />
      </ToolButton>
      <ToolButton label="이동" selected={tool === 'hand'} onClick={() => onToolChange('hand')}>
        <HandIcon className="size-5" />
      </ToolButton>

      <Divider />

      <ToolButton label="이미지" onClick={() => imageInputRef.current?.click()}>
        <ImageIcon className="size-5" />
      </ToolButton>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <ToolButton label="메모" selected={tool === 'memo'} onClick={() => onToolChange('memo')}>
        <MemoIcon className="size-5" />
      </ToolButton>

      <Divider />

      <ToolButton label="커넥터" selected={tool === 'connector'} onClick={() => onToolChange('connector')}>
        <ConnectorIcon className="size-5" />
      </ToolButton>
      <ToolButton label="섹션" selected={tool === 'section'} onClick={() => onToolChange('section')}>
        <SectionIcon className="size-5" />
      </ToolButton>
    </div>
  );
}

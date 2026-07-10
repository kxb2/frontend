'use client';

import { useState } from 'react';
import MouseIcon from '@/app/canvas/_components/icons/mouse.svg';
import HandIcon from '@/app/canvas/_components/icons/hand.svg';
import DiagramIcon from '@/app/canvas/_components/icons/diagram.svg';
import TextIcon from '@/app/canvas/_components/icons/text.svg';
import CommentIcon from '@/app/canvas/_components/icons/comment.svg';
import StickynoteIcon from '@/app/canvas/_components/icons/stickynote.svg';
import ConnectorIcon from '@/app/canvas/_components/icons/connector.svg';
import SectionIcon from '@/app/canvas/_components/icons/section.svg';
import PlusIcon from '@/app/canvas/_components/icons/plus.svg';

type Tool = 'mouse' | 'hand' | 'diagram' | 'text' | 'comment' | 'stickynote' | 'connector' | 'section';

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
      className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl ${selected ? 'text-white' : 'text-text-secondary hover:bg-border'}`}
      style={selected ? { backgroundImage: 'linear-gradient(144deg, var(--color-primary) 0%, var(--color-secondary) 147%)' } : undefined}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div className="flex h-8.5 w-1.25 shrink-0 items-center justify-center">
      <div className="h-8.5 w-px bg-text-secondary" />
    </div>
  );
}

export default function Toolbar() {
  const [tool, setTool] = useState<Tool>('mouse');

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex h-16 -translate-x-1/2 items-center gap-3 rounded-[19px] border border-white/25 bg-card p-3.25 backdrop-blur-[15px] drop-shadow-[0px_20px_25px_rgba(52,69,94,0.13)]">
      <ToolButton label="선택" selected={tool === 'mouse'} onClick={() => setTool('mouse')}>
        <MouseIcon className="size-6" />
      </ToolButton>
      <ToolButton label="이동" selected={tool === 'hand'} onClick={() => setTool('hand')}>
        <HandIcon className="size-6" />
      </ToolButton>

      <Divider />

      <ToolButton label="다이어그램" selected={tool === 'diagram'} onClick={() => setTool('diagram')}>
        <DiagramIcon className="size-6" />
      </ToolButton>

      <Divider />

      <ToolButton label="텍스트" selected={tool === 'text'} onClick={() => setTool('text')}>
        <TextIcon className="size-6" />
      </ToolButton>
      <ToolButton label="댓글" selected={tool === 'comment'} onClick={() => setTool('comment')}>
        <CommentIcon className="size-6" />
      </ToolButton>
      <ToolButton label="스티키 노트" selected={tool === 'stickynote'} onClick={() => setTool('stickynote')}>
        <StickynoteIcon className="size-6" />
      </ToolButton>
      <ToolButton label="커넥터" selected={tool === 'connector'} onClick={() => setTool('connector')}>
        <ConnectorIcon className="size-6" />
      </ToolButton>
      <ToolButton label="섹션" selected={tool === 'section'} onClick={() => setTool('section')}>
        <SectionIcon className="size-6" />
      </ToolButton>

      <label className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full bg-text-secondary text-border">
        <PlusIcon className="size-4" />
        <input type="file" accept="image/*,video/*" className="hidden" />
      </label>
    </div>
  );
}

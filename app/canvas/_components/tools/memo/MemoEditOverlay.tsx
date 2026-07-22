import { MEMO_LINE_HEIGHT, MEMO_MAX_CHARS } from '@/app/canvas/_components/tools/memo/memoLayout';
import type { OverlayRect } from '@/app/canvas/_components/tools/memo/useMemoEditing';
import type { CanvasItem } from '@/types/canvas';

interface MemoEditOverlayProps {
  editingItem: CanvasItem | undefined;
  editingItemId: string;
  overlayRect: OverlayRect;
  onFinishEditing: (id: string, text: string) => void;
  onChangeText: (text: string) => void;
}

// 메모 본문 인라인 편집용 HTML textarea
export default function MemoEditOverlay({ editingItem, editingItemId, overlayRect, onFinishEditing, onChangeText }: MemoEditOverlayProps) {
  if (!editingItem || editingItem.type !== 'memo') return null;
  return (
    <textarea
      key={editingItemId}
      autoFocus
      defaultValue={editingItem.text}
      maxLength={MEMO_MAX_CHARS}
      placeholder="메모를 입력하세요"
      className="absolute resize-none overflow-auto scrollbar-none border-none text-text-secondary outline-none placeholder:text-text-secondary/40"
      style={{
        left: overlayRect.left,
        top: overlayRect.top,
        width: overlayRect.width,
        height: overlayRect.height,
        fontSize: overlayRect.fontSize,
        fontFamily: 'Pretendard, Inter, sans-serif',
        lineHeight: MEMO_LINE_HEIGHT,
        padding: 0,
        boxSizing: 'border-box',
        background: 'transparent',
        transform: `translate(-50%, -50%) rotate(${overlayRect.rotationDeg}deg)`,
      }}
      onChange={(e) => onChangeText(e.target.value)}
      onBlur={(e) => onFinishEditing(editingItemId, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.currentTarget.blur();
      }}
    />
  );
}

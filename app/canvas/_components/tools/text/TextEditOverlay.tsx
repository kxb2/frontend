import { LINE_HEIGHT } from '@/app/canvas/_components/canvasItem';
import type { OverlayRect } from '@/app/canvas/_components/tools/text/useTextEditing';
import type { CanvasItem } from '@/types/canvas';

interface TextEditOverlayProps {
  editingItem: CanvasItem | undefined;
  editingItemId: string;
  overlayRect: OverlayRect;
  onFinishEditing: (id: string, text: string) => void;
}

// 텍스트/댓글 인라인 편집용 HTML textarea
export default function TextEditOverlay({ editingItem, editingItemId, overlayRect, onFinishEditing }: TextEditOverlayProps) {
  if (!editingItem || (editingItem.type !== 'text' && editingItem.type !== 'comment')) return null;
  return (
    <textarea
      key={editingItemId}
      autoFocus
      defaultValue={editingItem.text}
      placeholder={overlayRect.kind === 'comment' ? '댓글을 입력하세요' : '텍스트를 입력하세요'}
      className="absolute resize-none overflow-auto border-none text-white outline-none placeholder:text-white/40"
      style={{
        left: overlayRect.left,
        top: overlayRect.top,
        width: overlayRect.width,
        height: overlayRect.height,
        fontSize: overlayRect.fontSize,
        fontFamily: 'Pretendard, Inter, sans-serif',
        lineHeight: LINE_HEIGHT,
        padding: overlayRect.padding,
        boxSizing: 'border-box',
        background: overlayRect.background,
        borderRadius: overlayRect.borderRadius,
        transform: `translate(-50%, -50%) rotate(${overlayRect.rotationDeg}deg)`,
      }}
      onBlur={(e) => onFinishEditing(editingItemId, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') e.currentTarget.blur();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
    />
  );
}

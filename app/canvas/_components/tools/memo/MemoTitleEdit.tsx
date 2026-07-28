import { MEMO_TITLE_MAX_CHARS } from '@/app/canvas/_components/tools/memo/layout';
import type { OverlayRect } from '@/app/canvas/_components/tools/memo/useMemoEdit';

interface MemoTitleEditProps {
  editingTitleId: string;
  draftTitle: string;
  overlayRect: OverlayRect;
  onFinishEditing: (id: string, title: string) => void;
  onChangeTitle: (title: string) => void;
}

// 메모 제목 인라인 편집용 HTML input
export default function MemoTitleEdit({ editingTitleId, draftTitle, overlayRect, onFinishEditing, onChangeTitle }: MemoTitleEditProps) {
  return (
    <input
      key={editingTitleId}
      autoFocus
      defaultValue={draftTitle}
      maxLength={MEMO_TITLE_MAX_CHARS}
      className="absolute border-none font-bold text-text-primary outline-none"
      style={{
        left: overlayRect.left,
        top: overlayRect.top,
        width: overlayRect.width,
        height: overlayRect.height,
        fontSize: overlayRect.fontSize,
        fontFamily: 'Pretendard, Inter, sans-serif',
        padding: 0,
        boxSizing: 'border-box',
        background: 'transparent',
        transform: `translate(-50%, -50%) rotate(${overlayRect.rotationDeg}deg)`,
      }}
      onChange={(e) => onChangeTitle(e.target.value)}
      onBlur={(e) => onFinishEditing(editingTitleId, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
      }}
      onFocus={(e) => e.currentTarget.select()}
    />
  );
}

import { ShotPrompt } from '@/types/ai';

interface PreviewPromptsProps {
  shots: ShotPrompt[];
}

// 내보내기 기능 확인용 샷별 프롬프트 미리보기
export default function PreviewPrompts({ shots }: PreviewPromptsProps) {
  const sorted = [...shots].sort((a, b) => a.shotNumber - b.shotNumber);

  return (
    <div className="border border-gray-200 p-3 text-sm space-y-1 max-h-40 overflow-y-auto">
      {sorted.map((shot) => (
        <p key={shot.shotNumber}>
          <span className="font-semibold">Shot {shot.shotNumber}.</span> {shot.description}
        </p>
      ))}
    </div>
  );
}

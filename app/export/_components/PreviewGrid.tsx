import Image from 'next/image';
import { StoryboardCut } from '@/types/ai';

interface PreviewGridProps {
  cuts: StoryboardCut[];
}

// 내보내기 기능 확인용 3x3 미리보기
export default function PreviewGrid({ cuts }: PreviewGridProps) {
  const sorted = [...cuts].sort((a, b) => a.shotNumber - b.shotNumber);

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 aspect-video">
      {sorted.map((cut) => (
        <div key={cut.shotNumber} className="relative bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden">
          {cut.imageUrl ? (
            // mock 데이터가 SVG data URI라 Next 기본 이미지 최적화 로더를 못 타므로 unoptimized 필요
            // 실제 생성 이미지 URL로 교체되면 unoptimized 필요 여부 재검토할 것
            <Image src={cut.imageUrl} alt={`Shot ${cut.shotNumber}`} fill unoptimized className="object-cover" />
          ) : (
            <span className="text-gray-400 text-sm">이미지 없음</span>
          )}
        </div>
      ))}
    </div>
  );
}

import Image from 'next/image';
import { storyboardFields, imageModelField } from '@/app/data/storyboardFields';
import { StoryboardDetailResult } from '@/types/api';

// 스토리보드 상세 정보를 읽기 전용으로 보여주는 컴포넌트
function ReadOnlyField({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-700 bg-[#1A1A24] p-3">
      <div className="text-sm font-semibold text-gray-100">{label}</div>
      <div className="mt-1 text-xs text-gray-400">{description}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// 저장된 스토리보드 내용을 읽기 전용으로 보여주는 컴포넌트
export default function ReadStoryboard({ storyboard }: { storyboard: StoryboardDetailResult }) {
  const scenarioField = storyboardFields.find((field) => field.id === 'scenario')!;
  const genreField = storyboardFields.find((field) => field.id === 'genre')!;
  const referenceField = storyboardFields.find((field) => field.id === 'reference')!;
  const imageModelLabel = imageModelField.options.find((option) => option.value === storyboard.imageModel)?.label ?? storyboard.imageModel;

  return (
    <div className="flex flex-col gap-2">
      <ReadOnlyField label={scenarioField.label} description={scenarioField.description}>
        <p className="h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-neutral-700 bg-[#1C1F2A] p-2 text-sm text-gray-100 scrollbar-thin [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
          {storyboard.scenarioText}
        </p>
      </ReadOnlyField>

      <ReadOnlyField label={genreField.label} description={genreField.description}>
        <div className="flex flex-row flex-wrap gap-1">
          <span className="inline-block rounded-full border border-[#C255FF] bg-[#1A1A24] px-4 py-1 text-sm font-semibold text-white">{storyboard.genre}</span>
        </div>
        <p className="mt-2 text-xs text-gray-500">이미지 생성 모델: {imageModelLabel}</p>
      </ReadOnlyField>

      <ReadOnlyField label={referenceField.label} description={referenceField.description}>
        {storyboard.referenceImages.length > 0 ? (
          <div className="flex flex-nowrap gap-2 overflow-x-auto rounded-lg p-1 pb-2 scrollbar-thin [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
            {storyboard.referenceImages.map((image, index) => (
              <Image key={image.id} src={image.imageUrl} alt={`참고 이미지 ${index + 1}`} width={72} height={72} unoptimized className="h-18 w-18 shrink-0 rounded-md border border-neutral-700 object-cover" />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500">참고 이미지 없음</p>
        )}
      </ReadOnlyField>
    </div>
  );
}

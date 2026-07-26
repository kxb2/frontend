import Skeleton from 'react-loading-skeleton';
import { ImageSingleProps } from '@/types/storyboard';

// 9컷이 합쳐진 그리드 이미지 1장을 표시 (재생성은 사이드바의 '스토리보드 재생성하기' 버튼이 담당)
export default function ImageSingle({ imageUrl, isLoading }: ImageSingleProps) {
  return (
    <div className="relative flex-1 min-w-125 min-h-125 overflow-hidden rounded-xl border border-border bg-linear-to-br from-primary/30 from-15% via-[#3B5BDB]/80 via-75% to-background flex items-center justify-center">
      {isLoading && !imageUrl ? (
        // 생성 중이고 아직 그리드 이미지가 없으면 스켈레톤 표시
        <div className="absolute inset-0">
          <Skeleton height="100%" width="100%" borderRadius={12} baseColor="#3a3c41" highlightColor="#ffffff1a" duration={2.5} className="block!" containerClassName="block! h-full w-full" />
        </div>
      ) : imageUrl ? (
        <img src={imageUrl} alt="9컷 스토리보드" className="w-full h-full object-contain" />
      ) : (
        <>
          {/* 아직 생성 전임을 보여주는 3x3 그리드 라인(장식용) */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className="border border-border/30" />
            ))}
          </div>

          {/* 가운데 안내 아이콘 + 문구 */}
          <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M16 5H22M19 2V8M21 11.5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H12.5M21 14.9999L17.914 11.9139C17.5389 11.539 17.0303 11.3284 16.5 11.3284C15.9697 11.3284 15.4611 11.539 15.086 11.9139L6 20.9999M11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z"
                stroke="currentColor"
                className="text-text-secondary"
              />
            </svg>
            <p className="text-sm text-text-secondary">
              생성된 스토리보드가 여기에 표시됩니다.
              <br />
              스토리보드를 생성해보세요!
            </p>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { regenerateCut, getRegeneration } from '@/app/api/storyboard/api';
import { ImageCellProps } from '@/types/storyboard';

export default function ImageCell({ shotNumber, cutId, storyboardId, imageUrl, promptText, isLoading }: ImageCellProps) {
  // 이 컷의 프롬프트 팝업을 띄울지 여부
  const [showPrompt, setShowPrompt] = useState(false);
  // 실제로 화면에 보여줄 이미지 주소(재생성 성공 시 이 값만 갱신함)
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl ?? null);
  // 재생성 진행 중 여부
  const [isRegenerating, setIsRegenerating] = useState(false);

  // 부모가 새로운 generation 결과를 내려주면(예: 재검색) 화면도 그 값으로 맞춤
  useEffect(() => {
    setCurrentImageUrl(imageUrl ?? null);
  }, [imageUrl]);

  // regenerationId로 상태를 반복 조회하다가, 완료되면 새 이미지 주소를 반환(내보내기 폴링과 동일한 패턴)
  const pollRegeneration = async (regenerationId: number, attempt = 0): Promise<string | null> => {
    if (attempt > 90) {
      throw new Error('재생성 시간이 너무 오래 걸립니다.');
    }

    const result = await getRegeneration(regenerationId);
    const status = result.status.toLowerCase();

    if (status === 'completed') {
      return result.imageUrl;
    }
    if (status === 'failed') {
      throw new Error(result.errorMessage ?? '컷 재생성에 실패했습니다.');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    return pollRegeneration(regenerationId, attempt + 1);
  };

  // 재생성 버튼 클릭 시 실행
  const handleRegenerate = async () => {
    if (!storyboardId || !cutId) return;

    setIsRegenerating(true);
    try {
      const { regenerationId } = await regenerateCut(storyboardId, cutId);
      const newImageUrl = await pollRegeneration(regenerationId);
      if (newImageUrl) {
        setCurrentImageUrl(newImageUrl);
      }
    } catch (error) {
      console.error(error);
      alert('컷 재생성에 실패했습니다.');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* 이미지 표시 영역: 여기에만 overflow-hidden을 둬서, 아래 프롬프트 팝업이 셀 밖으로 나가도 안 잘리게 함 */}
      {/* 프롬프트 팝업이 열려있을 때는 이 컷의 이미지만 흐릿하고 어둡게 처리 */}
      {isLoading && !currentImageUrl ? (
        // 생성 중이고 아직 이 컷의 이미지가 없으면 스켈레톤 표시
        <div className="absolute inset-0 animate-pulse rounded-xl border border-border bg-neutral-700/40" />
      ) : (
        <div className={`absolute inset-0 overflow-hidden rounded-xl border border-border bg-linear-to-b from-[#ffffff]/10 to-[#232334]/20 flex items-center justify-center transition-[filter] ${(showPrompt && promptText) || isRegenerating ? 'blur-sm brightness-50' : ''}`}>
          {currentImageUrl ? <img src={currentImageUrl} alt={`컷 ${shotNumber}`} className="w-full h-full object-cover" /> : <></>}
        </div>
      )}

      <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-background text-[14px] font-semibold text-primary-variant">{String(shotNumber).padStart(2, '0')}</span>

      {/* 컷별 재생성 버튼 */}
      <button type="button" onClick={handleRegenerate} disabled={!promptText || !storyboardId || !cutId || isRegenerating} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-text-primary disabled:cursor-not-allowed disabled:opacity-40">
        <svg width="12" height="12" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className={isRegenerating ? 'animate-spin' : ''}>
          <path
            d="M9 1C10.5822 1 12.129 1.46919 13.4446 2.34824C14.7602 3.22729 15.7855 4.47672 16.391 5.93853C16.9965 7.40034 17.155 9.00887 16.8463 10.5607C16.5376 12.1126 15.7757 13.538 14.6569 14.6569C13.538 15.7757 12.1126 16.5376 10.5607 16.8463C9.00887 17.155 7.40034 16.9965 5.93853 16.391C4.47672 15.7855 3.22729 14.7602 2.34824 13.4446C1.46919 12.129 1 10.5822 1 9C1 6.76 1.88889 4.61778 3.43555 3.00889L5.44444 1M5.44444 5.44445V1L1 1"
            stroke="currentColor"
          />
        </svg>
      </button>

      {/* 재생성 중일 때 셀 가운데에 로딩 스피너 표시 */}
      {isRegenerating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {/* 컷별 프롬프트 보기 버튼: 열려있을 땐 × 아이콘으로 바뀜 */}
      <button type="button" onClick={() => setShowPrompt((prev) => !prev)} disabled={!promptText} className="absolute right-9 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-text-primary disabled:cursor-not-allowed disabled:opacity-40">
        {showPrompt ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* 버튼을 누르면 이 컷의 프롬프트를 크게 띄움 */}
      {showPrompt && promptText && (
        <div className="absolute right-2 top-10 z-20 max-h-9/10 w-9/10 overflow-y-auto rounded-lg border border-border bg-background p-3 text-xs text-text-secondary shadow-lg scrollbar-thin [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
          {promptText}
        </div>
      )}
    </div>
  );
}

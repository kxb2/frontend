'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FormField from '@/app/components/FormField';
import { storyboardFields } from '@/app/data/storyboardFields';
import ImageGrid from '@/app/storyboard/image/imagegrid';
import PromptBox from '@/app/storyboard/promptbox/propmptbox';
import ReadStoryboard from '@/app/storyboard/ReadStoryboard';
import { createStoryboard, getGeneration, getIntegratedPrompt, exportPdf, exportImage, getExport, getStoryboard } from '@/app/api/storyboard/api';
import { saveLastViewedStoryboardId } from '@/app/utils/lastSelected';
import { GenerationResult, StoryboardDetailResult } from '@/types/api';

// page.tsx
export default function Storyboard() {
  return (
    <Suspense fallback={<div className="flex h-screen flex-col bg-background text-text-primary" />}>
      <StoryboardInner />
    </Suspense>
  );
}

// useSearchParams()를 쓰려면 Suspense 경계 안에 있어야 해서 실제 내용은 이 안에 분리
function StoryboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 필드 id 별로 값을 모아두는 state(ex: {scenario: '...', genre: 'ROMANCE', reference: [File, File]})
  const [formValues, setFormValues] = useState<Record<string, string | File[]>>({});

  // 생성된 스토리보드 id (내보내기 요청 시 필요)
  const [storyboardId, setStoryboardId] = useState<number | null>(null);
  // 9컷 생성 결과 (완료되면 여기에 저장)
  const [generation, setGeneration] = useState<GenerationResult | null>(null);
  // 통합 프롬프트 (별도 엔드포인트에서 조회해서 저장)
  const [integratedPrompt, setIntegratedPrompt] = useState<string | null>(null);
  // 버튼 눌렀을 때 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 내보내기 드롭다운(이미지/PDF 선택지)을 띄울지 여부
  const [showExportMenu, setShowExportMenu] = useState(false);
  // 내보내기 진행 중 로딩 상태
  const [isExporting, setIsExporting] = useState(false);
  // 드롭다운 바깥을 클릭하면 닫기 위한 영역 참조
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // 라이브러리에서 선택해 들어온, 왼쪽 패널을 읽기 전용으로 보여줄 기존 스토리보드 (저장된 입력값, 우측 9컷/프롬프트/내보내기는 storyboardId/generation/integratedPrompt를 그대로 공유)
  const [viewedStoryboard, setViewedStoryboard] = useState<StoryboardDetailResult | null>(null);
  const [viewedId, setViewedId] = useState<number | null>(null);
  const [viewError, setViewError] = useState(false);

  // 라이브러리 등에서 ?id=로 들어오면 그 스토리보드를 보기, ?new=로 들어오면(같은 페이지 안에서도) 완전히 빈 화면으로 리셋
  useEffect(() => {
    const idFromQuery = searchParams.get('id');
    if (idFromQuery) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 쿼리 파라미터가 바뀔 때만 반응하는 의도적인 리셋
      setViewedId(Number(idFromQuery));
      router.replace('/storyboard');
      return;
    }
    if (searchParams.has('new')) {
      setViewedId(null);
      setViewedStoryboard(null);
      setViewError(false);
      setFormValues({});
      setStoryboardId(null);
      setGeneration(null);
      setIntegratedPrompt(null);
      router.replace('/storyboard');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router는 고정이라 deps에 넣지 않음
  }, [searchParams]);

  // viewedId가 정해지면 그 스토리보드의 저장된 입력값 + 9컷 결과 + 통합 프롬프트를 조회, 라이브러리가 selected UI에 쓸 수 있도록 기록
  useEffect(() => {
    saveLastViewedStoryboardId(viewedId !== null ? String(viewedId) : null);
    if (viewedId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- viewedId가 바뀔 때만 반응하는 의도적인 리셋
      setViewedStoryboard(null);
      return;
    }
    let cancelled = false;
    setViewError(false);
    (async () => {
      try {
        const detail = await getStoryboard(viewedId);
        if (cancelled) return;
        setViewedStoryboard(detail);
        setStoryboardId(detail.id);
        setGeneration(detail.generation ? { ...detail.generation, storyboardId: detail.id } : null);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setViewError(true);
        return;
      }
      // 통합 프롬프트는 별도 엔드포인트라 실패해도 나머지 화면은 그대로 보여줌
      try {
        const promptResult = await getIntegratedPrompt(viewedId);
        if (!cancelled) setIntegratedPrompt(promptResult.integratedPrompt);
      } catch (error) {
        console.error(error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewedId]);

  // 드롭다운이 열려있을 때 바깥 영역 클릭 시 닫기
  useEffect(() => {
    if (!showExportMenu) return;

    // 마우스 클릭 이벤트가 발생 했을 때
    const handleClickOutside = (event: MouseEvent) => {
      // 클릭한 지점이 드롭다운 영역 바깥이면 닫기
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    // 클릭 이벤트를 추가한 후 사용했다가 삭제
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

  // 필드의 데이터를 가져오는 함수
  const handleFieldChange = (id: string, value: string | File[]) => {
    // 이전 값을 복사 후 바뀐 필드만 새 값으로 덮어씀
    setFormValues((prev) => ({ ...prev, [id]: value }));
  };

  // generationId로 상태를 반복 조회하다가, 완료되면 결과를 저장
  // attempt는 몇 번째인지 세는 카운터
  const pollGeneration = async (generationId: number, attempt = 0): Promise<void> => {
    // 무한 호출을 방지하기 위해 90번(약 3분) 넘게 안끝나면 에러 던짐
    // (9컷 이미지 생성이 실제로는 수십 초~수 분 걸릴 수 있어서 기존 30번/60초보다 넉넉하게 잡음)
    if (attempt > 150) {
      throw new Error('생성 시간이 너무 오래 걸립니다.');
    }

    const result = await getGeneration(generationId);
    // 백엔드가 상태값을 소문자('completed'/'failed')로 내려주므로 대소문자 구분 없이 비교
    const status = result.status.toLowerCase();

    // 서버가 준비되면 완성된 실제 데이터 전송
    if (status === 'completed') {
      setGeneration(result);
      return;
    }

    // 일부(또는 전체) 컷이 실패해도 이미 완료된 컷은 있을 수 있으므로, 결과는 그대로 반영하고 알림만 띄움
    if (status === 'failed') {
      setGeneration(result);
      alert('이미지 생성을 일부 실패하였습니다.');
      return;
    }

    // 아직 진행 중이면 2초 뒤에 다시 확인(setTimeout 활용)
    // 자기 자신을 다시 호출하여 재귀 구조 설정(attempt를 늘려가며 완료되기전까지 반복)
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await pollGeneration(generationId, attempt + 1);
  };

  // 스토리보드 만들기 버튼 클릭 시 실행
  const handleSubmit = async () => {
    // 필수 값을 넣지 않으면 리턴을 통해 함수 중지
    if (!formValues.scenario || !formValues.genre) {
      alert('시나리오와 장르는 필수입니다.');
      return;
    }

    // 검증을 통과한 경우 로딩 상태 설정
    setIsSubmitting(true);
    try {
      // 스토리보드 생성 요청 후 폴링 함수 시작
      // 원래 변수명 : 새 변수명 형식으로 저장
      const { storyboardId: newStoryboardId, generationId } = await createStoryboard(formValues);
      setStoryboardId(newStoryboardId);
      await pollGeneration(generationId);
      // 9컷 생성이 끝나면 통합 프롬프트를 별도로 조회
      const promptResult = await getIntegratedPrompt(newStoryboardId);
      setIntegratedPrompt(promptResult.integratedPrompt);
    } catch (error) {
      console.error(error);
      alert('스토리보드 생성에 실패했습니다.');
    } finally {
      // 함수가 종료 되었다면 로딩 상태 해제
      setIsSubmitting(false);
    }
  };

  // exportId로 상태를 반복 조회하다가, 완료되면 결과를 반환(생성 폴링과 동일한 패턴)
  const pollExport = async (exportId: number, attempt = 0): Promise<{ downloadUrl: string | null; errorMessage: string | null }> => {
    if (attempt > 30) {
      throw new Error('내보내기 시간이 너무 오래 걸립니다.');
    }

    const result = await getExport(exportId);
    const status = result.status.toLowerCase();

    if (status === 'completed') {
      return result;
    }
    if (status === 'failed') {
      throw new Error(result.errorMessage ?? '내보내기에 실패했습니다.');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    return pollExport(exportId, attempt + 1);
  };

  // 내보내기 드롭다운에서 이미지/PDF 중 하나를 선택했을 때 실행
  const handleExport = async (type: 'image' | 'pdf') => {
    if (!storyboardId) return;

    setShowExportMenu(false);
    setIsExporting(true);
    try {
      // type의 따라 호출하는 함수 변경
      const { exportId } = type === 'pdf' ? await exportPdf(storyboardId) : await exportImage(storyboardId, true);
      const result = await pollExport(exportId);

      if (result.downloadUrl) {
        // 새 탭에서 다운로드 링크 열기
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error(error);
      alert('내보내기에 실패했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  if (viewError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-text-primary">
        <p className="text-text-secondary">스토리보드를 불러오지 못했습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-text-primary">
      <div className="flex flex-1 min-h-0 p-2 gap-4">
        <div className="min-w-100 w-1/4 shrink-0 relative flex flex-col rounded-2xl p-4 text-text-primary">
          {/* 필드 영역만 자체적으로 스크롤됨. pb-16으로 버튼에 안 가리도록 아래 여백 확보 */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto pb-16 pr-2 scrollbar-thin [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
            <div>
              <h2 className="text-base font-semibold">{viewedStoryboard ? (viewedStoryboard.title ?? `Storyboard ${viewedStoryboard.id}`) : 'AI Storyboard'}</h2>
              <p className="mt-1 text-xs text-text-secondary">{viewedStoryboard ? '저장된 스토리보드입니다.' : '시나리오만 입력하면 9컷 스토리보드를 만들어드려요.'}</p>
            </div>
            {viewedStoryboard ? (
              <ReadStoryboard storyboard={viewedStoryboard} />
            ) : (
              <>
                {/* 그라데이션은 3가지 색상을 넣는 것이 좋다 판단되었음 */}
                {/* absolute + 부모 relative로 스크롤 영역과 완전히 분리, 항상 사이드바 하단에 떠 있음. z-50으로 항상 위에 보이도록 */}
                <button
                  className="absolute left-4 right-6 bottom-4 z-50 flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-purple-500 via-pink-400 to-orange-300 py-2.5 text-sm font-semibold text-text-primary shadow-lg disabled:opacity-60"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
                  </svg>
                  {isSubmitting ? '생성 중...' : '스토리보드 만들기'}
                </button>
                <div className="flex flex-col gap-2">
                  {storyboardFields.map((field) => (
                    <FormField key={field.id} field={field} onFieldChange={handleFieldChange} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between shrink-0 pr-2">
            <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {viewedStoryboard?.title ?? 'My Storyboard'}
            </div>
            <div className="relative flex gap-2" ref={exportMenuRef}>
              <button type="button" onClick={() => setShowExportMenu((prev) => !prev)} disabled={!storyboardId || isExporting} className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary disabled:cursor-not-allowed disabled:opacity-40">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M8 9.66667V0.5M4.66667 3.83333L8 0.5L11.3333 3.83333M3.28667 0.5H2.16667C1.72464 0.5 1.30072 0.675595 0.988155 0.988156C0.675595 1.30072 0.5 1.72464 0.5 2.16667V13.8333C0.5 14.2754 0.675595 14.6993 0.988155 15.0118C1.30072 15.3244 1.72464 15.5 2.16667 15.5H13.8333C14.2754 15.5 14.6993 15.3244 15.0118 15.0118C15.3244 14.6993 15.5 14.2754 15.5 13.8333V2.16667C15.5 1.72464 15.3244 1.30072 15.0118 0.988156C14.6993 0.675595 14.2754 0.5 13.8333 0.5H12.7133"
                    stroke="white"
                  />
                </svg>
                {isExporting ? '내보내는 중...' : '내보내기'}
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-lg">
                  <button type="button" onClick={() => handleExport('image')} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-card">
                    이미지로 내보내기
                  </button>
                  <button type="button" onClick={() => handleExport('pdf')} className="w-full px-3 py-2 text-left text-xs text-text-secondary hover:bg-card">
                    PDF로 내보내기
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-3 mt-2 overflow-y-auto pr-2 scrollbar-thin [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
            <ImageGrid cuts={generation?.cuts} storyboardId={storyboardId} />
            <PromptBox promptText={integratedPrompt ?? undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

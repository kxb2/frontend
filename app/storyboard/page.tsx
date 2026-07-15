'use client';

import { useState } from 'react';
import FormField from '@/app/components/FormField';
import { storyboardFields } from '@/app/data/storyboardFields';
import ImageGrid from '@/app/storyboard/image/imagegrid';
import PromptBox from '@/app/storyboard/promptbox/propmptbox';
import { createStoryboard, getGeneration, getIntegratedPrompt } from '@/app/api/storyboard/api';
import { GenerationResult } from '@/types/api';

// page.tsx
export default function Storyboard() {
  // 필드 id 별로 값을 모아두는 state(ex: {scenario: '...', genre: 'ROMANCE', reference: [File, File]})
  const [formValues, setFormValues] = useState<Record<string, string | File[]>>({});

  // 9컷 생성 결과 (완료되면 여기에 저장)
  const [generation, setGeneration] = useState<GenerationResult | null>(null);
  // 통합 프롬프트 (별도 엔드포인트에서 조회해서 저장)
  const [integratedPrompt, setIntegratedPrompt] = useState<string | null>(null);
  // 버튼 눌렀을 때 로딩 상태
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (attempt > 90) {
      throw new Error('생성 시간이 너무 오래 걸립니다.');
    }

    const result = await getGeneration(generationId);

    // 서버가 준비되면 완성된 실제 데이터 전송
    // 백엔드가 상태값을 소문자('completed')로 내려주므로 대소문자 구분 없이 비교
    if (result.status.toLowerCase() === 'completed') {
      setGeneration(result);
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
      const { storyboardId, generationId } = await createStoryboard(formValues);
      await pollGeneration(generationId);
      // 9컷 생성이 끝나면 통합 프롬프트를 별도로 조회
      const promptResult = await getIntegratedPrompt(storyboardId);
      setIntegratedPrompt(promptResult.integratedPrompt);
    } catch (error) {
      console.error(error);
      alert('스토리보드 생성에 실패했습니다.');
    } finally {
      // 함수가 종료 되었다면 로딩 상태 해제
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-950 text-gray-100">
      <div className="flex flex-1 min-h-0 p-2 gap-4">
        <div className="w-96 shrink-0 flex flex-col gap-3 overflow-y-auto rounded-2xl bg-neutral-900 p-5 text-white">
          <div>
            <h2 className="text-base font-semibold">AI Storyboard</h2>
            <p className="mt-1 text-xs text-gray-400">시나리오만 입력하면 9컷 스토리보드를 만들어드려요.</p>
          </div>
          <div className="flex flex-col gap-3">
            {storyboardFields.map((field) => (
              <FormField key={field.id} field={field} onFieldChange={handleFieldChange} />
            ))}
          </div>
          {/* 그라데이션은 3가지 색상을 넣는 것이 좋다 판단되었음 */}
          <button className="mt-4 flex items-center justify-center gap-2 rounded-full bg-linear-to-r from-purple-500 via-pink-400 to-orange-300 py-3 text-sm font-semibold text-white disabled:opacity-60" onClick={handleSubmit} disabled={isSubmitting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
            </svg>
            {isSubmitting ? '생성 중...' : '스토리보드 만들기'}
          </button>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-100">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              My Storyboard
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-gray-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4h16v16H4z" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                메모
              </button>
              <button className="flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-gray-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                내보내기
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 flex flex-col gap-3 mt-2">
            <ImageGrid cuts={generation?.cuts} />
            <PromptBox promptText={integratedPrompt ?? undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

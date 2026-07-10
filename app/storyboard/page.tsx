'use client';

import { useState } from 'react';
import FormField from '@/app/components/FormField';
import Header from '@/app/components/Header';
import { storyboardFields } from '@/app/data/storyboardFields';
import ImageGrid from '@/app/storyboard/image/imagegrid';
import PromptBox from '@/app/storyboard/promptbox/propmptbox';
import { createStoryboard, getGeneration } from '@/app/api/storyboard/api';
import { GenerationResult } from '@/types/api';

// page.tsx
export default function Storyboard() {
  // 필드 id 별로 값을 모아두는 state(ex: {scenario: '...', genre: 'ROMANCE', reference: [File, File]})
  const [formValues, setFormValues] = useState<Record<string, string | File[]>>({});

  // 9컷 생성 결과 (완료되면 여기에 저장)
  const [generation, setGeneration] = useState<GenerationResult | null>(null);
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
    // 무한 호출을 방지하기 위해 30번 넘게 안끝나면 에러 던짐
    if (attempt > 30) {
      throw new Error('생성 시간이 너무 오래 걸립니다.');
    }

    const result = await getGeneration(generationId);

    // 서버가 준비되면 완성된 실제 데이터 전송
    if (result.status === 'COMPLETED') {
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
      const { generationId } = await createStoryboard(formValues);
      await pollGeneration(generationId);
    } catch (error) {
      console.error(error);
      alert('스토리보드 생성에 실패했습니다.');
    } finally {
      // 함수가 종료 되었다면 로딩 상태 해제
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 min-h-0 p-4 gap-4">
        <div className="w-96 shrink-0 flex flex-col gap-3 overflow-y-auto">
          <span>스토리 보드 설명</span>
          <div className="flex flex-col gap-3">
            {storyboardFields.map((field) => (
              <FormField key={field.id} field={field} onFieldChange={handleFieldChange} />
            ))}
          </div>
          <button className="mt-auto" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '생성 중...' : '스토리보드 생성하기'}
          </button>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex justify-between shrink-0">
            <span>9컷 결과물</span>
            <div>
              <button>내보내기</button>
              <button>캔버스</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col gap-3 mt-2">
            <ImageGrid cuts={generation?.cuts} />
            <PromptBox promptText={generation?.integratedPrompt ?? undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

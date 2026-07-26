// 타입 가져오기
import {
  CreateStoryboardResult,
  GenerationResult,
  IntegratedPromptResult,
  ExportRequestResult,
  ExportStatusResult,
  RegenerationRequestResult,
  RegenerationStatusResult,
  StoryboardListItem,
  StoryboardDetailResult,
  StoryboardTitleResult,
} from '@/types/api';
import { authorizedFetch } from '@/app/api/http';

// 스토리보드 생성 요청 (POST /storyboards)
// async 함수로써 리턴이 Promise
export async function createStoryboard(formValues: Record<string, string | File[]>): Promise<CreateStoryboardResult> {
  // 텍스트와 파일을 보내기위한 FormData 생성(브라우저가 기본 제공하는 객체)
  const formData = new FormData();
  // 그리드 1장 생성 모드 고정값으로 적용
  formData.append('generation_mode', 'single_image');

  // as string을 통해 타입 단언 선언(타입을 알려주는 것)
  // ?? -> 값이 없는 경우 undefined를 방지하기 위해 빈 문자열을 넣음
  formData.append('scenario_text', (formValues.scenario as string) ?? '');
  formData.append('genre', (formValues.genre as string) ?? '');

  // 선택 필드(값이 있을 때만 전송)
  // if (formValues.style) formData.append('style', formValues.style as string);
  // if (formValues.tone) formData.append('tone', formValues.tone as string);
  // if (formValues.aspectRatio) formData.append('aspect_ratio', formValues.aspectRatio as string);
  // if (formValues.era) formData.append('era', formValues.era as string);
  if (formValues.imageModel) formData.append('image_model', formValues.imageModel as string);

  // ?? -> 값이 없는 경우 undefined를 방지하기 위해 빈 배열을 넣음
  const referenceFiles = (formValues.reference as File[]) ?? [];
  // 파일 개수만큼 반복해서 append를 실행
  referenceFiles.forEach((file) => formData.append('reference_images', file));

  // 백엔드 서버로 직접 요청
  const response = await authorizedFetch('/storyboards', {
    method: 'POST', // POST 방식으로 지정
    body: formData, // FormData를 보냄
  });

  // 응답 실패시 에러 던지기
  if (!response.ok) {
    throw new Error('스토리보드 생성 요청에 실패했습니다.');
  }

  return response.json();
}

// 스토리보드 목록 조회 (GET /storyboards)
export async function listStoryboards(limit?: number): Promise<StoryboardListItem[]> {
  const query = limit !== undefined ? `?limit=${limit}` : '';
  const response = await authorizedFetch(`/storyboards${query}`);

  if (!response.ok) {
    throw new Error('스토리보드 목록 조회에 실패했습니다.');
  }

  return response.json();
}

// 스토리보드 상세 조회 (GET /storyboards/{storyboardId}) -- 9컷 결과는 포함되지 않음
export async function getStoryboard(storyboardId: number): Promise<StoryboardDetailResult> {
  const response = await authorizedFetch(`/storyboards/${storyboardId}`);

  if (!response.ok) {
    throw new Error('스토리보드 조회에 실패했습니다.');
  }

  return response.json();
}

// 스토리보드 제목 수정 (PATCH /storyboards/{storyboardId})
export async function renameStoryboard(storyboardId: number, title: string): Promise<StoryboardTitleResult> {
  const response = await authorizedFetch(`/storyboards/${storyboardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    throw new Error('스토리보드 이름 변경에 실패했습니다.');
  }

  return response.json();
}

// 스토리보드 삭제 (DELETE /storyboards/{storyboardId})
export async function deleteStoryboard(storyboardId: number): Promise<void> {
  const response = await authorizedFetch(`/storyboards/${storyboardId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('스토리보드 삭제에 실패했습니다.');
  }
}

// 9컷 생성 상태 조회 (GET /generations/{generationId})
export async function getGeneration(generationId: number): Promise<GenerationResult> {
  // fetch의 기본값은 GET이기에 아무것도 적지 않으면 자동으로 GET 요청처리
  const response = await authorizedFetch(`/generations/${generationId}`);

  if (!response.ok) {
    throw new Error('생성 상태 조회에 실패했습니다.');
  }

  return response.json();
}

// 통합 프롬프트 조회 (GET /storyboards/{storyboardId}/prompt)
// 백엔드 측에서 텍스트 프롬프트와 이미지 프롬프트의 생성 속도 차이가 있기에 다 생성이 된 후 가져오기 위해 묶음
export async function getIntegratedPrompt(storyboardId: number): Promise<IntegratedPromptResult> {
  const response = await authorizedFetch(`/storyboards/${storyboardId}/prompt`);

  if (!response.ok) {
    throw new Error('통합 프롬프트 조회에 실패했습니다.');
  }

  return response.json();
}

// PDF 내보내기 요청 (POST /storyboards/{storyboardId}/exports/pdf)
export async function exportPdf(storyboardId: number): Promise<ExportRequestResult> {
  const response = await authorizedFetch(`/storyboards/${storyboardId}/exports/pdf`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('PDF 내보내기 요청에 실패했습니다.');
  }

  return response.json();
}

// 이미지 내보내기 요청 (POST /storyboards/{storyboardId}/exports/image)
// includeIndividualCuts: 9컷 그리드 1장 외에 컷별 개별 이미지도 zip에 포함할지 여부
export async function exportImage(storyboardId: number, includeIndividualCuts = false): Promise<ExportRequestResult> {
  const response = await authorizedFetch(`/storyboards/${storyboardId}/exports/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ includeIndividualCuts }),
  });

  if (!response.ok) {
    throw new Error('이미지 내보내기 요청에 실패했습니다.');
  }

  return response.json();
}

// 내보내기 상태 조회 (GET /exports/{exportId})
export async function getExport(exportId: number): Promise<ExportStatusResult> {
  const response = await authorizedFetch(`/exports/${exportId}`);

  if (!response.ok) {
    throw new Error('내보내기 상태 조회에 실패했습니다.');
  }

  return response.json();
}

// 특정 컷 재생성 요청 (POST /storyboards/{storyboardId}/cuts/{cutId}/regeneration)
export async function regenerateCut(storyboardId: number, cutId: number): Promise<RegenerationRequestResult> {
  const response = await authorizedFetch(`/storyboards/${storyboardId}/cuts/${cutId}/regeneration`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('컷 재생성 요청에 실패했습니다.');
  }

  return response.json();
}

// 컷 재생성 상태 조회 (GET /regenerations/{regenerationId})
export async function getRegeneration(regenerationId: number): Promise<RegenerationStatusResult> {
  const response = await authorizedFetch(`/regenerations/${regenerationId}`);

  if (!response.ok) {
    throw new Error('컷 재생성 상태 조회에 실패했습니다.');
  }

  return response.json();
}

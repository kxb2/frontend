// 타입 가져오기
import { CreateStoryboardResult, GenerationResult, IntegratedPromptResult } from '@/types/api';

// 실제 백엔드 서버 주소. .env.local의 NEXT_PUBLIC_API_URL을 읽고, 없으면 로컬 기본값 사용
// (브라우저에서 실행되는 코드라 NEXT_PUBLIC_ 접두사가 붙은 환경변수만 접근 가능)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// 스토리보드 생성 요청 (POST {API_BASE_URL}/storyboards)
// async 함수로써 리턴이 Promise
export async function createStoryboard(formValues: Record<string, string | File[]>): Promise<CreateStoryboardResult> {
  // 텍스트와 파일을 보내기위한 FormData 생성(브라우저가 기본 제공하는 객체)
  const formData = new FormData();
  // as string을 통해 타입 단언 선언(타입을 알려주는 것)
  // ?? -> 값이 없는 경우 undefined를 방지하기 위해 빈 문자열을 넣음
  formData.append('scenario_text', (formValues.scenario as string) ?? '');
  formData.append('genre', (formValues.genre as string) ?? '');

  // ?? -> 값이 없는 경우 undefined를 방지하기 위해 빈 배열을 넣음
  const referenceFiles = (formValues.reference as File[]) ?? [];
  // 파일 개수만큼 반복해서 append를 실행
  referenceFiles.forEach((file) => formData.append('referenceImages', file));

  // 백엔드 서버로 직접 요청
  const response = await fetch(`${API_BASE_URL}/storyboards`, {
    method: 'POST', // POST 방식으로 지정
    body: formData, // FormData를 보냄
  });

  // 응답 실패시 에러 던지기
  if (!response.ok) {
    throw new Error('스토리보드 생성 요청에 실패했습니다.');
  }

  return response.json();
}

// 9컷 생성 상태 조회 (GET {API_BASE_URL}/generations/{generationId})
export async function getGeneration(generationId: number): Promise<GenerationResult> {
  // fetch의 기본값은 GET이기에 아무것도 적지 않으면 자동으로 GET 요청처리
  const response = await fetch(`${API_BASE_URL}/generations/${generationId}`);

  if (!response.ok) {
    throw new Error('생성 상태 조회에 실패했습니다.');
  }

  return response.json();
}

// 통합 프롬프트 조회 (GET {API_BASE_URL}/storyboards/{storyboardId}/prompt)
// 백엔드 측에서 텍스트 프롬프트와 이미지 프롬프트의 생성 속도 차이가 있기에 다 생성이 된 후 가져오기 위해 묶음
export async function getIntegratedPrompt(storyboardId: number): Promise<IntegratedPromptResult> {
  const response = await fetch(`${API_BASE_URL}/storyboards/${storyboardId}/prompt`);

  if (!response.ok) {
    throw new Error('통합 프롬프트 조회에 실패했습니다.');
  }

  return response.json();
}

// 스토리보드 생성 요청 응답 형태
export interface CreateStoryboardResult {
  storyboardId: number; // 스토리보드 id
  generationId: number; // 생성 작업 id
  status: string; // 상태
}

// 9컷 생성 결과 중 컷 하나의 형태
export interface Cut {
  cutId: number; // 컷 레코드 자체의 고유 id
  shotNumber: number; // 화면에 표시되는 컷 순번(1~9)
  imageUrl: string; // 컷 이미지 주소
  prompt: string; // 이 컷을 생성할 때 사용한 프롬프트
  status: string; // 컷 생성 상태
}

// 9컷 조회 응답 형태
export interface GenerationResult {
  generationId: number; // 생성 작업 id
  storyboardId: number; // 스토리보드 id
  status: string; // 생성 작업 전체 상태
  gridImageUrl: string | null; // 9컷을 합친 그리드 이미지 주소(없으면 null)
  integratedPrompt: string | null; // 9컷 프롬프트를 합친 통합 프롬프트(생성 전이면 null)
  cuts: Cut[]; // 9개 컷 데이터 배열
  errorMessage: string | null; // 실패 시 에러 메시지(성공이면 null)
}

// 스토리보드 생성 요청 응답 형태 (POST /storyboards)
export interface CreateStoryboardResult {
  storyboardId: number; // 스토리보드 id
  generationId: number; // 생성 작업 id
  status: string; // 상태
  generationMode: string; // 그리드 1장 생성 모드
}

// 9컷 생성 결과 중 컷 하나의 형태
export interface Cut {
  id: number; // 컷 레코드 자체의 고유 id
  orderNo: number; // 화면에 표시되는 컷 순번(1~9)
  imageUrl: string | null; // 컷 이미지 주소(생성 전이면 null)
  promptText: string | null; // 이 컷을 생성할 때 사용한 프롬프트(생성 전이면 null)
  angleType: string | null; // 샷 앵글/구도 정보(생성 전이면 null)
  status: string; // 컷 생성 상태
}

// 9컷 조회 응답 형태 (GET /generations/{generationId})
export interface GenerationResult {
  id: number; // 생성 작업 id
  storyboardId: number; // 스토리보드 id
  status: string; // 생성 작업 전체 상태
  gridImageUrl: string | null; // 9컷을 합친 그리드 이미지 주소(없으면 null)
  cuts: Cut[]; // 9개 컷 데이터 배열
}

// 통합 프롬프트 조회 응답 형태 (GET /storyboards/{storyboardId}/prompt)
export interface IntegratedPromptResult {
  storyboardId: number; // 스토리보드 id
  integratedPrompt: string; // 9컷 프롬프트를 합친 통합 프롬프트
}

// 내보내기 요청 응답 형태 (POST /storyboards/{storyboardId}/exports/pdf, /exports/image)
export interface ExportRequestResult {
  exportId: number; // 내보내기 작업 id
  status: string; // 상태
}

// 내보내기 상태 조회 응답 형태 (GET /exports/{exportId})
export interface ExportStatusResult {
  id: number; // 내보내기 작업 id
  storyboardId: number; // 스토리보드 id
  type: string; // 내보내기 종류 ('pdf' | 'image')
  status: string; // 내보내기 진행 상태
  downloadUrl: string | null; // 완료 시 다운로드 주소(진행 중이면 null)
  errorMessage: string | null; // 실패 시 에러 메시지(성공이면 null)
}

// 컷 재생성 요청 응답 형태 (POST /storyboards/{storyboardId}/cuts/{cutId}/regeneration)
export interface RegenerationRequestResult {
  regenerationId: number; // 재생성 작업 id
  status: string; // 상태
}

// 컷 재생성 상태 조회 응답 형태 (GET /regenerations/{regenerationId})
export interface RegenerationStatusResult {
  id: number; // 재생성 작업 id
  cutId: number; // 대상 컷 id
  status: string; // 재생성 진행 상태
  imageUrl: string | null; // 완료 시 새 이미지 주소(진행 중이면 null)
  errorMessage: string | null; // 실패 시 에러 메시지(성공이면 null)
}

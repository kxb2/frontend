// 스토리보드 생성 요청 응답 형태
export interface CreateStoryboardResult {
  storyboardId: number;
  generationId: number;
  status: string;
}

// 9컷 생성 결과 중 컷 하나의 형태
export interface Cut {
  cutId: number;
  shotNumber: number;
  imageUrl: string;
  prompt: string;
  status: string;
}

// 9컷 조회 응답 형태
export interface GenerationResult {
  generationId: number;
  storyboardId: number;
  status: string;
  gridImageUrl: string | null;
  integratedPrompt: string | null;
  cuts: Cut[];
  errorMessage: string | null;
}

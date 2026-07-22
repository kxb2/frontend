// output_ai 타입 정의

// 샷별 프롬프트
export interface ShotPrompt {
  shotNumber: number; // 1~9
  description: string;
}

// 샷별 이미지
export interface StoryboardCut {
  shotNumber: number; // 1~9
  imageUrl?: string; // 미생성 상태면 undefined
}

// 내보내기(F-05/F-06)가 공통으로 사용하는 결과물 데이터
export interface StoryboardResult {
  cuts: StoryboardCut[]; // 9개
  shots: ShotPrompt[]; // 9개, shotNumber로 cuts와 매칭
}

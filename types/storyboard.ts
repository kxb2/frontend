import { Cut } from '@/types/api';

// 이미지 url 유무
export interface ImageCellProps {
  shotNumber: number;
  cutId?: number;
  storyboardId?: number | null;
  imageUrl?: string | null;
  promptText?: string | null;
}

// 그리드 이미지 속성
export interface ImageGridProps {
  cuts?: Cut[];
  storyboardId?: number | null;
}

// 9컷이 합쳐진 그리드 이미지 1장 속성
export interface ImageSingleProps {
  imageUrl?: string | null;
  storyboardId?: number | null;
  isLoading?: boolean; // 생성 중이고 아직 이미지가 없으면 스켈레톤 표시
}

// 프롬프트 박스 속성
export interface PromptBoxProps {
  promptText?: string;
  isLoading?: boolean; // 생성 중이고 아직 통합 프롬프트가 없으면 스켈레톤 표시
}

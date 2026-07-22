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

// 프롬프트 박스 속성
export interface PromptBoxProps {
  promptText?: string;
}

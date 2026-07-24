import { Cut } from '@/types/api';

// 이미지 url 유무
export interface ImageCellProps {
  shotNumber: number;
  cutId?: number;
  storyboardId?: number | null;
  imageUrl?: string | null;
  promptText?: string | null;
  isLoading?: boolean; // 9컷 결과 도착 전(생성 중)이면 스켈레톤 표시
}

// 그리드 이미지 속성
export interface ImageGridProps {
  cuts?: Cut[];
  storyboardId?: number | null;
  isLoading?: boolean; // 9컷 결과 도착 전(생성 중)이면 각 셀에 스켈레톤 표시
}

// 프롬프트 박스 속성
export interface PromptBoxProps {
  promptText?: string;
  isLoading?: boolean; // 통합 프롬프트 도착 전(생성 중)이면 스켈레톤 표시
}

// 임시 스토리보드 결과 데이터(API 연동 전 내보내기(F-05/F-06) 기능 개발·검증)
// 이후 API 연동 시 이 파일 대신 실제 응답을 StoryboardResult 형태로 매핑해서 넘길 것

import { StoryboardResult } from '@/types/ai';

// 임시 샷 이미지
const SHOT_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#34d399', '#22d3ee', '#60a5fa', '#a78bfa', '#f472b6'];

// 임시 샷 SVG data URI placeholder
function placeholderImage(shotNumber: number): string {
  const color = SHOT_COLORS[(shotNumber - 1) % SHOT_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
    <rect width="100%" height="100%" fill="${color}" />
    <text x="50%" y="50%" font-size="48" fill="white" text-anchor="middle" dominant-baseline="middle">Shot ${shotNumber}</text>
  </svg>`;
  // encodeURIComponent를 써서 렌더링 오류 방지
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// 임시 샷별 프롬프트
export const mockStoryboardResult: StoryboardResult = {
  cuts: Array.from({ length: 9 }, (_, i) => ({
    shotNumber: i + 1,
    imageUrl: placeholderImage(i + 1),
  })),
  shots: [
    { shotNumber: 1, description: 'wide shot, 주인공이 골목 끝에 서 있다, 노을빛 역광' },
    { shotNumber: 2, description: 'medium shot, 주인공이 천천히 걸어온다, 표정에 긴장감' },
    { shotNumber: 3, description: 'close-up, 주인공의 눈빛이 흔들린다' },
    { shotNumber: 4, description: 'two-shot, 상대방과 마주 선다, 미묘한 거리감' },
    { shotNumber: 5, description: 'over-the-shoulder, 상대방의 반응을 살핀다' },
    { shotNumber: 6, description: 'close-up, 상대방이 옅게 웃는다' },
    { shotNumber: 7, description: 'medium shot, 둘 사이의 침묵이 흐른다' },
    { shotNumber: 8, description: 'wide shot, 배경의 노을이 짙어진다' },
    { shotNumber: 9, description: 'medium shot, 두 사람이 나란히 걸어간다' },
  ],
};

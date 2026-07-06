// 타입에 따른 텍스트 출력을 다르게 하기 위한 데이터
import { StoryBoardField } from '@/types/input';

export const storyboardFields: StoryBoardField[] = [
  {
    id: 'scenario',
    type: 'textarea',
    label: '시나리오 입력창',
    description: '만들고 싶은 스토리의 시나리오를 입력해주세요.',
  },
  {
    id: 'genre',
    type: 'select',
    label: '장르 선택/키워드 선택',
    description: '아래에 있는 장르를 보고 선택해주세요.',
    options: [
      { label: '로맨스', value: 'romance' },
      { label: 'SF', value: 'sf' },
    ],
  },
  {
    id: 'reference',
    type: 'fileUpload',
    label: '레퍼런스 첨부',
    description: '레퍼런스로 제공할 이미지를 첨부해주세요.',
    accept: 'image/*',
  },
];

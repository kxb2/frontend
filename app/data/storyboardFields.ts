// 타입에 따른 텍스트 출력을 다르게 하기 위한 데이터
import { StoryBoardField } from '@/types/input';

export const storyboardFields: StoryBoardField[] = [
  {
    id: 'scenario',
    type: 'textarea',
    label: '1. 시나리오 입력',
    description: '영상이나 이미지로 만들고 싶은 이야기를 자유롭게 입력해주세요.',
    placeholder: '시나리오를 입력해주세요.',
    maxLength: 500,
  },
  {
    id: 'genre',
    type: 'select',
    label: '2. 분위기 선택',
    description: '분위기나 장르를 선택해주세요.',
    options: [
      { label: '드라마', value: '드라마' },
      { label: '로맨스', value: '로맨스' },
      { label: '액션', value: '액션' },
      { label: '스릴러', value: '스릴러' },
      { label: '코미디', value: '코미디' },
    ],
  },
  {
    id: 'reference',
    type: 'fileUpload',
    label: '3. 참고 이미지 (선택)',
    description: '캐릭터, 배경, 소품 등 참고할 이미지를 추가할 수 있어요. (최대 10장)',
    accept: 'image/*',
    maxFiles: 10,
  },
  {
    id: 'imageModel',
    type: 'modelSelect',
    label: '4. 이미지 생성 모델',
    description: '스토리보드 이미지를 생성할 모델을 선택해주세요.',
    options: [
      { label: 'ChatGPT Images 2.0', value: 'chatgpt', description: 'OpenAI 최신 이미지 생성 모델' },
      { label: 'Nano Banana 2', value: 'nano-banana-2', description: 'Gemini 3.1 최신 이미지 생성 모델' },
    ],
    defaultValue: 'chatgpt',
  },
];

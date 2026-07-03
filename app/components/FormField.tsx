import { StoryBoardField } from '@/types/input';

interface Props {
  field: StoryBoardField;
}

export default function StoryboardFormField({ field }: Props) {
  return (
    <div className="border border-gray-200">
      <div className="border-b border-gray-200 px-3 py-2 text-sm text-gray-500 text-center">{field.description ?? '기능 설명'}</div>

      <div className="p-3">{/* 여기에 실제 input이 들어갈 자리 */}</div>
    </div>
  );
}

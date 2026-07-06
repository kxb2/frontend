import { StoryBoardField } from '@/types/input';

interface Props {
  field: StoryBoardField;
}

export default function StoryboardFormField({ field }: Props) {
  return (
    <div className="border border-gray-200">
      <div className="border-b border-gray-200 px-3 py-2 text-sm text-gray-500 text-center">{field.description ?? '기능 설명'}</div>

      <div className="p-3">
        {/* 타입이 시나리오인 경우 */}
        {field.type === 'textarea' && <textarea className="w-full h-24 text-sm p-2 border border-gray-200 rounded resize-none" placeholder={field.placeholder} />}

        {/* 타입이 장르 선택인 경우 */}
        {field.type === 'select' && (
          <div className="flex flex-row gap-2">
            {field.options.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm">
                <input type="radio" name={field.id} value={opt.value} />
                {opt.label}
              </label>
            ))}
          </div>
        )}

        {/* 타입이 파일 업로드인 경우 */}
        {field.type === 'fileUpload' && <input type="file" accept={field.accept} multiple={(field.maxFiles ?? 1) > 1} />}
      </div>
    </div>
  );
}

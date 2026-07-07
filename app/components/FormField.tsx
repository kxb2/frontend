'use client';

import { useRef, useState } from 'react';
import { StoryBoardField } from '@/types/input';

interface Props {
  field: StoryBoardField;
}

export default function StoryboardFormField({ field }: Props) {
  // textarea 글자수 세기 위한 state
  const [text, setText] = useState('');

  // 화면에 보이지 않지만 DOM 요소를 직접 조작하기 위함
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-gray-900">{field.label}</div>
      <div className="mt-1 text-xs text-gray-400">{field.description}</div>

      <div className="mt-3">
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

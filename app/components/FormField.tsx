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
        {field.type === 'textarea' && (
          <div className="relative">
            <textarea className="h-24 w-full resize-none rounded-lg border border-gray-200 p-2 text-sm" placeholder={field.placeholder} maxLength={field.maxLength} value={text} onChange={(e) => setText(e.target.value)} />
            {field.maxLength && (
              <span className="absolute bottom-2 right-2 text-[11px] text-gray-300">
                {text.length}/{field.maxLength}
              </span>
            )}
          </div>
        )}

        {/* 타입이 장르 선택인 경우 */}
        {field.type === 'select' && (
          <div className="flex flex-row flex-wrap gap-2">
            {field.options.map((opt) => (
              <label key={opt.value} className="cursor-pointer">
                <input type="radio" name={field.id} value={opt.value} className="peer sr-only" />
                <span className="inline-block rounded-full border border-gray-200 px-4 py-1.5 text-sm text-gray-600 peer-checked:border-purple-500 peer-checked:bg-purple-50 peer-checked:font-semibold peer-checked:text-purple-600">{opt.label}</span>
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

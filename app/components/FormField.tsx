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
        {field.type === 'fileUpload' && (
          <div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-md bg-linear-to-br from-purple-500 to-pink-400 text-[10px] text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16 5H22M19 2V8M21 11.5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H12.5M21 14.9999L17.914 11.9139C17.5389 11.539 17.0303 11.3284 16.5 11.3284C15.9697 11.3284 15.4611 11.539 15.086 11.9139L6 20.9999M11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z"
                    stroke="white"
                  />
                </svg>
                이미지 추가
              </button>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 w-14 shrink-0 rounded-md border border-gray-200 bg-gray-100" />
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept={field.accept} multiple={(field.maxFiles ?? 1) > 1} className="hidden" />
            <p className="mt-2 text-[11px] text-gray-400">이미지가 없어도 생성할 수 있어요! 텍스트만으로도 원하는 결과물을 만들어 드려요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

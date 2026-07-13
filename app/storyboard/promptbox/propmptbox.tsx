'use client';

import { useState } from 'react';

interface PromptBoxProps {
  promptText?: string;
}

export default function PromptBox({ promptText }: PromptBoxProps) {
  // "더보기" 펼침 여부
  const [isExpanded, setIsExpanded] = useState(false);

  // 복사하기 버튼 클릭 시 실행
  const handleCopy = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
  };

  return (
    <div className="shrink-0 rounded-xl border border-neutral-700 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          <div>
            <div className="text-sm font-semibold text-gray-100">통합 프롬프트</div>
            <div className="text-xs text-gray-400">9컷에 동일하게 적용됩니다.</div>
          </div>
        </div>
        <button type="button" onClick={handleCopy} className="flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1.5 text-xs text-gray-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="9" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 15V5a1 1 0 0 1 1-1h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          복사하기
        </button>
      </div>

      <div className={`mt-3 rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-xs text-gray-300 ${isExpanded ? '' : 'line-clamp-3'}`}>{promptText ?? '프롬프트'}</div>

      <button type="button" onClick={() => setIsExpanded((prev) => !prev)} className="mt-2 text-xs text-gray-400">
        {isExpanded ? '접기 ↑' : '더보기 ↓'}
      </button>
    </div>
  );
}

'use client';

import { PromptBoxProps } from '@/types/storyboard';
import { useState } from 'react';
import Skeleton from 'react-loading-skeleton';

export default function PromptBox({ promptText, isLoading }: PromptBoxProps) {
  // "더보기" 펼침 여부
  const [isExpanded, setIsExpanded] = useState(false);
  // 복사 완료 문구를 잠깐 보여줄지 여부
  const [isCopied, setIsCopied] = useState(false);

  // 복사하기 버튼 클릭 시 실행
  const handleCopy = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    // 복사 완료 표시 후 2초 뒤 원래 문구로 되돌림
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="shrink-0 rounded-xl border border-border bg-[#1A1A24] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
          <div>
            <div className="text-sm font-semibold text-text-secondary">통합 프롬프트</div>
            <div className="text-xs text-[#9A9A9A]">9컷에 동일하게 적용됩니다.</div>
          </div>
        </div>
        <button type="button" onClick={handleCopy} disabled={!promptText} className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary disabled:cursor-not-allowed disabled:opacity-40">
          {isCopied ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M11.6667 1.66675H5.00004C4.55801 1.66675 4.13409 1.84235 3.82153 2.15491C3.50897 2.46747 3.33337 2.89139 3.33337 3.33342V16.6668C3.33337 17.1088 3.50897 17.5327 3.82153 17.8453C4.13409 18.1578 4.55801 18.3334 5.00004 18.3334H15C15.4421 18.3334 15.866 18.1578 16.1786 17.8453C16.4911 17.5327 16.6667 17.1088 16.6667 16.6668V6.66675M11.6667 1.66675C11.9305 1.66632 12.1918 1.71809 12.4355 1.81906C12.6792 1.92003 12.9005 2.06822 13.0867 2.25508L16.0767 5.24508C16.2641 5.43134 16.4127 5.65287 16.514 5.89689C16.6152 6.1409 16.6671 6.40256 16.6667 6.66675M11.6667 1.66675V5.83341C11.6667 6.05443 11.7545 6.26639 11.9108 6.42267C12.0671 6.57895 12.279 6.66675 12.5 6.66675L16.6667 6.66675M8.33337 7.50008H6.66671M13.3334 10.8334H6.66671M13.3334 14.1667H6.66671"
                stroke="white"
              />
            </svg>
          )}
          {isCopied ? '복사됨' : '복사하기'}
        </button>
      </div>

      {isLoading && !promptText ? (
        // 생성 중이고 아직 통합 프롬프트가 없으면 스켈레톤 표시
        <div className="mt-3 rounded-lg border border-border bg-surface p-3">
          <Skeleton count={3} width="95%" baseColor="#3a3c41" highlightColor="#ffffff1a" duration={2.5} />
        </div>
      ) : (
        <div className={`mt-3 whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-xs text-text-secondary ${isExpanded ? '' : 'line-clamp-3'}`}>{promptText ?? '프롬프트'}</div>
      )}

      <button type="button" onClick={() => setIsExpanded((prev) => !prev)} disabled={!promptText} className="mt-2 text-xs text-text-secondary disabled:cursor-not-allowed disabled:opacity-40">
        {isExpanded ? '접기 ↑' : '더보기 ↓'}
      </button>
    </div>
  );
}

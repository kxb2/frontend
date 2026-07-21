'use client';

import { useState } from 'react';

// 이미지 url 유무
interface ImageCellProps {
  shotNumber: number;
  imageUrl?: string | null;
  promptText?: string | null;
}

export default function ImageCell({ shotNumber, imageUrl, promptText }: ImageCellProps) {
  // 이 컷의 프롬프트 팝업을 띄울지 여부
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="relative w-full h-full">
      {/* 이미지 표시 영역: 여기에만 overflow-hidden을 둬서, 아래 프롬프트 팝업이 셀 밖으로 나가도 안 잘리게 함 */}
      <div className="absolute inset-0 overflow-hidden rounded-xl border border-border bg-linear-to-b from-[#ffffff]/10 to-[#232334]/20  flex items-center justify-center">{imageUrl ? <img src={imageUrl} alt={`컷 ${shotNumber}`} className="w-full h-full object-cover" /> : <></>}</div>

      <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-background text-[14px] font-semibold text-primary-variant">{String(shotNumber).padStart(2, '0')}</span>

      {/* 컷별 재생성 버튼(추후 기능 붙일 예정, 지금은 클릭 핸들러 없음) */}
      <button type="button" disabled={!promptText} className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-text-primary disabled:cursor-not-allowed disabled:opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0 1 14-4.5M19.5 15a8 8 0 0 1-14 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* 컷별 프롬프트 보기 버튼: 열려있을 땐 × 아이콘으로 바뀜 */}
      <button type="button" onClick={() => setShowPrompt((prev) => !prev)} disabled={!promptText} className="absolute right-9 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-text-primary disabled:cursor-not-allowed disabled:opacity-40">
        {showPrompt ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {/* 버튼을 누르면 이 컷의 프롬프트만 작게 띄움 */}
      {showPrompt && promptText && (
        <div className="absolute right-2 top-10 z-20 max-h-32 w-56 overflow-y-auto rounded-lg border border-border bg-background p-2 text-[11px] text-text-secondary shadow-lg scrollbar-thin [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent">
          {promptText}
        </div>
      )}
    </div>
  );
}

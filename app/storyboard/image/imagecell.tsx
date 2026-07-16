// 이미지 url 유무
interface ImageCellProps {
  shotNumber: number;
  imageUrl?: string | null;
}

export default function ImageCell({ shotNumber, imageUrl }: ImageCellProps) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-border bg-linear-to-br from-card to-background flex items-center justify-center">
      {imageUrl ? <img src={imageUrl} alt={`컷 ${shotNumber}`} className="w-full h-full object-cover" /> : <span className="text-sm text-text-disabled">이미지 없음</span>}

      <span className="absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-background text-[14px] font-semibold text-primary-variant">{String(shotNumber).padStart(2, '0')}</span>

      <button type="button" className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-text-primary">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0 1 14-4.5M19.5 15a8 8 0 0 1-14 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

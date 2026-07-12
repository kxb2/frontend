// 이미지 url 유무
interface ImageCellProps {
  shotNumber: number;
  imageUrl?: string;
}

export default function ImageCell({ shotNumber, imageUrl }: ImageCellProps) {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl border border-neutral-700 bg-linear-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
      {imageUrl ? <img src={imageUrl} alt={`컷 ${shotNumber}`} className="w-full h-full object-cover" /> : <span className="text-sm text-gray-500">이미지 없음</span>}

      <span className="absolute left-2 top-2 rounded-full bg-linear-to-r from-purple-500 to-pink-400 px-2.5 py-1 text-[11px] font-semibold text-white">CUT {String(shotNumber).padStart(2, '0')}</span>

      <button type="button" className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-white">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4v5h5M20 20v-5h-5M4.5 9a8 8 0 0 1 14-4.5M19.5 15a8 8 0 0 1-14 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

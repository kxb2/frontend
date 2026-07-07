// 이미지 url 유무
interface ImageCellProps {
  imageUrl?: string;
}

export default function ImageCell({ imageUrl }: ImageCellProps) {
  return <div className="w-full h-full bg-gray-200 border border-gray-300 flex items-center justify-center overflow-hidden">{imageUrl ? <img src={imageUrl} alt="storyboard cut" className="w-full h-full object-cover" /> : <span className="text-gray-400 text-sm">이미지 없음</span>}</div>;
}

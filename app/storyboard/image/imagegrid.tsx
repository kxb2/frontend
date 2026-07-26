import ImageCell from '@/app/storyboard/image/imagecell';
import { ImageGridProps } from '@/types/storyboard';

export default function ImageGrid({ cuts = [], storyboardId }: ImageGridProps) {
  const cellCount = 9;
  /*
  Array.from: 배열을 만들어내는 함수(length는 배열의 길이)
  1번째 인자값: 원래 있던 값(현재는 undefined)
  2번째 인자값: 몇번째 자리인지
  */
  const cellIndexes = Array.from({ length: cellCount }, (a, index) => index);
  // cellIndexes 는 결과적으로 [0, 1, 2, 3, 4, 5, 6, 7, 8] 이런 배열이 됨

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-3 flex-1 min-w-125 min-h-125">
      {cellIndexes.map((cellIndex) => (
        <ImageCell key={cellIndex} shotNumber={cellIndex + 1} cutId={cuts[cellIndex]?.id} storyboardId={storyboardId} imageUrl={cuts[cellIndex]?.imageUrl} promptText={cuts[cellIndex]?.promptText} />
      ))}
    </div>
  );
}

import FormField from '@/app/components/FormField';
import { storyboardFields } from '@/app/data/storyboardFields';
import ImageGrid from '@/app/storyboard/image/imagegrid';

export default function Storyboard() {
  return (
    <>
      <div>
        <span>스토리 보드 설명</span>
        <div>
          {storyboardFields.map((field) => (
            <FormField key={field.id} field={field} />
          ))}
        </div>
        <button>스토리보드 생성하기</button>
      </div>
      <div>
        <div>
          <span>9컷 결과물</span>
          <button>내보내기</button>
          <button>캔버스</button>
        </div>
        <ImageGrid />
      </div>
    </>
  );
}

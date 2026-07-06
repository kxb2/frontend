import FormField from '@/app/components/FormField';
import { storyboardFields } from '@/app/data/storyboardFields';

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
        <div>{/* output 공간 */}</div>
      </div>
    </>
  );
}

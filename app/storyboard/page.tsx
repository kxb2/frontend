import FormField from '@/app/components/FormField';
import Header from '@/app/components/Header';
import { storyboardFields } from '@/app/data/storyboardFields';
import ImageGrid from '@/app/storyboard/image/imagegrid';
import PromptBox from '@/app/storyboard/promptbox/propmptbox';

// page.tsx
export default function Storyboard() {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 min-h-0 p-4 gap-4">
        <div className="w-96 shrink-0 flex flex-col gap-3 overflow-y-auto">
          <span>스토리 보드 설명</span>
          <div className="flex flex-col gap-3">
            {storyboardFields.map((field) => (
              <FormField key={field.id} field={field} />
            ))}
          </div>
          <button className="mt-auto">스토리보드 생성하기</button>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex justify-between shrink-0">
            <span>9컷 결과물</span>
            <div>
              <button>내보내기</button>
              <button>캔버스</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 flex flex-col gap-3 mt-2">
            <ImageGrid />
            <PromptBox />
          </div>
        </div>
      </div>
    </div>
  );
}

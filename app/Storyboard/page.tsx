import FormField from '@/app/components/FormField';
import { storyboardFields } from '@/app/data/storyboardFields';

export default function Storyboard() {
  return (
    <div>
      {storyboardFields.map((field) => (
        <FormField key={field.id} field={field} />
      ))}
    </div>
  );
}

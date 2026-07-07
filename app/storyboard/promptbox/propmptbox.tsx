interface PromptBoxProps {
  promptText?: string;
}

export default function PromptBox({ promptText }: PromptBoxProps) {
  return (
    <div className="shrink-0 h-28 bg-gray-100 border border-gray-200 p-4 flex items-center justify-center text-center text-sm text-gray-500">
      {promptText ?? '프롬프트'}
    </div>
  );
}

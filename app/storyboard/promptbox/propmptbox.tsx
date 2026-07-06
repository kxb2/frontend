interface PromptBoxProps {
  promptText?: string;
}

export default function PromptBox({ promptText }: PromptBoxProps) {
  return <div className="bg-gray-100 border border-gray-200 p-4 text-center text-sm text-gray-500 mt-2">{promptText ?? '프롬프트'}</div>;
}

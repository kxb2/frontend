'use client';

import { useRef, useState } from 'react';
import { StoryBoardField } from '@/types/input';

interface Props {
  field: StoryBoardField;
  onFieldChange: (id: string, value: string | File[]) => void;
}

export default function StoryboardFormField({ field, onFieldChange }: Props) {
  // textarea 글자수 세기 위한 state
  const [text, setText] = useState('');

  // 선택한 이미지 미리보기
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);

  // 드롭존 위에 파일을 끌고 있는 중인지 여부(드래그 중 테두리 강조용)
  const [isDragging, setIsDragging] = useState(false);

  // 화면에 보이지 않지만 DOM 요소를 직접 조작하기 위함
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 고급설정 펼침 여부
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  // 고급설정 값들
  const [style, setStyle] = useState('');
  const [tone, setTone] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [era, setEra] = useState('');

  // 파일 목록을 받아 미리보기에 추가하는 공용 함수(input 선택 / 드래그앤드롭 공용)
  const addFiles = (fileList: FileList) => {
    // 이미 추가된 파일명은 제외
    const existingNames = previews.map((p) => p.file.name);
    // 같은 이름의 파일이 아니라면 새로운 파일로 추가
    const newFiles = Array.from(fileList).filter((file) => !existingNames.includes(file.name));
    // URL.createObjectURL(file) -> 사용자가 고른 파일을 임시 URL로 변경하는 함수
    const newPreviews = newFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    // 기존 미리보기 목록 뒤에 새로 고른 파일들을 이어붙임
    setPreviews((prev) => [...prev, ...newPreviews]);
    onFieldChange(field.id, [...previews.map((p) => p.file), ...newFiles]);
  };

  // 파일 선택시 실행되는 함수
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 파일이 없는 경우 리턴
    if (!e.target.files) return;
    addFiles(e.target.files);
    // 같은 파일을 다시 선택해도 onChange가 또 실행되도록 입력값 초기화
    e.target.value = '';
  };

  // 드래그한 파일을 놓았을 때 실행되는 함수
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // 브라우저 기본 동작 막기
    setIsDragging(false); // 드래그 해제
    if (!e.dataTransfer.files) return;
    addFiles(e.dataTransfer.files); // input 선택과 동일한 로직 재사용
  };

  return (
    <div className="rounded-xl border border-neutral-700 bg-[#1A1A24] p-4">
      <div className="text-sm font-semibold text-gray-100">{field.label}</div>
      <div className="mt-1 text-xs text-gray-400">{field.description}</div>

      <div className="mt-3">
        {/* 타입이 시나리오인 경우 */}
        {field.type === 'textarea' && (
          <div className="relative">
            <textarea
              className="h-24 w-full resize-none rounded-lg border border-neutral-700 bg-[#1C1F2A] p-2 text-sm text-gray-100 placeholder:text-gray-500"
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onFieldChange(field.id, e.target.value);
              }}
            />
            {field.maxLength && (
              <span className="absolute bottom-2 right-2 text-[11px] text-gray-500">
                {text.length}/{field.maxLength}
              </span>
            )}
          </div>
        )}

        {/* 타입이 장르 선택인 경우 */}
        {field.type === 'select' && (
          <div className="flex flex-row flex-wrap gap-2">
            {field.options.map((opt) => (
              <label key={opt.value} className="cursor-pointer">
                <input type="radio" name={field.id} value={opt.value} className="peer sr-only" onChange={() => onFieldChange(field.id, opt.value)} />
                <span className="inline-block rounded-full border border-neutral-700 px-4 py-1.5 text-sm text-gray-300 peer-checked:border-transparent peer-checked:bg-linear-to-r peer-checked:bg-purple-500 peer-checked:font-semibold peer-checked:text-white">{opt.label}</span>
              </label>
            ))}

            {field.id === 'genre' && (
              <div className="mt-2 w-full">
                {/* 고급 설정을 직접 건들이기 전까지 주석처리 */}
                {/* <button type="button" onClick={() => setIsAdvancedOpen((prev) => !prev)} className="flex w-full items-center justify-between text-sm text-gray-300">
                  <span>⚙ 고급설정</span>
                  <span className="text-gray-500">{[style, tone, aspectRatio, era].filter(Boolean).join(' · ') || ''} ⌄</span>
                </button> */}

                {/* {isAdvancedOpen && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <select
                      value={style}
                      onChange={(e) => {
                        setStyle(e.target.value);
                        onFieldChange('style', e.target.value);
                      }}
                      className="rounded-lg border border-gray-200 p-2 text-sm"
                    >
                      <option value="">그림체 선택 안 함</option>
                      <option value="cinematic">시네마틱</option>
                      <option value="anime">애니메이션</option>
                      <option value="realistic">실사</option>
                    </select>

                    <select
                      value={tone}
                      onChange={(e) => {
                        setTone(e.target.value);
                        onFieldChange('tone', e.target.value);
                      }}
                      className="rounded-lg border border-gray-200 p-2 text-sm"
                    >
                      <option value="">톤 선택 안 함</option>
                      <option value="dark">다크</option>
                      <option value="bright">밝음</option>
                      <option value="warm">따뜻함</option>
                    </select>

                    <select
                      value={aspectRatio}
                      onChange={(e) => {
                        setAspectRatio(e.target.value);
                        onFieldChange('aspectRatio', e.target.value);
                      }}
                      className="rounded-lg border border-gray-200 p-2 text-sm"
                    >
                      <option value="">화면비 선택 안 함</option>
                      <option value="16:9">16:9</option>
                      <option value="1:1">1:1</option>
                      <option value="9:16">9:16</option>
                    </select>

                    <select
                      value={era}
                      onChange={(e) => {
                        setEra(e.target.value);
                        onFieldChange('era', e.target.value);
                      }}
                      className="rounded-lg border border-gray-200 p-2 text-sm"
                    >
                      <option value="">시대 선택 안 함</option>
                      <option value="modern">현대</option>
                      <option value="past">과거</option>
                      <option value="future">미래</option>
                    </select>
                  </div>
                )} */}
              </div>
            )}
          </div>
        )}

        {/* 타입이 파일 업로드인 경우 */}
        {field.type === 'fileUpload' && (
          <div>
            <p className="mb-2 text-[11px] text-gray-500">
              {previews.length} / {field.maxFiles ?? 10} 업로드됨
            </p>

            {previews.length === 0 ? (
              // 이미지 추가 전: 드롭존 UI (클릭 또는 드래그로 추가)
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors ${isDragging ? 'border-purple-300 bg-[#1C1F2A]' : 'border-white-700 '}`}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#1C1F2A]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M16 5H22M19 2V8M21 11.5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H12.5M21 14.9999L17.914 11.9139C17.5389 11.539 17.0303 11.3284 16.5 11.3284C15.9697 11.3284 15.4611 11.539 15.086 11.9139L6 20.9999M11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z"
                      stroke="white"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-200">이미지를 끌어다 놓거나 클릭해서 추가</p>
                <p className="text-xs text-gray-500">캐릭터, 배경, 소품 등 · 최대 {field.maxFiles ?? 10}장</p>
              </div>
            ) : (
              // 이미지 추가 후: 그리드 UI (+ 버튼 또는 드래그로 추가)
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-wrap gap-2 rounded-lg p-1 transition-colors ${isDragging ? 'bg-[#1C1F2A]' : ''}`}
              >
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-neutral-700 bg-[#1C1F2A] text-lg text-gray-300">
                  +
                </button>
                {Array.from({ length: field.maxFiles ?? 10 }).map((_, i) =>
                  previews[i] ? (
                    <div key={i} className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-neutral-700 bg-[#1C1F2A]">
                      <img src={previews[i].url} alt={`참고 이미지 ${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div key={i} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-neutral-700 bg-[#1C1F2A]">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M21 14.9999L17.914 11.9139C17.5389 11.539 17.0303 11.3284 16.5 11.3284C15.9697 11.3284 15.4611 11.539 15.086 11.9139L6 20.9999M5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3ZM11 9C11 10.1046 10.1046 11 9 11C7.89543 11 7 10.1046 7 9C7 7.89543 7.89543 7 9 7C10.1046 7 11 7.89543 11 9Z"
                          stroke="white"
                        />
                      </svg>
                    </div>
                  )
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept={field.accept} multiple={(field.maxFiles ?? 1) > 1} onChange={handleFileChange} className="hidden" />
            <p className="mt-2 text-[11px] text-gray-500">이미지가 없어도 생성할 수 있어요! 텍스트만으로도 원하는 결과물을 만들어 드려요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

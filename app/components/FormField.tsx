'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { StoryBoardField } from '@/types/input';
import { imageModelField } from '@/app/data/storyboardFields';

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

  // 고급 옵션(이미지 생성 모델 선택) 펼침 여부 - genre 필드에서만 사용
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // // 고급설정 값들
  // const [style, setStyle] = useState(''); // 그림체(스타일)
  // const [tone, setTone] = useState(''); // 톤
  // const [aspectRatio, setAspectRatio] = useState(''); // 시대 배경
  // const [era, setEra] = useState(''); // 화면비

  // 최대 업로드 가능 장수, 꽉 찼는지 여부
  const maxFiles = field.type === 'fileUpload' ? (field.maxFiles ?? 10) : 10;
  const isFull = previews.length >= maxFiles;

  // 이미지 생성 모델 선택 값(기본값은 imageModelField.defaultValue) - genre 필드의 고급 옵션에서 사용
  const [selectedImageModel, setSelectedImageModel] = useState(imageModelField.defaultValue ?? imageModelField.options[0]?.value ?? '');

  // 마운트 시 기본 선택값을 부모(formValues)에도 반영
  useEffect(() => {
    if (field.id === 'genre' && selectedImageModel) {
      onFieldChange(imageModelField.id, selectedImageModel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 파일 목록을 받아 미리보기에 추가하는 공용 함수(input 선택 / 드래그앤드롭 공용)
  const addFiles = (fileList: FileList) => {
    // 이미 추가된 파일명은 제외
    const existingNames = previews.map((p) => p.file.name);
    // 같은 이름의 파일이 아니라면 새로운 파일로 추가
    const newFiles = Array.from(fileList).filter((file) => !existingNames.includes(file.name));
    // 남은 슬롯 수만큼만 받아들여서 최대 장수를 넘지 않도록 함
    const remainingSlots = maxFiles - previews.length;
    // slice(a, b) -> a ~ b까지 복사한 배열을 반환한다.
    const limitedFiles = newFiles.slice(0, remainingSlots);
    // URL.createObjectURL(file) -> 사용자가 고른 파일을 임시 URL로 변경하는 함수
    const newPreviews = limitedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    // 기존 미리보기 목록 뒤에 새로 고른 파일들을 이어붙임
    setPreviews((prev) => [...prev, ...newPreviews]);
    onFieldChange(field.id, [...previews.map((p) => p.file), ...limitedFiles]);
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
    if (isFull || !e.dataTransfer.files) return;
    addFiles(e.dataTransfer.files); // input 선택과 동일한 로직 재사용
  };

  // 미리보기에서 특정 이미지를 삭제하는 함수
  const removePreview = (index: number) => {
    // 더 이상 안 쓰는 임시 URL은 해제해서 메모리 낭비 방지
    URL.revokeObjectURL(previews[index].url);
    // 배열에서 지우고 싶은 index 하나만 빼고 새 배열 생성
    const next = previews.filter((_, i) => i !== index);
    // 새 배열 갱신
    setPreviews(next);
    // 필드 값 변경을 알려줌
    onFieldChange(
      field.id,
      next.map((p) => p.file)
    );
  };

  return (
    <div className="@container rounded-xl border border-neutral-700 bg-[#1A1A24] p-3">
      <div className="text-sm font-semibold text-gray-100">{field.label}</div>
      <div className="mt-1 text-xs text-gray-400">{field.description}</div>

      <div className="mt-2">
        {/* 타입이 시나리오인 경우 */}
        {field.type === 'textarea' && (
          <div className="relative">
            <textarea
              className="h-56 w-full resize-none rounded-lg border border-neutral-700 bg-[#1C1F2A] p-2 text-sm text-gray-100 placeholder:text-gray-500 scrollbar-thin [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent"
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
          <div className="flex flex-row flex-wrap gap-1">
            {field.options.map((opt, index) => (
              // 보이지 않는 껍데기로 감싸기
              <Fragment key={opt.value}>
                {/* 컨테이너 너비가 좁아지면 3번째 항목 뒤에서 강제로 줄바꿈(3개 + 2개) */}
                {index === 3 && <div className="hidden w-full @max-sm:block" />}
                <label className="cursor-pointer">
                  <input type="radio" name={field.id} value={opt.value} className="peer sr-only" onChange={() => onFieldChange(field.id, opt.value)} />
                  <span className="inline-block rounded-full border border-neutral-700 px-4 py-1 text-sm text-gray-300 peer-checked:bg-[#1A1A24] peer-checked:border-[#C255FF] peer-checked:font-semibold peer-checked:text-white">{opt.label}</span>
                </label>
              </Fragment>
            ))}

            {field.id === 'genre' && (
              <div className="mt-3 w-full border-t border-dashed border-neutral-700 pt-3">
                <button type="button" onClick={() => setIsAdvancedOpen((prev) => !prev)} className="flex w-full items-center justify-between text-sm text-gray-300">
                  <span className="pl-2 flex items-center gap-2 ">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M8.05922 3.44687C8.10513 2.96382 8.32949 2.51524 8.68847 2.18877C9.04744 1.8623 9.51524 1.6814 10.0005 1.6814C10.4857 1.6814 10.9535 1.8623 11.3125 2.18877C11.6714 2.51524 11.8958 2.96382 11.9417 3.44687C11.9693 3.75892 12.0717 4.05972 12.2402 4.32382C12.4086 4.58792 12.6383 4.80755 12.9096 4.9641C13.1809 5.12066 13.486 5.20954 13.799 5.22322C14.1119 5.23691 14.4236 5.17499 14.7075 5.04271C15.1485 4.84252 15.6481 4.81356 16.1092 4.96145C16.5703 5.10934 16.9599 5.4235 17.2021 5.84279C17.4444 6.26209 17.522 6.75652 17.4198 7.22985C17.3175 7.70318 17.0429 8.12155 16.6492 8.40354C16.3929 8.58341 16.1836 8.82238 16.0391 9.10023C15.8947 9.37808 15.8193 9.68663 15.8193 9.99979C15.8193 10.313 15.8947 10.6215 16.0391 10.8994C16.1836 11.1772 16.3929 11.4162 16.6492 11.596C17.0429 11.878 17.3175 12.2964 17.4198 12.7697C17.522 13.2431 17.4444 13.7375 17.2021 14.1568C16.9599 14.5761 16.5703 14.8902 16.1092 15.0381C15.6481 15.186 15.1485 15.1571 14.7075 14.9569C14.4236 14.8246 14.1119 14.7627 13.799 14.7764C13.486 14.79 13.1809 14.8789 12.9096 15.0355C12.6383 15.192 12.4086 15.4117 12.2402 15.6758C12.0717 15.9399 11.9693 16.2407 11.9417 16.5527C11.8958 17.0358 11.6714 17.4843 11.3125 17.8108C10.9535 18.1373 10.4857 18.3182 10.0005 18.3182C9.51524 18.3182 9.04744 18.1373 8.68847 17.8108C8.32949 17.4843 8.10513 17.0358 8.05922 16.5527C8.03167 16.2406 7.9293 15.9396 7.76077 15.6754C7.59224 15.4112 7.36253 15.1916 7.09108 15.035C6.81963 14.8784 6.51444 14.7896 6.20137 14.776C5.88829 14.7624 5.57655 14.8244 5.29255 14.9569C4.85162 15.1571 4.35199 15.186 3.89088 15.0381C3.42978 14.8902 3.04019 14.5761 2.79795 14.1568C2.55571 13.7375 2.47815 13.2431 2.58035 12.7697C2.68255 12.2964 2.95722 11.878 3.35088 11.596C3.60723 11.4162 3.81649 11.1772 3.96096 10.8994C4.10542 10.6215 4.18084 10.313 4.18084 9.99979C4.18084 9.68663 4.10542 9.37808 3.96096 9.10023C3.81649 8.82238 3.60723 8.58341 3.35088 8.40354C2.95777 8.12141 2.68359 7.7032 2.58163 7.23019C2.47968 6.75718 2.55722 6.26316 2.7992 5.84413C3.04118 5.42511 3.43031 5.11102 3.89096 4.96291C4.35161 4.81479 4.85087 4.84324 5.29172 5.04271C5.57568 5.17499 5.88734 5.23691 6.2003 5.22322C6.51326 5.20954 6.81833 5.12066 7.08966 4.9641C7.361 4.80755 7.59063 4.58792 7.7591 4.32382C7.92758 4.05972 8.02995 3.75892 8.05755 3.44687M12.5 10.0001C12.5 11.3808 11.3807 12.5001 10 12.5001C8.61929 12.5001 7.5 11.3808 7.5 10.0001C7.5 8.61937 8.61929 7.50008 10 7.50008C11.3807 7.50008 12.5 8.61937 12.5 10.0001Z"
                        stroke="white"
                      />
                    </svg>
                    고급설정
                  </span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isAdvancedOpen && (
                  <div className="mt-2">
                    <div className="mb-1 text-xs font-medium text-gray-300">{imageModelField.label}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {imageModelField.options.map((opt) => {
                        const isSelected = selectedImageModel === opt.value;
                        return (
                          <label key={opt.value} className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-2 transition-colors ${isSelected ? 'border-[#C255FF] bg-[#1A1A24]' : 'border-neutral-700'}`}>
                            <input
                              type="radio"
                              name={imageModelField.id}
                              value={opt.value}
                              checked={isSelected}
                              onChange={() => {
                                setSelectedImageModel(opt.value);
                                onFieldChange(imageModelField.id, opt.value);
                              }}
                              className="sr-only"
                            />
                            <div className="flex items-center gap-2">
                              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-[#C255FF]' : 'border-neutral-600'}`}>{isSelected && <span className="h-2 w-2 rounded-full bg-[#C255FF]" />}</span>
                              <span className="text-sm font-medium text-gray-100">{opt.label}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 타입이 파일 업로드인 경우 */}
        {field.type === 'fileUpload' && (
          <div>
            <p className="mb-2 text-[11px] text-gray-500">
              {previews.length} / {maxFiles} 업로드됨
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
                className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed p-2 text-center transition-colors ${isDragging ? 'border-purple-300 bg-[#1C1F2A]' : 'border-white-700 '}`}
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
                <p className="text-xs text-gray-500">캐릭터, 배경, 소품 등 · 최대 {maxFiles}장</p>
              </div>
            ) : (
              // 이미지 추가 후: 그리드 UI (+ 버튼 또는 드래그로 추가)
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isFull) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex flex-nowrap gap-2 overflow-x-auto rounded-lg p-1 pb-2 transition-colors scrollbar-thin [scrollbar-color:#3f3f46_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-700 [&::-webkit-scrollbar-track]:bg-transparent ${
                  isDragging ? 'bg-[#1C1F2A]' : ''
                }`}
              >
                <button type="button" onClick={() => !isFull && fileInputRef.current?.click()} disabled={isFull} className="flex h-18 w-18 shrink-0 items-center justify-center rounded-md border border-neutral-700 bg-[#1C1F2A] text-lg text-gray-300 disabled:cursor-not-allowed">
                  +
                </button>
                {previews.map((preview, i) => (
                  <div key={preview.url} className="group relative h-18 w-18 shrink-0 overflow-hidden rounded-md border border-neutral-700 bg-[#1C1F2A]">
                    <img src={preview.url} alt={`참고 이미지 ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removePreview(i)} className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
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

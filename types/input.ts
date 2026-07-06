// input 타입 정의
type FieldType = 'textarea' | 'select' | 'fileUpload';

interface BaseField {
  id: string; // 고유 id
  type: FieldType; // 필드 타입
  label: string; // 필드 제목
  description?: string; // 필드 설명
  required?: boolean; // 필드 필수 여부
}

// 시나리오 입력 필드
interface TextAreaField extends BaseField {
  type: 'textarea';
  placeholder?: string;
  maxLength?: number; // 최대 길이
}

// 장르 선택 필드
interface SelectOption {
  label: string;
  value: string;
}

interface SelectField extends BaseField {
  type: 'select';
  options: SelectOption[];
  multiple?: boolean; // 다중 선택
}

// 파일 업로드 필드
interface FileUploadField extends BaseField {
  type: 'fileUpload';
  accept?: string; // 확장자 제한 여부
  maxFiles?: number; // 파일 첨부 수
  maxSizeMB?: number; // 업로드 용량 제한용
}

export type StoryBoardField = TextAreaField | SelectField | FileUploadField;

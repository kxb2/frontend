// 캔버스 백엔드 API의 wire 타입 (OpenAPI 스펙 기준)

// 캔버스 요소 종류
export type CanvasElementType = 'image' | 'video' | 'memo' | 'section';

// 캔버스 저장 요청의 요소 하나 (PUT /canvases/{canvasId})
export interface CanvasElementIn {
  clientKey: string; // 클라이언트가 부여하는 안정적인 키(같은 아이템은 저장할 때마다 동일해야 함)
  type: CanvasElementType;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
  contentUrl?: string | null; // image/video의 실제 파일 주소
  thumbnailUrl?: string | null; // image/video의 썸네일 주소
  memoTitle?: string | null;
  memoContent?: string | null;
  memoColor?: string | null;
  storyboardId?: number | null;
  cutId?: number | null;
  parentClientKey?: string | null; // 소속 섹션의 clientKey
}

// 캔버스 조회 응답의 요소 하나 (GET /canvases/{canvasId})
export interface CanvasElementOut {
  id: number; // 서버가 부여한 요소 id
  clientKey: string | null; // 저장 시 보낸 clientKey가 그대로 돌아옴
  type: CanvasElementType;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  rotation: number | null;
  contentUrl: string | null;
  thumbnailUrl: string | null;
  memoTitle: string | null;
  memoContent: string | null;
  memoColor: string | null;
  storyboardId: number | null;
  cutId: number | null;
  parentElementId: number | null; // 소속 섹션의 서버 id
}

// 연결 저장 요청 (clientKey 기준)
export interface CanvasConnectionIn {
  fromClientKey: string;
  toClientKey: string;
}

// 연결 조회 응답 (서버 id 기준 -- 저장 때의 clientKey와 형태가 다름)
export interface CanvasConnectionOut {
  id: number;
  fromElementId: number;
  toElementId: number;
}

// 캔버스 생성 요청 (POST /canvases)
export interface CanvasCreateRequest {
  storyboardId?: number | null;
}

// 캔버스 생성 응답
export interface CanvasCreateResponse {
  canvasId: number;
  title: string | null;
}

// 캔버스 목록 항목 (GET /canvases)
export interface CanvasListItem {
  id: number;
  title: string | null;
  storyboardId: number | null;
  createdAt: string;
  updatedAt: string;
}

// 캔버스 상세 (GET /canvases/{canvasId}, PUT 응답도 동일 형태)
export interface CanvasDetailResponse {
  id: number;
  title: string | null;
  storyboardId: number | null;
  elements: CanvasElementOut[];
  connections: CanvasConnectionOut[];
  createdAt: string;
  updatedAt: string;
}

// 캔버스 저장 요청 (PUT /canvases/{canvasId}) -- 요소/연결 전체를 통째로 교체
export interface CanvasSaveRequest {
  storyboardId?: number | null;
  elements: CanvasElementIn[];
  connections: CanvasConnectionIn[];
}

// 첨부(이미지/영상) 업로드 응답 (POST /canvases/{canvasId}/attachments)
export interface CanvasAttachmentResponse {
  contentUrl: string;
  thumbnailUrl: string | null;
  type: CanvasElementType;
}

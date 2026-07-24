// 타입 가져오기
import {
  CanvasAttachmentResponse,
  CanvasCreateResponse,
  CanvasDetailResponse,
  CanvasListItem,
  CanvasSaveRequest,
} from '@/types/canvasApi';

// 실제 백엔드 서버 주소. .env.local의 NEXT_PUBLIC_API_URL을 읽고, 없으면 로컬 기본값 사용
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// 캔버스 생성 (POST {API_BASE_URL}/canvases)
export async function createCanvas(storyboardId?: number): Promise<CanvasCreateResponse> {
  const response = await fetch(`${API_BASE_URL}/canvases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyboardId: storyboardId ?? null }),
  });

  if (!response.ok) {
    throw new Error('캔버스 생성에 실패했습니다.');
  }

  return response.json();
}

// 캔버스 목록 조회 (GET {API_BASE_URL}/canvases)
export async function listCanvases(limit?: number): Promise<CanvasListItem[]> {
  const query = limit !== undefined ? `?limit=${limit}` : '';
  const response = await fetch(`${API_BASE_URL}/canvases${query}`);

  if (!response.ok) {
    throw new Error('캔버스 목록 조회에 실패했습니다.');
  }

  return response.json();
}

// 캔버스 상세 조회 (GET {API_BASE_URL}/canvases/{canvasId})
export async function getCanvas(canvasId: number): Promise<CanvasDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/canvases/${canvasId}`);

  if (!response.ok) {
    throw new Error('캔버스 조회에 실패했습니다.');
  }

  return response.json();
}

// 캔버스 저장 -- 요소/연결 전체 교체 (PUT {API_BASE_URL}/canvases/{canvasId})
export async function saveCanvas(canvasId: number, body: CanvasSaveRequest): Promise<CanvasDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/canvases/${canvasId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('캔버스 저장에 실패했습니다.');
  }

  return response.json();
}

// 캔버스 삭제 (DELETE {API_BASE_URL}/canvases/{canvasId})
export async function deleteCanvas(canvasId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/canvases/${canvasId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('캔버스 삭제에 실패했습니다.');
  }
}

// 이미지/영상 첨부 업로드 (POST {API_BASE_URL}/canvases/{canvasId}/attachments)
export async function uploadCanvasAttachment(canvasId: number, file: File, thumbnail?: File): Promise<CanvasAttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (thumbnail) formData.append('thumbnail', thumbnail);

  const response = await fetch(`${API_BASE_URL}/canvases/${canvasId}/attachments`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`첨부 파일 업로드에 실패했습니다. (${response.status}) ${detail}`);
  }

  return response.json();
}

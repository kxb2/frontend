// 캔버스별 마지막 화면 위치(팬)/확대 배율을 로컬에 기억해뒀다가 재접속 시 그대로 복원하는 데 씀
const PREFIX = 'kxb2-canvas-viewport-';

export interface SavedViewport {
  scale: number;
  x: number;
  y: number;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장 공간 초과 등은 무시
  }
}

export function loadLastViewport(canvasId: string): SavedViewport | null {
  const raw = safeGet(PREFIX + canvasId);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.scale === 'number' && typeof parsed.x === 'number' && typeof parsed.y === 'number') return parsed;
  } catch {
    // 손상된 값은 무시하고 기본 동작(자동 중앙 정렬)으로 대체
  }
  return null;
}

export function saveLastViewport(canvasId: string, viewport: SavedViewport) {
  safeSet(PREFIX + canvasId, JSON.stringify(viewport));
}

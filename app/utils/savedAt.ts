const PREFIX = 'kxb2-canvas-saved-at-';

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

export function loadLastSavedAt(canvasId: string): string | null {
  return safeGet(PREFIX + canvasId);
}

export function saveLastSavedAt(canvasId: string, iso: string) {
  safeSet(PREFIX + canvasId, iso);
}

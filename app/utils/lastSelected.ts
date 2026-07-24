// 라이브러리의 selected UI를 위해 각 화면(캔버스/스토리보드)이 "마지막으로 선택/보던 것"을 기록해두는 곳
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 저장 공간 초과 등은 무시
  }
}

const LAST_ACTIVE_CANVAS_KEY = 'kxb2-canvas-last-active-id';
export const loadLastActiveCanvasId = () => safeGet(LAST_ACTIVE_CANVAS_KEY);
export const saveLastActiveCanvasId = (id: string) => safeSet(LAST_ACTIVE_CANVAS_KEY, id);

const LAST_VIEWED_STORYBOARD_KEY = 'kxb2-storyboard-last-viewed-id';
export const loadLastViewedStoryboardId = () => safeGet(LAST_VIEWED_STORYBOARD_KEY);
export const saveLastViewedStoryboardId = (id: string | null) => safeSet(LAST_VIEWED_STORYBOARD_KEY, id);

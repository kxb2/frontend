// 라이브러리와 페이지는 서로 다른 React 트리라 상태 공유가 안 돼서, 이름 변경을 이 이벤트로 전달
const CANVAS_RENAMED_EVENT = 'canvas:renamed';
const STORYBOARD_RENAMED_EVENT = 'storyboard:renamed';

export interface RenamedDetail {
  id: string;
  title: string;
}

export function emitCanvasRenamed(id: string, title: string) {
  window.dispatchEvent(new CustomEvent<RenamedDetail>(CANVAS_RENAMED_EVENT, { detail: { id, title } }));
}

export function emitStoryboardRenamed(id: string, title: string) {
  window.dispatchEvent(new CustomEvent<RenamedDetail>(STORYBOARD_RENAMED_EVENT, { detail: { id, title } }));
}

export function onCanvasRenamed(handler: (detail: RenamedDetail) => void) {
  function listener(e: Event) {
    handler((e as CustomEvent<RenamedDetail>).detail);
  }
  window.addEventListener(CANVAS_RENAMED_EVENT, listener);
  return () => window.removeEventListener(CANVAS_RENAMED_EVENT, listener);
}

export function onStoryboardRenamed(handler: (detail: RenamedDetail) => void) {
  function listener(e: Event) {
    handler((e as CustomEvent<RenamedDetail>).detail);
  }
  window.addEventListener(STORYBOARD_RENAMED_EVENT, listener);
  return () => window.removeEventListener(STORYBOARD_RENAMED_EVENT, listener);
}

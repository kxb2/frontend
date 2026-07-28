import { useEffect, useRef, useState, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem } from '@/types/canvas';
import { getItemDisplaySize } from '@/app/canvas/_components/core/utils';
import { loadLastViewport, saveLastViewport } from '@/app/utils/lastViewport';

const VIEWPORT_SAVE_DEBOUNCE_MS = 500;

interface UseViewportParams {
  rootRef: RefObject<HTMLDivElement | null>;
  gridRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<Konva.Stage | null>;
  items: CanvasItem[]; // 최초 진입 시 뷰포트를 중앙 정렬(저장된 마지막 화면이 없을 때만 사용)
  canvasId: string; // 마지막 화면 위치/배율을 캔버스별로 구분해서 기억하는 데 사용
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const WHEEL_SCALE_STEP = 1.05;

// 콘텐츠 전체를 감싸는 바운딩 박스(문서 좌표)
function computeContentBounds(items: CanvasItem[]) {
  if (items.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  items.forEach((item) => {
    const { width, height } = getItemDisplaySize(item);
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + width);
    maxY = Math.max(maxY, item.y + height);
  });
  return { minX, minY, maxX, maxY };
}

// Stage의 팬/줌 상태(scale, stagePos)와 그 계산에 필요한 헬퍼(휠 줌, 화면→논리 좌표 변환)를 관리
export function useViewport({ rootRef, gridRef, stageRef, items, canvasId }: UseViewportParams) {
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(0.8);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const hasCenteredRef = useRef(false);

  // 실제 배치되는 컨테이너 박스 크기를 측정
  useEffect(() => {
    function updateSize() {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });

      if (!hasCenteredRef.current && rect.width > 0 && rect.height > 0) {
        hasCenteredRef.current = true;
        // 마지막으로 저장해둔 화면 위치/배율이 있으면 그걸 그대로 복원, 없으면(최초 진입) 콘텐츠 중앙 정렬
        const saved = loadLastViewport(canvasId);
        if (saved) {
          setScale(saved.scale);
          setStagePos({ x: saved.x, y: saved.y });
          return;
        }
        const bounds = computeContentBounds(items);
        const contentCenter = bounds ? { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 } : { x: 0, y: 0 };
        setStagePos({ x: rect.width / 2 - contentCenter.x * scale, y: rect.height / 2 - contentCenter.y * scale });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 중앙 정렬/복원은 최초 1회만(hasCenteredRef로 가드), items/scale 변화에 재실행 불필요
  }, [rootRef]);

  // 그리드는 줌 영향 안 받는 별도 레이어에 그리고 배율/위치만 동기화
  useEffect(() => {
    if (!gridRef.current) return;
    gridRef.current.style.backgroundSize = `${64 * scale}px ${64 * scale}px`;
    gridRef.current.style.backgroundPosition = `${stagePos.x}px ${stagePos.y}px`;
  }, [gridRef, scale, stagePos]);

  // 화면 위치/배율이 바뀌면 디바운스 후 기억, 최초 복원/중앙정렬이 끝나기 전엔 아직 확정 안 된 기본값이라 저장하지 않음
  useEffect(() => {
    if (!hasCenteredRef.current) return;
    const timeout = setTimeout(() => {
      saveLastViewport(canvasId, { scale, x: stagePos.x, y: stagePos.y });
    }, VIEWPORT_SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [scale, stagePos, canvasId]);

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    // Ctrl/Cmd+휠일 때만 확대/축소, 그 외엔 팬(Shift 누르면 세로 휠 입력을 가로 이동)
    if (!(e.evt.ctrlKey || e.evt.metaKey)) {
      const shiftRedirect = e.evt.shiftKey && e.evt.deltaX === 0;
      const dx = shiftRedirect ? e.evt.deltaY : e.evt.deltaX;
      const dy = shiftRedirect ? 0 : e.evt.deltaY;
      setStagePos((prev) => ({ x: prev.x - dx, y: prev.y - dy }));
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const oldScale = scale;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, e.evt.deltaY < 0 ? oldScale * WHEEL_SCALE_STEP : oldScale / WHEEL_SCALE_STEP));
    const mousePointTo = { x: (pointer.x - stagePos.x) / oldScale, y: (pointer.y - stagePos.y) / oldScale };
    setScale(newScale);
    setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
  }

  function screenToLogical(clientX: number, clientY: number) {
    const rect = stageRef.current!.container().getBoundingClientRect();
    return { x: (clientX - rect.left - stagePos.x) / scale, y: (clientY - rect.top - stagePos.y) / scale };
  }

  return { size, scale, stagePos, setStagePos, handleWheel, screenToLogical };
}

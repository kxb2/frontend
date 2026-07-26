import { useEffect, useState, type RefObject } from 'react';
import type Konva from 'konva';

interface UseViewportParams {
  rootRef: RefObject<HTMLDivElement | null>;
  gridRef: RefObject<HTMLDivElement | null>;
  stageRef: RefObject<Konva.Stage | null>;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const WHEEL_SCALE_STEP = 1.05;

// Stage의 팬/줌 상태(scale, stagePos)와 그 계산에 필요한 헬퍼(휠 줌, 화면→논리 좌표 변환)를 관리
export function useViewport({ rootRef, gridRef, stageRef }: UseViewportParams) {
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // 실제 배치되는 컨테이너 박스 크기를 측정
  useEffect(() => {
    function updateSize() {
      if (!rootRef.current) return;
      const rect = rootRef.current.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [rootRef]);

  // 그리드는 줌 영향 안 받는 별도 레이어에 그리고 배율/위치만 동기화
  useEffect(() => {
    if (!gridRef.current) return;
    gridRef.current.style.backgroundSize = `${64 * scale}px ${64 * scale}px`;
    gridRef.current.style.backgroundPosition = `${stagePos.x}px ${stagePos.y}px`;
  }, [gridRef, scale, stagePos]);

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
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

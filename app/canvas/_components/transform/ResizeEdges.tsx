import type Konva from 'konva';
import { Rect } from 'react-konva';

const EDGE_INSET = 16;
const EDGE_THICKNESS = 10;

interface ResizeEdgesProps {
  width: number;
  height: number;
  onEdgeMouseDown: (edge: 'left' | 'right' | 'top' | 'bottom', e: Konva.KonvaEventObject<MouseEvent>) => void;
  showVertical?: boolean; // 메모 접힘 모드처럼 세로 조절이 없는 경우 false
}

// 변 자체를 드래그하는 컨트롤 (꼭짓점 컨트롤은 Overlay가 담당, 메모/섹션/미디어가 공유)
export function ResizeEdges({ width, height, onEdgeMouseDown, showVertical = true }: ResizeEdgesProps) {
  function setResizeCursor(cursor: string) {
    return (e: Konva.KonvaEventObject<MouseEvent>) => {
      const container = e.target.getStage()?.container();
      if (container) container.style.cursor = cursor;
    };
  }
  const clearCursor = setResizeCursor('');

  return (
    <>
      <Rect x={0} y={EDGE_INSET} width={EDGE_THICKNESS} height={Math.max(0, height - EDGE_INSET * 2)} fill="transparent" onMouseDown={(e) => onEdgeMouseDown('left', e)} onMouseEnter={setResizeCursor('ew-resize')} onMouseLeave={clearCursor} />
      <Rect x={width - EDGE_THICKNESS} y={EDGE_INSET} width={EDGE_THICKNESS} height={Math.max(0, height - EDGE_INSET * 2)} fill="transparent" onMouseDown={(e) => onEdgeMouseDown('right', e)} onMouseEnter={setResizeCursor('ew-resize')} onMouseLeave={clearCursor} />
      {showVertical && (
        <>
          <Rect x={EDGE_INSET} y={0} width={Math.max(0, width - EDGE_INSET * 2)} height={EDGE_THICKNESS} fill="transparent" onMouseDown={(e) => onEdgeMouseDown('top', e)} onMouseEnter={setResizeCursor('ns-resize')} onMouseLeave={clearCursor} />
          <Rect x={EDGE_INSET} y={height - EDGE_THICKNESS} width={Math.max(0, width - EDGE_INSET * 2)} height={EDGE_THICKNESS} fill="transparent" onMouseDown={(e) => onEdgeMouseDown('bottom', e)} onMouseEnter={setResizeCursor('ns-resize')} onMouseLeave={clearCursor} />
        </>
      )}
    </>
  );
}

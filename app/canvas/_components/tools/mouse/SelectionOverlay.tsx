import type { RefObject } from 'react';
import type Konva from 'konva';
import { Rect, Transformer } from 'react-konva';
import { CORNER_ANCHORS, CORNER_ZONE_PIVOT, ROTATE_CURSOR, type CornerAnchor } from '@/app/canvas/_components/tools/mouse/useRotateZones';
import type { MemoCornerConfig } from '@/app/canvas/_components/tools/memo/useMemoResizeAnchors';
import { isSelectTool, type Tool } from '@/app/canvas/_components/toolbar';

interface SelectionOverlayProps {
  tool: Tool;
  selectedIds: Set<string>;
  scale: number;
  transformerRef: RefObject<Konva.Transformer | null>;
  registerRotateZone: (corner: CornerAnchor, node: Konva.Rect | null) => void;
  onRotateZonePointerDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  disableCornerAnchors?: boolean; // 메모 단독 선택 시에는 자체 컨트롤만 사용
  memoCornerConfig?: MemoCornerConfig; // 메모 자체 컨트롤 사용
  registerResizeAnchor?: (corner: CornerAnchor, node: Konva.Rect | null) => void;
  onResizeAnchorMouseDown?: (corner: CornerAnchor, e: Konva.KonvaEventObject<MouseEvent>) => void;
  registerBorderNode?: (node: Konva.Rect | null) => void; // 메모 자체 테두리
}

// 선택된 요소/요소 그룹 꼭짓점에서의 회전 가능 영역
export default function SelectionOverlay({
  tool,
  selectedIds,
  scale,
  transformerRef,
  registerRotateZone,
  onRotateZonePointerDown,
  disableCornerAnchors,
  memoCornerConfig,
  registerResizeAnchor,
  onResizeAnchorMouseDown,
  registerBorderNode,
}: SelectionOverlayProps) {
  return (
    <>
      {CORNER_ANCHORS.map((corner) => (
        <Rect
          key={corner}
          name={`rotate-zone-${corner}`}
          ref={(node) => registerRotateZone(corner, node)}
          width={40}
          height={40}
          offsetX={CORNER_ZONE_PIVOT[corner].x}
          offsetY={CORNER_ZONE_PIVOT[corner].y}
          scaleX={1 / scale}
          scaleY={1 / scale}
          fill="rgba(0,0,0,0.001)"
          visible={isSelectTool(tool) && selectedIds.size > 0}
          onMouseDown={onRotateZonePointerDown}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = ROTATE_CURSOR;
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = '';
          }}
        />
      ))}
      <Transformer
        ref={transformerRef}
        enabledAnchors={disableCornerAnchors ? [] : [...CORNER_ANCHORS]}
        rotateEnabled={false}
        keepRatio
        borderEnabled={!disableCornerAnchors}
        borderStroke="#c255ff"
        borderStrokeWidth={2}
        anchorStroke="#c255ff"
        anchorStrokeWidth={2}
        anchorFill="#fff"
        anchorSize={10}
        anchorCornerRadius={5}
      />
      {registerBorderNode && (
        <Rect ref={registerBorderNode} stroke="#c255ff" strokeWidth={2} fill="transparent" listening={false} visible={false} />
      )}
      {registerResizeAnchor &&
        onResizeAnchorMouseDown &&
        CORNER_ANCHORS.map((corner) => (
          <Rect
            key={`resize-anchor-${corner}`}
            ref={(node) => registerResizeAnchor(corner, node)}
            width={10}
            height={10}
            offsetX={5}
            offsetY={5}
            scaleX={1 / scale}
            scaleY={1 / scale}
            cornerRadius={5}
            fill="#fff"
            stroke="#c255ff"
            strokeWidth={2}
            visible={!!memoCornerConfig?.[corner]}
            onMouseDown={(e) => onResizeAnchorMouseDown(corner, e)}
            onMouseEnter={(e) => {
              const cursor = memoCornerConfig?.[corner]?.cursor;
              const container = e.target.getStage()?.container();
              if (container && cursor) container.style.cursor = cursor;
            }}
            onMouseLeave={(e) => {
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = '';
            }}
          />
        ))}
    </>
  );
}

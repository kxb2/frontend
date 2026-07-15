import type { RefObject } from 'react';
import type Konva from 'konva';
import { Rect, Transformer } from 'react-konva';
import { CORNER_ANCHORS, CORNER_ZONE_PIVOT, ROTATE_CURSOR, type CornerAnchor } from '@/app/canvas/_components/tools/mouse/useRotateZones';
import { isSelectTool, type Tool } from '@/app/canvas/_components/toolbar';

interface SelectionOverlayProps {
  tool: Tool;
  selectedIds: Set<string>;
  scale: number;
  transformerRef: RefObject<Konva.Transformer | null>;
  registerRotateZone: (corner: CornerAnchor, node: Konva.Rect | null) => void;
  onRotateZonePointerDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

// 선택된 요소/요소 그룹 꼭짓점에서의 회전 가능 영역
export default function SelectionOverlay({ tool, selectedIds, scale, transformerRef, registerRotateZone, onRotateZonePointerDown }: SelectionOverlayProps) {
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
        enabledAnchors={[...CORNER_ANCHORS]}
        rotateEnabled={false}
        keepRatio
        borderStroke="#c255ff"
        borderStrokeWidth={2}
        anchorStroke="#c255ff"
        anchorStrokeWidth={2}
        anchorFill="#fff"
        anchorSize={10}
        anchorCornerRadius={5}
      />
    </>
  );
}

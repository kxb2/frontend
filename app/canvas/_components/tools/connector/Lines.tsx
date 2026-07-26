import { Fragment, type RefObject } from 'react';
import type Konva from 'konva';
import { Circle, Line } from 'react-konva';
import type { Connector } from '@/types/canvas';
import type { Tool } from '@/app/canvas/_components/core/Toolbar';
import { getConnectorAnchors, getConnectorCurvePoints } from '@/app/canvas/_components/tools/connector/curve';

const CONNECTOR_COLOR = '#BFC7D6';
const CONNECTOR_SELECTED_COLOR = '#fff';
const CONNECTOR_DOT_RADIUS = 4;

interface LinesProps {
  connectors: Connector[];
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  selectedConnectorId: string | null;
  tool: Tool;
  registerLine: (id: string, node: Konva.Line | null) => void;
  registerDot: (id: string, end: 'from' | 'to', node: Konva.Circle | null) => void;
  onConnectorClick: (e: Konva.KonvaEventObject<MouseEvent>, connectorId: string) => void;
  previewLineRef: RefObject<Konva.Line | null>;
}

// 커넥터 (좌표 없이 {id,fromId,toId}만 저장하고 항상 두 노드의 현재 위치에서 다시 계산)
export default function Lines({ connectors, nodeMapRef, selectedConnectorId, tool, registerLine, registerDot, onConnectorClick, previewLineRef }: LinesProps) {
  return (
    <>
      {/* eslint-disable-next-line react-hooks/refs -- 의도적: 매 렌더 최신 좌표를 직접 읽어야 한다 */}
      {connectors.map((connector) => {
        const fromNode = nodeMapRef.current.get(connector.fromId);
        const toNode = nodeMapRef.current.get(connector.toId);
        const anchors = fromNode && toNode ? getConnectorAnchors(fromNode, toNode) : undefined;
        const from = anchors?.from ?? { x: 0, y: 0 };
        const to = anchors?.to ?? { x: 0, y: 0 };
        const isSelected = selectedConnectorId === connector.id;
        const color = isSelected ? CONNECTOR_SELECTED_COLOR : CONNECTOR_COLOR;
        return (
          <Fragment key={connector.id}>
            <Line
              ref={(node) => registerLine(connector.id, node)}
              points={anchors ? getConnectorCurvePoints(anchors.from, anchors.to) : [0, 0, 0, 0, 0, 0, 0, 0]}
              bezier
              stroke={color}
              strokeWidth={isSelected ? 3 : 2}
              hitStrokeWidth={16}
              listening={tool === 'mouse'}
              onMouseDown={(e) => onConnectorClick(e, connector.id)}
            />
            <Circle ref={(node) => registerDot(connector.id, 'from', node)} x={from.x} y={from.y} radius={CONNECTOR_DOT_RADIUS} fill={color} listening={false} />
            <Circle ref={(node) => registerDot(connector.id, 'to', node)} x={to.x} y={to.y} radius={CONNECTOR_DOT_RADIUS} fill={color} listening={false} />
          </Fragment>
        );
      })}
      <Line ref={previewLineRef} points={[0, 0, 0, 0, 0, 0, 0, 0]} bezier stroke={CONNECTOR_COLOR} strokeWidth={2} dash={[4, 4]} visible={false} listening={false} />
    </>
  );
}

import { Fragment, type RefObject } from 'react';
import type Konva from 'konva';
import { Circle } from 'react-konva';
import type { Connector } from '@/types/canvas';
import { getConnectorAnchors } from '@/app/canvas/_components/tools/connector/connectorCurve';

interface ReconnectHandlesProps {
  connectors: Connector[];
  selectedConnectorId: string | null;
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  scale: number;
  onReconnectHandleDown: (e: Konva.KonvaEventObject<MouseEvent>, connectorId: string, end: 'from' | 'to') => void;
}

// 선택된 커넥터 양쪽 끝의 재연결 핸들
export default function ReconnectHandles({ connectors, selectedConnectorId, nodeMapRef, scale, onReconnectHandleDown }: ReconnectHandlesProps) {
  const selectedConnector = connectors.find((c) => c.id === selectedConnectorId);
  if (!selectedConnector) return null;
  // eslint-disable-next-line react-hooks/refs -- 의도적: 매 렌더 최신 좌표를 직접 읽어야 한다
  const fromNode = nodeMapRef.current.get(selectedConnector.fromId);
  // eslint-disable-next-line react-hooks/refs
  const toNode = nodeMapRef.current.get(selectedConnector.toId);
  if (!fromNode || !toNode) return null;
  const { from, to } = getConnectorAnchors(fromNode, toNode);
  return (
    <Fragment>
      <Circle
        x={from.x}
        y={from.y}
        radius={7}
        scaleX={1 / scale}
        scaleY={1 / scale}
        fill="#fff"
        stroke="#c255ff"
        strokeWidth={2}
        onMouseDown={(e) => onReconnectHandleDown(e, selectedConnector.id, 'from')}
      />
      <Circle
        x={to.x}
        y={to.y}
        radius={7}
        scaleX={1 / scale}
        scaleY={1 / scale}
        fill="#fff"
        stroke="#c255ff"
        strokeWidth={2}
        onMouseDown={(e) => onReconnectHandleDown(e, selectedConnector.id, 'to')}
      />
    </Fragment>
  );
}

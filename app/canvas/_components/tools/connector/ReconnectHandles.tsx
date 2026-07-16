import { Fragment, type RefObject } from 'react';
import type Konva from 'konva';
import { Circle } from 'react-konva';
import type { Connector } from '@/types/canvas';

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
  return (
    <Fragment>
      <Circle
        x={fromNode.x()}
        y={fromNode.y()}
        radius={7}
        scaleX={1 / scale}
        scaleY={1 / scale}
        fill="#fff"
        stroke="#c255ff"
        strokeWidth={2}
        onMouseDown={(e) => onReconnectHandleDown(e, selectedConnector.id, 'from')}
      />
      <Circle
        x={toNode.x()}
        y={toNode.y()}
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

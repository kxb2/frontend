import type { RefObject } from 'react';
import type Konva from 'konva';
import { Arrow } from 'react-konva';
import type { Connector } from '@/types/canvas';
import type { Tool } from '@/app/canvas/_components/toolbar';

interface ConnectorLinesProps {
  connectors: Connector[];
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  selectedConnectorId: string | null;
  tool: Tool;
  registerLine: (id: string, node: Konva.Arrow | null) => void;
  onConnectorClick: (e: Konva.KonvaEventObject<MouseEvent>, connectorId: string) => void;
  previewLineRef: RefObject<Konva.Arrow | null>;
}

// 커넥터 (좌표 없이 {id,fromId,toId}만 저장하고 항상 두 노드의 현재 위치에서 다시 계산)
export default function ConnectorLines({ connectors, nodeMapRef, selectedConnectorId, tool, registerLine, onConnectorClick, previewLineRef }: ConnectorLinesProps) {
  return (
    <>
      {/* eslint-disable-next-line react-hooks/refs -- 의도적: 매 렌더 최신 좌표를 직접 읽어야 한다 */}
      {connectors.map((connector) => {
        const fromNode = nodeMapRef.current.get(connector.fromId);
        const toNode = nodeMapRef.current.get(connector.toId);
        const points = fromNode && toNode ? [fromNode.x(), fromNode.y(), toNode.x(), toNode.y()] : [0, 0, 0, 0];
        const isSelected = selectedConnectorId === connector.id;
        return (
          <Arrow
            key={connector.id}
            ref={(node) => registerLine(connector.id, node)}
            points={points}
            stroke={isSelected ? '#fff' : '#c255ff'}
            fill={isSelected ? '#fff' : '#c255ff'}
            strokeWidth={isSelected ? 3 : 2}
            hitStrokeWidth={16}
            listening={tool === 'mouse'}
            onMouseDown={(e) => onConnectorClick(e, connector.id)}
          />
        );
      })}
      <Arrow ref={previewLineRef} points={[0, 0, 0, 0]} stroke="#c255ff" strokeWidth={2} dash={[4, 4]} visible={false} listening={false} />
    </>
  );
}

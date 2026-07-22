import type Konva from 'konva';
import { rotateAround } from '@/app/canvas/_components/canvasUtils';

type Side = 'top' | 'bottom' | 'left' | 'right';

export interface ConnectorAnchor {
  x: number;
  y: number;
  horizontalTangent: boolean; // true = 좌/우 변(수평 접선), false = 상/하 변(수직 접선)
}

function isHorizontalSide(side: Side) {
  return side === 'left' || side === 'right';
}

// 노드의 실제 렌더 크기 기준 4변 중앙 (회전 반영)
function getNodeSideAnchors(node: Konva.Group): Record<Side, ConnectorAnchor> {
  const centerX = node.x();
  const centerY = node.y();
  const halfWidth = (node.width() * node.scaleX()) / 2;
  const halfHeight = (node.height() * node.scaleY()) / 2;
  const rotation = node.rotation();
  const local: Record<Side, { x: number; y: number }> = {
    top: { x: centerX, y: centerY - halfHeight },
    bottom: { x: centerX, y: centerY + halfHeight },
    left: { x: centerX - halfWidth, y: centerY },
    right: { x: centerX + halfWidth, y: centerY },
  };
  const result = {} as Record<Side, ConnectorAnchor>;
  (Object.keys(local) as Side[]).forEach((side) => {
    const p = rotateAround(local[side].x, local[side].y, centerX, centerY, rotation);
    result[side] = { x: p.x, y: p.y, horizontalTangent: isHorizontalSide(side) };
  });
  return result;
}

// 노드 중심에서 목표점 방향으로 상/하/좌/우 중 한 변을 선택 (커넥터 미리보기·재연결 드래그처럼 상대편이 노드가 아니라 커서일 때 사용)
export function getNodeAnchorTowardPoint(node: Konva.Group, towardX: number, towardY: number): ConnectorAnchor {
  const centerX = node.x();
  const centerY = node.y();
  const local = rotateAround(towardX, towardY, centerX, centerY, -node.rotation());
  const dx = local.x - centerX;
  const dy = local.y - centerY;
  const side: Side = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : dy >= 0 ? 'bottom' : 'top';
  return getNodeSideAnchors(node)[side];
}

// 두 노드의 4변 중앙 중 유클리드 거리가 가장 가까운 한 쌍을 선택
export function getConnectorAnchors(fromNode: Konva.Group, toNode: Konva.Group): { from: ConnectorAnchor; to: ConnectorAnchor } {
  const fromSides = getNodeSideAnchors(fromNode);
  const toSides = getNodeSideAnchors(toNode);
  const sides: Side[] = ['top', 'bottom', 'left', 'right'];
  let best: { from: ConnectorAnchor; to: ConnectorAnchor } | undefined;
  let bestDist = Infinity;
  sides.forEach((fromSide) => {
    sides.forEach((toSide) => {
      const from = fromSides[fromSide];
      const to = toSides[toSide];
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = { from, to };
      }
    });
  });
  return best!;
}

// 커넥터 곡선 계산: 좌/우 변은 수평 접선, 상/하 변은 수직 접선으로 빠져나가도록 제어점을 잡음
export function getConnectorCurvePoints(from: ConnectorAnchor, to: ConnectorAnchor): number[] {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const c1 = from.horizontalTangent ? { x: midX, y: from.y } : { x: from.x, y: midY };
  const c2 = to.horizontalTangent ? { x: midX, y: to.y } : { x: to.x, y: midY };
  return [from.x, from.y, c1.x, c1.y, c2.x, c2.y, to.x, to.y];
}

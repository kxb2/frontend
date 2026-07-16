import { useEffect, type RefObject } from 'react';
import type Konva from 'konva';
import type { CanvasItem, CommentCanvasItem } from '@/types/canvas';
import { COMMENT_PIN_SIZE } from '@/app/canvas/_components/canvasItem';
import { rotateAround } from '@/app/canvas/_components/canvasUtils';
import type { Tool } from '@/app/canvas/_components/toolbar';

const COMMENT_ANCHOR_MARGIN = 8;
const COMMENT_STACK_GAP = 6;

interface UseCommentPinsParams {
  tool: Tool;
  items: CanvasItem[];
  nodeMapRef: RefObject<Map<string, Konva.Group>>;
  onAddCommentItem: (targetId: string) => string;
  onToolChange: (tool: Tool) => void;
  startEditing: (id: string) => void;
}

// 동일 대상의 댓글들을 id순으로 정렬해서 반환
function getCommentSiblings(items: CanvasItem[], targetId: string) {
  return items.filter((it): it is CommentCanvasItem => it.type === 'comment' && it.targetId === targetId).sort((a, b) => a.id.localeCompare(b.id));
}

// 댓글 핀 위치 고정 (대상 스케일 변경 시 offsetX/Y에 scaleX/Y를 곱함)
function getCommentAnchor(targetNode: Konva.Group, stackIndex: number) {
  return rotateAround(
    targetNode.x() + targetNode.offsetX() * targetNode.scaleX() + COMMENT_ANCHOR_MARGIN - stackIndex * (COMMENT_PIN_SIZE + COMMENT_STACK_GAP),
    targetNode.y() - targetNode.offsetY() * targetNode.scaleY() - COMMENT_ANCHOR_MARGIN,
    targetNode.x(),
    targetNode.y(),
    targetNode.rotation(),
  );
}

export function useCommentPins({ tool, items, nodeMapRef, onAddCommentItem, onToolChange, startEditing }: UseCommentPinsParams) {
  // 동일 대상의 댓글들을 대상 드래그/회전/스케일 시 실시간으로 같이 옮김
  function syncDependentComments(targetId: string) {
    const targetNode = nodeMapRef.current.get(targetId);
    if (!targetNode) return;
    getCommentSiblings(items, targetId).forEach((comment, stackIndex) => {
      const anchor = getCommentAnchor(targetNode, stackIndex);
      const commentNode = nodeMapRef.current.get(comment.id);
      commentNode?.position(anchor);
      commentNode?.visible(true);
    });
  }

  // 댓글 대상이 이동할 때마다 댓글 핀 위치를 실시간으로 업데이트
  useEffect(() => {
    const targetIds = new Set(items.filter((it) => it.type === 'comment').map((it) => it.targetId));
    targetIds.forEach((targetId) => syncDependentComments(targetId));
  });

  // 댓글 핀 위치를 대상 아이템 기준으로 계산해서 반환
  function resolveItemForRender(item: CanvasItem): CanvasItem {
    if (item.type !== 'comment') return item;
    const targetNode = nodeMapRef.current.get(item.targetId);
    if (!targetNode) return item;
    const stackIndex = getCommentSiblings(items, item.targetId).findIndex((c) => c.id === item.id);
    const anchor = getCommentAnchor(targetNode, stackIndex);
    return { ...item, x: anchor.x - COMMENT_PIN_SIZE / 2, y: anchor.y - COMMENT_PIN_SIZE / 2, rotate: 0 };
  }

  // 댓글 대상 클릭 시 댓글 추가 후 바로 편집 모드로 전환
  function handleCommentTargetClick(e: Konva.KonvaEventObject<MouseEvent>, targetItem: CanvasItem) {
    if (tool !== 'comment') return;
    e.cancelBubble = true;
    const id = onAddCommentItem(targetItem.id);
    startEditing(id);
    onToolChange('mouse');
  }

  return { resolveItemForRender, syncDependentComments, handleCommentTargetClick };
}

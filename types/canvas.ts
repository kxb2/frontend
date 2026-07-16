// output_canvas 타입 정의

import type { Tool } from '@/app/canvas/_components/toolbar';

interface CanvasItemBase {
  id: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  // Figma의 Group(Cmd+G)과 동일한 개념 -- 섹션 도구로 확정한 그룹.
  groupId?: string;
}

export interface MediaCanvasItem extends CanvasItemBase {
  type: 'image' | 'video';
  src: string;
}

export interface TextCanvasItem extends CanvasItemBase {
  type: 'text';
  text: string;
}

export interface CommentCanvasItem extends CanvasItemBase {
  type: 'comment';
  text: string;
  // 반드시 다른 아이템을 클릭해서 만든다 -- 그 대상의 id(대상 삭제 시 댓글도 함께 정리).
  targetId: string;
  // x/y/rotate/scale은 타입 호환을 위해 남아있을 뿐 쓰이지 않는다 -- 댓글은 항상 대상 모서리에
  // 고정된 위치로만 나타난다.
}

export type CanvasItem = MediaCanvasItem | TextCanvasItem | CommentCanvasItem;

export interface SelectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// 두 아이템의 중심을 잇는 연결선. 좌표를 직접 갖지 않고 아이템 id만 참조해서, 아이템이 움직이면
// 항상 최신 위치를 따라가도록 렌더링 시점에 계산한다.
export interface Connector {
  id: string;
  fromId: string;
  toId: string;
}

export interface CanvasProps {
  tool: Tool;
  items: CanvasItem[];
  connectors: Connector[];
  onDropFiles: (files: FileList, x: number, y: number) => void;
  onUpdateItems: (patches: Array<Pick<CanvasItem, 'id' | 'x' | 'y' | 'rotate' | 'scale'>>) => void;
  onBringToFront: (ids: string[]) => void;
  onDeleteItems: (ids: string[]) => void;
  onAddConnector: (fromId: string, toId: string) => void;
  onDeleteConnector: (id: string) => void;
  onReconnectConnector: (id: string, end: 'from' | 'to', newNodeId: string) => void;
  onAddTextItem: (x: number, y: number) => string;
  onAddCommentItem: (targetId: string) => string;
  // 섹션 도구로 확정한 아이템 id 목록의 그룹 소속을 설정한다 -- 2개 이상이면 새 그룹으로 묶고,
  // 1개면 그 아이템만 자신이 속한 그룹에서 탈퇴시킨다(page.tsx가 세부 규칙을 담당).
  onSetGroup: (ids: string[]) => void;
  onEditItemText: (id: string, text: string) => void;
  onToolChange: (tool: Tool) => void;
}

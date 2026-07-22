// output_canvas 타입 정의

import type { Tool } from '@/app/canvas/_components/toolbar';

interface CanvasItemBase {
  id: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  groupId?: string;
}

export interface MediaCanvasItem extends CanvasItemBase {
  type: 'image' | 'video';
  src: string;
}

export type MemoColor = 'default' | 'purple' | 'neon' | 'red';
export type MemoViewMode = 'full' | 'collapsed';

export interface MemoCanvasItem extends CanvasItemBase {
  type: 'memo';
  text: string;
  color: MemoColor;
  seq: number;
  viewMode: MemoViewMode;
  width?: number;
  height?: number;
}

export type CanvasItem = MediaCanvasItem | MemoCanvasItem;

export interface SelectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Connector {
  id: string;
  fromId: string;
  toId: string;
}

export interface CanvasDocument {
  items: CanvasItem[];
  connectors: Connector[];
}

// 캔버스 전환 드롭다운에 나열되는 캔버스 하나 (문서 자체를 포함해 전환 시 그대로 교체)
export interface CanvasEntry {
  id: string;
  name: string;
  state: string;
  time: string;
  thumbnail?: string;
  doc: CanvasDocument;
}

export interface CanvasProps {
  tool: Tool;
  items: CanvasItem[];
  connectors: Connector[];
  onDropFiles: (files: FileList, x: number, y: number) => void;
  onUpdateItems: (patches: Array<Pick<CanvasItem, 'id' | 'x' | 'y' | 'rotate' | 'scale'> & Partial<Pick<MemoCanvasItem, 'width' | 'height'>>>) => void;
  onBringToFront: (ids: string[]) => void;
  onDeleteItems: (ids: string[]) => void;
  onAddConnector: (fromId: string, toId: string) => void;
  onDeleteConnector: (id: string) => void;
  onReconnectConnector: (id: string, end: 'from' | 'to', newNodeId: string) => void;
  onAddMemoItem: (x: number, y: number) => string;
  onSetGroup: (ids: string[]) => void; // 섹션 도구로 확정한 아이템 id 목록의 그룹 소속을 설정
  onEditItemText: (id: string, text: string) => void;
  onSetMemoColor: (id: string, color: MemoColor) => void;
  onSetMemoViewMode: (id: string) => void;
  onToolChange: (tool: Tool) => void;
}

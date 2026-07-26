// output_canvas 타입 정의

import type { Tool } from '@/app/canvas/_components/core/Toolbar';

interface CanvasItemBase {
  id: string;
  x: number;
  y: number;
  rotate: number;
  parentId?: string; // 소속된 섹션(SectionCanvasItem)의 id
  groupId?: string; // Ctrl+G로 묶인 논리적 다중선택 그룹 id (백엔드엔 저장 안 되는 세션 로컬 상태)
}

export interface MediaCanvasItem extends CanvasItemBase {
  type: 'image' | 'video';
  src: string;
  width?: number;
  height?: number;
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

export interface SectionCanvasItem extends CanvasItemBase {
  type: 'section';
  width: number;
  height: number;
}

export type CanvasItem = MediaCanvasItem | MemoCanvasItem | SectionCanvasItem;

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

// 캔버스 전환 드롭다운에 나열되는 캔버스 하나의 목록 메타데이터 (문서 자체는 활성화 시점에 따로 지연 로드)
export interface CanvasEntry {
  id: string;
  name: string;
  state: string;
  time: string;
  thumbnail?: string;
}

export interface CanvasProps {
  tool: Tool;
  items: CanvasItem[];
  connectors: Connector[];
  onDropFiles: (files: FileList, x: number, y: number) => void;
  onUpdateItems: (patches: Array<Pick<CanvasItem, 'id' | 'x' | 'y' | 'rotate'> & Partial<{ width: number; height: number; parentId: string | undefined }>>) => void;
  onBringToFront: (ids: string[]) => void;
  onDeleteItems: (ids: string[]) => void;
  onAddConnector: (fromId: string, toId: string) => void;
  onDeleteConnector: (id: string) => void;
  onReconnectConnector: (id: string, end: 'from' | 'to', newNodeId: string) => void;
  onAddMemoItem: (x: number, y: number) => string;
  onCreateSection: (box: SelectionBox, memberIds: string[]) => string; // 새 섹션 아이템을 생성하고 박스 안 기존 아이템들의 소속(parentId)을 설정, 새 섹션 id를 반환
  onGroupItems: (ids: string[]) => void; // Ctrl+G: 선택된 아이템들에 공통 groupId를 부여
  onUngroupItems: (ids: string[]) => void; // Ctrl+Shift+G: groupId만 해제
  onEditItemText: (id: string, text: string) => void;
  onSetMemoColor: (id: string, color: MemoColor) => void;
  onSetMemoViewMode: (id: string) => void;
  onToolChange: (tool: Tool) => void;
}

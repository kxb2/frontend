// 로컬 캔버스 문서(CanvasDocument) <-> 백엔드 wire 타입(CanvasSaveRequest/CanvasDetailResponse) 사이의 순수 매핑 함수
import type { CanvasDocument, CanvasItem, Connector, MemoColor } from '@/types/canvas';
import type { CanvasDetailResponse, CanvasElementIn, CanvasSaveRequest } from '@/types/canvasApi';

function itemToElementIn(item: CanvasItem): CanvasElementIn {
  const base: CanvasElementIn = {
    clientKey: item.id,
    type: item.type,
    x: item.x,
    y: item.y,
    rotation: item.rotate,
    parentClientKey: item.parentId ?? null,
  };
  if (item.type === 'memo') {
    return { ...base, width: item.width ?? null, height: item.height ?? null, memoContent: item.text, memoColor: item.color };
  }
  if (item.type === 'section') {
    return { ...base, width: item.width, height: item.height };
  }
  // image/video
  return { ...base, width: item.width ?? null, height: item.height ?? null, contentUrl: item.src };
}

// 캔버스 저장 요청 payload로 변환 (clientKey는 로컬 item.id를 그대로 재사용)
export function toSaveRequest(doc: CanvasDocument, storyboardId?: number | null): CanvasSaveRequest {
  return {
    storyboardId: storyboardId ?? null,
    elements: doc.items.map(itemToElementIn),
    connections: doc.connectors.map((connector) => ({ fromClientKey: connector.fromId, toClientKey: connector.toId })),
  };
}

// 캔버스 조회/저장 응답을 로컬 문서로 역변환
export function fromDetailResponse(detail: CanvasDetailResponse): CanvasDocument {
  // 서버 element id -> clientKey(로컬 item.id) 매핑 (parentElementId/커넥터의 fromElementId·toElementId를 되돌리는 데 사용)
  const localIdByServerId = new Map<number, string>();
  detail.elements.forEach((element) => localIdByServerId.set(element.id, element.clientKey ?? String(element.id)));

  let memoSeq = 0;
  const items: CanvasItem[] = detail.elements.map((element) => {
    const id = element.clientKey ?? String(element.id);
    const parentId = element.parentElementId !== null ? localIdByServerId.get(element.parentElementId) : undefined;
    const base = { id, x: element.x, y: element.y, rotate: element.rotation ?? 0, parentId };

    if (element.type === 'memo') {
      memoSeq += 1;
      return {
        ...base,
        type: 'memo' as const,
        text: element.memoContent ?? '',
        color: (element.memoColor as MemoColor | null) ?? 'default',
        seq: memoSeq, // 백엔드엔 순번 개념이 없어 등장 순서로 재계산
        viewMode: 'full' as const,
        width: element.width ?? undefined,
        height: element.height ?? undefined,
      };
    }
    if (element.type === 'section') {
      return { ...base, type: 'section' as const, width: element.width ?? 0, height: element.height ?? 0 };
    }
    return { ...base, type: element.type, src: element.contentUrl ?? '', width: element.width ?? undefined, height: element.height ?? undefined };
  });

  const connectors: Connector[] = detail.connections.map((connection) => ({
    id: String(connection.id),
    fromId: localIdByServerId.get(connection.fromElementId) ?? String(connection.fromElementId),
    toId: localIdByServerId.get(connection.toElementId) ?? String(connection.toElementId),
  }));

  return { items, connectors };
}

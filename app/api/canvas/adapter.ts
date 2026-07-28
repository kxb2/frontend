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
    // memoTitle 하나에 "seq::커스텀제목"으로 함께 실어보냄
    const memoTitle = item.title && item.title.trim() ? `${item.seq}::${item.title}` : String(item.seq);
    return { ...base, width: item.width ?? null, height: item.height ?? null, memoContent: item.text, memoColor: item.color, memoTitle };
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

// itemToElementIn에서 "seq::커스텀제목" 형식으로 합쳐 보낸 memoTitle을 다시 분리
function parseMemoTitle(raw: string | null): { seq: number | null; title: string | undefined } {
  if (!raw) return { seq: null, title: undefined };
  const sepIndex = raw.indexOf('::');
  const seqPart = sepIndex === -1 ? raw : raw.slice(0, sepIndex);
  const titlePart = sepIndex === -1 ? undefined : raw.slice(sepIndex + 2);
  const seq = Number(seqPart);
  return { seq: Number.isFinite(seq) && seq > 0 ? seq : null, title: titlePart || undefined };
}

// 캔버스 조회/저장 응답을 로컬 문서로 역변환
export function fromDetailResponse(detail: CanvasDetailResponse): CanvasDocument {
  // 서버 element id -> clientKey(로컬 item.id) 매핑 (parentElementId/커넥터의 fromElementId·toElementId를 되돌리는 데 사용)
  const localIdByServerId = new Map<number, string>();
  detail.elements.forEach((element) => localIdByServerId.set(element.id, element.clientKey ?? String(element.id)));

  // 메모 순번(seq): memoTitle에 저장해둔 값을 우선 사용(저장/조회 순서가 바뀌어도 항상 같은 번호가 나옴).
  // memoTitle이 없는 예전 데이터만, 등장 순서로 번호를 채워 넣는 예전 방식으로 대체
  let legacyMemoSeq = 0;
  const items: CanvasItem[] = detail.elements.map((element) => {
    const id = element.clientKey ?? String(element.id);
    const parentId = element.parentElementId !== null ? localIdByServerId.get(element.parentElementId) : undefined;
    const base = { id, x: element.x, y: element.y, rotate: element.rotation ?? 0, parentId };

    if (element.type === 'memo') {
      const { seq: savedSeq, title } = parseMemoTitle(element.memoTitle);
      legacyMemoSeq += 1;
      return {
        ...base,
        type: 'memo' as const,
        text: element.memoContent ?? '',
        color: (element.memoColor as MemoColor | null) ?? 'default',
        seq: savedSeq ?? legacyMemoSeq,
        title,
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

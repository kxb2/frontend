'use client';

import { useRef } from 'react';
import type { CanvasItem } from '@/types/canvas';
import { MEMO_PALETTE } from '@/app/canvas/_components/tools/memo/layout';
import { getItemDisplaySize, trackWindowGesture } from '@/app/canvas/_components/core/utils';

interface MinimapProps {
  items: CanvasItem[];
  scale: number;
  stagePos: { x: number; y: number };
  viewportSize: { width: number; height: number };
  onNavigate: (stagePos: { x: number; y: number }) => void;
}

const MAP_WIDTH = 220;
const MAP_HEIGHT = 205;
const MAP_PADDING_RATIO = 0.15; // 콘텐츠 경계 바깥 여백 비율

// 전체 캔버스를 축소해 보여주고, 클릭/드래그하면 그 위치로 화면을 이동시킴
export default function Minimap({ items, scale, stagePos, viewportSize, onNavigate }: MinimapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  // 아이템이 없거나 화면 밖 멀리 있어도 미니맵이 항상 뭔가를 보여주게 함
  const viewport = {
    x: -stagePos.x / scale,
    y: -stagePos.y / scale,
    width: viewportSize.width / scale,
    height: viewportSize.height / scale,
  };
  let minX = viewport.x;
  let minY = viewport.y;
  let maxX = viewport.x + viewport.width;
  let maxY = viewport.y + viewport.height;
  items.forEach((item) => {
    const { width, height } = getItemDisplaySize(item);
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + width);
    maxY = Math.max(maxY, item.y + height);
  });

  const boundsWidth = Math.max(1, maxX - minX);
  const boundsHeight = Math.max(1, maxY - minY);
  const pad = Math.max(boundsWidth, boundsHeight) * MAP_PADDING_RATIO;
  const paddedMinX = minX - pad;
  const paddedMinY = minY - pad;
  const paddedWidth = boundsWidth + pad * 2;
  const paddedHeight = boundsHeight + pad * 2;

  // 종횡비를 유지하며 미니맵 박스 안에 맞추고, 남는 공간은 가운데 정렬
  const mapScale = Math.min(MAP_WIDTH / paddedWidth, MAP_HEIGHT / paddedHeight);
  const offsetX = (MAP_WIDTH - paddedWidth * mapScale) / 2;
  const offsetY = (MAP_HEIGHT - paddedHeight * mapScale) / 2;

  function toMapRect(x: number, y: number, width: number, height: number) {
    return {
      left: (x - paddedMinX) * mapScale + offsetX,
      top: (y - paddedMinY) * mapScale + offsetY,
      width: width * mapScale,
      height: height * mapScale,
    };
  }

  // 미니맵 위 클릭 지점을 논리 좌표로 바꿔, 그 지점이 화면 중앙에 오도록 stagePos를 옮김
  function navigateToMapPoint(clientX: number, clientY: number) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const logicalX = (clientX - rect.left - offsetX) / mapScale + paddedMinX;
    const logicalY = (clientY - rect.top - offsetY) / mapScale + paddedMinY;
    onNavigate({
      x: viewportSize.width / 2 - logicalX * scale,
      y: viewportSize.height / 2 - logicalY * scale,
    });
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    navigateToMapPoint(e.clientX, e.clientY);
    trackWindowGesture((moveEvent) => navigateToMapPoint(moveEvent.clientX, moveEvent.clientY), () => {});
  }

  const viewportRect = toMapRect(viewport.x, viewport.y, viewport.width, viewport.height);

  return (
    <div
      ref={mapRef}
      onMouseDown={handleMouseDown}
      className="absolute right-5 top-5 cursor-pointer overflow-hidden rounded-xl border border-white/40 bg-transparent"
      style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
    >
      {items.map((item) => {
        const { width, height } = getItemDisplaySize(item);
        const rect = toMapRect(item.x, item.y, width, height);
        const background = item.type === 'memo' ? MEMO_PALETTE[item.color].header : item.type === 'section' ? '#394257' : '#ffffff';
        return (
          <div
            key={item.id}
            className="pointer-events-none absolute rounded-xs border border-white/60"
            style={{ left: rect.left, top: rect.top, width: Math.max(2, rect.width), height: Math.max(2, rect.height), background, opacity: item.type === 'section' ? 0.4 : 0.55 }}
          />
        );
      })}
      <div
        className="pointer-events-none absolute rounded-xs border border-primary bg-primary/10"
        style={{ left: viewportRect.left, top: viewportRect.top, width: viewportRect.width, height: viewportRect.height }}
      />
    </div>
  );
}

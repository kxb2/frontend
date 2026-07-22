'use client';

import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { Group, Image as KonvaImage, Rect, RegularPolygon } from 'react-konva';
import type { MediaCanvasItem } from '@/types/canvas';
import { isItemListeningTool, isSelectTool, type Tool } from '@/app/canvas/_components/toolbar';
import { fitWithinCap } from '@/app/canvas/_components/canvasUtils';

interface MediaItemProps {
  item: MediaCanvasItem;
  tool: Tool;
  stageScale: number;
  showIndividualBorder: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>, item: MediaCanvasItem) => void;
  onConnectorStart: (e: Konva.KonvaEventObject<MouseEvent>, item: MediaCanvasItem) => void;
  onItemDblClick: (item: MediaCanvasItem) => void;
  onLiveChange: (item: MediaCanvasItem) => void;
  onGestureEnd: () => void;
  registerNode: (id: string, node: Konva.Group | null) => void;
}

// 이미지/영상 아이템을 Konva.Group으로 렌더링
export default function MediaItem({
  item,
  tool,
  stageScale,
  showIndividualBorder,
  onSelect,
  onConnectorStart,
  onItemDblClick,
  onLiveChange,
  onGestureEnd,
  registerNode,
}: MediaItemProps) {
  const [source, setSource] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [playing, setPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const groupRef = useRef<Konva.Group>(null);
  const imageRef = useRef<Konva.Image>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.src;
      img.onload = () => {
        setSource(img);
        setMediaSize(fitWithinCap(img.naturalWidth, img.naturalHeight));
      };
      return () => {
        img.onload = null;
      };
    }

    // video를 Konva.Image에 HTMLVideoElement를 넣어 렌더링
    const video = document.createElement('video');
    video.src = item.src;
    video.style.position = 'fixed';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    document.body.appendChild(video);
    videoElRef.current = video;

    let rafId = 0;
    let suppressPlayPauseEvents = false;
    function tick() {
      imageRef.current?.getLayer()?.batchDraw();
      rafId = requestAnimationFrame(tick);
    }
    function handlePlay() {
      if (suppressPlayPauseEvents) return;
      setPlaying(true);
      rafId = requestAnimationFrame(tick);
    }
    function handlePause() {
      if (suppressPlayPauseEvents) return;
      setPlaying(false);
      cancelAnimationFrame(rafId);
    }

    function drawOnce() {
      imageRef.current?.getLayer()?.batchDraw();
    }

    let thumbnailRafId = 0;
    function drawThumbnailFrames(remaining: number) {
      drawOnce();
      if (remaining > 0) thumbnailRafId = requestAnimationFrame(() => drawThumbnailFrames(remaining - 1));
    }
    function handleLoaded() {
      setSource(video);
      setMediaSize(fitWithinCap(video.videoWidth, video.videoHeight));
      const wasMuted = video.muted;
      suppressPlayPauseEvents = true;
      video.muted = true;
      video
        .play()
        .then(() => {
          video.pause();
          video.currentTime = 0;
          video.muted = wasMuted;
          suppressPlayPauseEvents = false;
          if (typeof video.requestVideoFrameCallback === 'function') {
            video.requestVideoFrameCallback(() => drawOnce());
          } else {
            drawThumbnailFrames(10);
          }
        })
        .catch(() => {
          video.muted = wasMuted;
          suppressPlayPauseEvents = false;
          drawThumbnailFrames(30);
        });
    }
    function handleFullscreenChange() {
      const active = document.fullscreenElement === video;
      setIsFullscreen(active);
      video.controls = active;
    }
    video.addEventListener('loadeddata', handleLoaded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(thumbnailRafId);
      video.removeEventListener('loadeddata', handleLoaded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      video.pause();
      video.remove();
    };
  }, [item.type, item.src]);

  function setGroupRef(node: Konva.Group | null) {
    groupRef.current = node;
    registerNode(item.id, node);
  }

  function togglePlay(e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    const video = videoElRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }

  function enterFullscreen(e: Konva.KonvaEventObject<MouseEvent>) {
    e.cancelBubble = true;
    videoElRef.current?.requestFullscreen();
  }

  // 커넥터/선택 툴에 따라 이벤트 분기
  function handleGroupMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool === 'connector') onConnectorStart(e, item);
    else onSelect(e, item);
  }

  if (!source || mediaSize.width === 0) return null;
  const controlScale = 1 / (item.scale * stageScale);
  return (
    <Group
      ref={setGroupRef}
      id={item.id}
      x={item.x + mediaSize.width / 2}
      y={item.y + mediaSize.height / 2}
      offsetX={mediaSize.width / 2}
      offsetY={mediaSize.height / 2}
      width={mediaSize.width}
      height={mediaSize.height}
      rotation={item.rotate}
      scaleX={item.scale}
      scaleY={item.scale}
      draggable={isSelectTool(tool)}
      listening={isItemListeningTool(tool)}
      onMouseDown={handleGroupMouseDown}
      onDblClick={() => onItemDblClick(item)}
      onDragMove={() => onLiveChange(item)}
      onTransform={() => onLiveChange(item)}
      onDragEnd={onGestureEnd}
      onTransformEnd={onGestureEnd}
    >
      <KonvaImage ref={imageRef} image={source} width={mediaSize.width} height={mediaSize.height} />
      {/* 다중 선택 시 그룹 테두리와 별도로 개별 테두리도 노출 */}
      {showIndividualBorder && <Rect width={mediaSize.width} height={mediaSize.height} stroke="#c255ff" strokeWidth={2} listening={false} />}
      {item.type === 'video' && !isFullscreen && (
        <Group x={6} y={mediaSize.height - 6} offsetY={22} scaleX={controlScale} scaleY={controlScale}>
          <Group onMouseDown={togglePlay}>
            <Rect width={22} height={22} fill="rgba(0,0,0,0.6)" cornerRadius={4} />
            {playing ? (
              <>
                <Rect x={7} y={6} width={3} height={10} fill="white" />
                <Rect x={12} y={6} width={3} height={10} fill="white" />
              </>
            ) : (
              <RegularPolygon x={11.5} y={11} sides={3} radius={6} rotation={90} fill="white" />
            )}
          </Group>
          <Group x={26} onMouseDown={enterFullscreen}>
            <Rect width={22} height={22} fill="rgba(0,0,0,0.6)" cornerRadius={4} />
            <Rect x={5} y={5} width={5} height={1.5} fill="white" />
            <Rect x={5} y={5} width={1.5} height={5} fill="white" />
            <Rect x={12} y={5} width={5} height={1.5} fill="white" />
            <Rect x={15.5} y={5} width={1.5} height={5} fill="white" />
            <Rect x={5} y={15.5} width={5} height={1.5} fill="white" />
            <Rect x={5} y={12} width={1.5} height={5} fill="white" />
            <Rect x={12} y={15.5} width={5} height={1.5} fill="white" />
            <Rect x={15.5} y={12} width={1.5} height={5} fill="white" />
          </Group>
        </Group>
      )}
    </Group>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { Circle, Group, Image as KonvaImage, Rect, RegularPolygon, Text as KonvaText } from 'react-konva';
import type { CanvasItem } from '@/types/canvas';
import { isItemListeningTool, isSelectTool, type Tool } from '@/app/canvas/_components/toolbar';
import { fitWithinCap, measureText } from '@/app/canvas/_components/canvasUtils';

export const TEXT_FONT_SIZE = 20;
const TEXT_FONT_FAMILY = 'Pretendard, Inter, sans-serif';
export const TEXT_PADDING = 8;
const TEXT_PLACEHOLDER = '텍스트를 입력하세요';
export const LINE_HEIGHT = 1.2;

export const COMMENT_PIN_SIZE = 32;
export const COMMENT_BUBBLE_FONT_SIZE = 14;
export const COMMENT_BUBBLE_WIDTH = 200;
export const COMMENT_BUBBLE_PADDING = 12;
export const COMMENT_BUBBLE_RADIUS = 8;
export const COMMENT_BUBBLE_BG = '#262c3b';
const COMMENT_BUBBLE_GAP = 8;
const COMMENT_PLACEHOLDER = '댓글을 입력하세요';

interface CanvasKonvaItemProps {
  item: CanvasItem;
  tool: Tool;
  stageScale: number;
  showIndividualBorder: boolean;
  isEditing: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) => void;
  onConnectorStart: (e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) => void;
  onCommentTarget: (e: Konva.KonvaEventObject<MouseEvent>, item: CanvasItem) => void;
  onGestureEnd: () => void;
  onLiveChange: (item: CanvasItem) => void;
  onItemDblClick: (item: CanvasItem) => void;
  registerNode: (id: string, node: Konva.Group | null) => void;
  registerEditableNode: (id: string, node: Konva.Node | null) => void;
  isReady: boolean; // 댓글에 한하여 비동기 이미지/영상 로드 중 false, 그 외 타입은 항상 true
}

// CanvasItem을 Konva.Group으로 렌더링 (item.type에 따라 요소 구분, 각 타입에 맞는 Konva 컴포넌트를 자식으로 붙임)
export default function CanvasKonvaItem({
  item,
  tool,
  stageScale,
  showIndividualBorder,
  isEditing,
  onSelect,
  onConnectorStart,
  onCommentTarget,
  onGestureEnd,
  onLiveChange,
  onItemDblClick,
  registerNode,
  registerEditableNode,
  isReady,
}: CanvasKonvaItemProps) {
  const [source, setSource] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [playing, setPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bubbleOpen, setBubbleOpen] = useState(false);
  const groupRef = useRef<Konva.Group>(null);
  const imageRef = useRef<Konva.Image>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const mediaSrc = item.type === 'image' || item.type === 'video' ? item.src : null;

  useEffect(() => {
    if (item.type !== 'image' && item.type !== 'video') return;
    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = mediaSrc!;
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
    video.src = mediaSrc!;
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
  }, [item.type, mediaSrc]);

  // 편집 모드로 들어가면 댓글 말풍선이 자동으로 열림
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isEditing) setBubbleOpen(true);
  }, [isEditing]);

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

  // 커넥터/댓글/선택 툴에 따라 이벤트 분기
  function handleGroupMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    if (tool === 'connector') onConnectorStart(e, item);
    else if (tool === 'comment') onCommentTarget(e, item);
    else onSelect(e, item);
  }

  if (item.type === 'image' || item.type === 'video') {
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
        {showIndividualBorder && (
          <Rect width={mediaSize.width} height={mediaSize.height} stroke="#c255ff" strokeWidth={2} listening={false} />
        )}
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

  if (item.type === 'text') {
    // item.text가 바뀔 때마다 오프스크린 측정으로 폭/높이를 다시 측정
    const { width, height } = measureText(item.text || TEXT_PLACEHOLDER, TEXT_FONT_SIZE, TEXT_FONT_FAMILY, TEXT_PADDING, undefined, LINE_HEIGHT);
    return (
      <Group
        ref={(node) => {
          setGroupRef(node);
          registerEditableNode(item.id, node);
        }}
        id={item.id}
        x={item.x + width / 2}
        y={item.y + height / 2}
        offsetX={width / 2}
        offsetY={height / 2}
        width={width}
        height={height}
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
        <KonvaText
          text={item.text || TEXT_PLACEHOLDER}
          fontSize={TEXT_FONT_SIZE}
          fontFamily={TEXT_FONT_FAMILY}
          fill={item.text ? '#ffffff' : 'rgba(255,255,255,0.4)'}
          padding={TEXT_PADDING}
          lineHeight={LINE_HEIGHT}
          width={width}
          height={height}
          visible={!isEditing}
        />
        {showIndividualBorder && <Rect width={width} height={height} stroke="#c255ff" strokeWidth={2} listening={false} />}
      </Group>
    );
  }

  if (item.type !== 'comment') return null;
  const { width: bubbleWidth, height: bubbleHeight } = measureText(
    item.text || COMMENT_PLACEHOLDER,
    COMMENT_BUBBLE_FONT_SIZE,
    TEXT_FONT_FAMILY,
    COMMENT_BUBBLE_PADDING,
    COMMENT_BUBBLE_WIDTH,
    LINE_HEIGHT,
  );
  return (
    <Group
      ref={setGroupRef}
      id={item.id}
      x={item.x + COMMENT_PIN_SIZE / 2}
      y={item.y + COMMENT_PIN_SIZE / 2}
      offsetX={COMMENT_PIN_SIZE / 2}
      offsetY={COMMENT_PIN_SIZE / 2}
      width={COMMENT_PIN_SIZE}
      height={COMMENT_PIN_SIZE}
      rotation={0}
      scaleX={item.scale}
      scaleY={item.scale}
      visible={isReady}
      draggable={false}
      listening={isItemListeningTool(tool)}
      onMouseDown={handleGroupMouseDown}
      onClick={() => {
        if (!isSelectTool(tool)) return;
        setBubbleOpen((v) => !v);
      }}
      onDblClick={() => onItemDblClick(item)}
    >
      <Circle x={COMMENT_PIN_SIZE / 2} y={COMMENT_PIN_SIZE / 2} radius={COMMENT_PIN_SIZE / 2} fill="#c255ff" />
      <Circle x={COMMENT_PIN_SIZE / 2} y={COMMENT_PIN_SIZE / 2} radius={5} fill="#ffffff" />
      {showIndividualBorder && (
        <Rect width={COMMENT_PIN_SIZE} height={COMMENT_PIN_SIZE} stroke="#c255ff" strokeWidth={2} listening={false} />
      )}
      <Group
        ref={(node) => registerEditableNode(item.id, node)}
        x={COMMENT_PIN_SIZE + COMMENT_BUBBLE_GAP + bubbleWidth / 2}
        y={COMMENT_PIN_SIZE / 2}
        offsetX={bubbleWidth / 2}
        offsetY={bubbleHeight / 2}
        width={bubbleWidth}
        height={bubbleHeight}
        visible={bubbleOpen}
        onDblClick={() => onItemDblClick(item)}
      >
        <Rect width={bubbleWidth} height={bubbleHeight} fill={COMMENT_BUBBLE_BG} cornerRadius={COMMENT_BUBBLE_RADIUS} />
        <KonvaText
          text={item.text || COMMENT_PLACEHOLDER}
          fontSize={COMMENT_BUBBLE_FONT_SIZE}
          fontFamily={TEXT_FONT_FAMILY}
          fill={item.text ? '#ffffff' : 'rgba(255,255,255,0.4)'}
          padding={COMMENT_BUBBLE_PADDING}
          lineHeight={LINE_HEIGHT}
          width={bubbleWidth}
          height={bubbleHeight}
          wrap="word"
          visible={!isEditing}
        />
      </Group>
    </Group>
  );
}

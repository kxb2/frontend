'use client';

import { useEffect, useRef, useState } from 'react';
import type Konva from 'konva';
import { Group, Image as KonvaImage, Rect, RegularPolygon, Text as KonvaText } from 'react-konva';
import type { MediaCanvasItem } from '@/types/canvas';
import { isItemListeningTool, isSelectTool, type Tool } from '@/app/canvas/_components/core/Toolbar';
import type { ItemLiveResize } from '@/app/canvas/_components/transform/useItemResize';
import type { ResizeHandle } from '@/app/canvas/_components/transform/math';
import { ResizeEdges } from '@/app/canvas/_components/transform/ResizeEdges';

// 개발 환경의 R2 등 CORS 미설정 호스트는 서버 프록시(app/api/proxy) 경유 주소로 바꿈 (배포/blob:/data:는 그대로 둠)
function resolveMediaSrc(src: string): string {
  if (process.env.NODE_ENV === 'production') return src;
  if (src.startsWith('blob:') || src.startsWith('data:')) return src;
  try {
    const url = new URL(src);
    if (url.hostname.endsWith('.r2.dev')) return `/api/proxy?url=${encodeURIComponent(src)}`;
  } catch {
    // 상대 경로 등 URL로 못 만드는 값은 그대로 둠
  }
  return src;
}

// 주어진 naturalWidth/naturalHeight를 cap (240px) 이하로 맞춤
function fitWithinCap(naturalWidth: number, naturalHeight: number, cap = 240) {
  if (naturalWidth <= cap && naturalHeight <= cap) return { width: naturalWidth, height: naturalHeight };
  const ratio = Math.min(cap / naturalWidth, cap / naturalHeight);
  return { width: naturalWidth * ratio, height: naturalHeight * ratio };
}

interface MediaItemProps {
  item: MediaCanvasItem;
  tool: Tool;
  stageScale: number;
  isSelected: boolean;
  showIndividualBorder: boolean;
  liveResize?: ItemLiveResize; // 변/꼭짓점 드래그로 크기 조절 중 실시간 폭/높이/위치
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>, item: MediaCanvasItem) => void;
  onConnectorStart: (e: Konva.KonvaEventObject<MouseEvent>, item: MediaCanvasItem) => void;
  onItemDblClick: (item: MediaCanvasItem) => void;
  onLiveChange: (item: MediaCanvasItem) => void;
  onGestureEnd: () => void;
  onResizeStart: (handle: ResizeHandle, item: MediaCanvasItem, e: Konva.KonvaEventObject<MouseEvent>) => void; // 변 자체 드래그(꼭짓점은 Overlay의 동그란 컨트롤이 담당)
  onTaintCanvas: () => void; // CORS 없이 그려져 캔버스가 오염됐음을 신고 (썸네일 캡처 스킵용)
  registerNode: (id: string, node: Konva.Group | null) => void;
}

// 이미지/영상 아이템을 Konva.Group으로 렌더링
export default function MediaItem({
  item,
  tool,
  stageScale,
  isSelected,
  showIndividualBorder,
  liveResize,
  onSelect,
  onConnectorStart,
  onItemDblClick,
  onLiveChange,
  onGestureEnd,
  onResizeStart,
  onTaintCanvas,
  registerNode,
}: MediaItemProps) {
  const [source, setSource] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [mediaSize, setMediaSize] = useState({ width: 0, height: 0 });
  const [loadFailed, setLoadFailed] = useState(false); // 원본 파일이 없는 등으로 로드가 최종 실패했는지 (그래도 선택/삭제는 가능해야 함)
  const [playing, setPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const groupRef = useRef<Konva.Group>(null);
  const imageRef = useRef<Konva.Image>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (item.type === 'image') {
      let cancelled = false;
      // CORS 헤더 없는 호스트(R2 등)는 crossOrigin 속성이 있으면 로드 자체가 막히므로, 실패하면 없이 재시도
      function attemptLoad(useCors: boolean) {
        const img = document.createElement('img');
        if (useCors) img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (cancelled) return;
          if (!useCors) onTaintCanvas();
          setLoadFailed(false);
          setSource(img);
          setMediaSize(fitWithinCap(img.naturalWidth, img.naturalHeight));
        };
        img.onerror = () => {
          if (cancelled) return;
          if (useCors) {
            attemptLoad(false);
            return;
          }
          setLoadFailed(true); // crossOrigin 없이도 실패하면 원본 파일이 없는 것 -- 최종 실패로 확정
        };
        img.src = resolveMediaSrc(item.src);
      }
      attemptLoad(true);
      return () => {
        cancelled = true;
      };
    }

    // video를 Konva.Image에 HTMLVideoElement를 넣어 렌더링
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous'; // 업로드된 원격 영상을 CORS 없이 그리면 캔버스가 오염돼 썸네일 캡처(toDataURL)가 깨짐
    let triedWithoutCors = false;
    // crossOrigin 없이도 실패하면(원본 파일이 없는 경우) 최종 실패로 확정
    function handleError() {
      if (triedWithoutCors) {
        setLoadFailed(true);
        return;
      }
      triedWithoutCors = true;
      video.removeAttribute('crossorigin');
      video.load();
    }
    video.addEventListener('error', handleError);
    video.src = resolveMediaSrc(item.src);
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
      if (triedWithoutCors) onTaintCanvas();
      setLoadFailed(false);
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
      video.removeEventListener('error', handleError);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      video.pause();
      video.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onTaintCanvas는 상위 렌더마다 새로 생성되므로 deps에 넣지 않음(넣으면 재생 중에도 미디어가 다시 로드됨)
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

  // 정상 렌더링과 로드-실패 자리표시자가 공유하는 Group 속성
  function groupProps(x: number, y: number, width: number, height: number) {
    return {
      id: item.id,
      x: x + width / 2,
      y: y + height / 2,
      offsetX: width / 2,
      offsetY: height / 2,
      width,
      height,
      rotation: item.rotate,
      scaleX: 1,
      scaleY: 1,
      draggable: isSelectTool(tool),
      listening: isItemListeningTool(tool),
      onMouseDown: handleGroupMouseDown,
      onDragMove: () => onLiveChange(item),
      onTransform: () => onLiveChange(item),
      onDragEnd: onGestureEnd,
      onTransformEnd: onGestureEnd,
    };
  }

  // 변 자체를 드래그하는 리사이즈 컨트롤 (꼭짓점의 동그란 컨트롤은 Overlay가 담당)
  function renderResizeEdges(width: number, height: number) {
    if (!isSelected || !isSelectTool(tool)) return null;
    return <ResizeEdges width={width} height={height} onEdgeMouseDown={(edge, e) => onResizeStart(edge, item, e)} />;
  }

  // 로드 최종 실패 시에도 선택/삭제는 가능해야 하므로 자리표시자 박스를 렌더링
  if (loadFailed) {
    const failedWidth = item.width ?? 120;
    const failedHeight = item.height ?? 80;
    return (
      <Group ref={setGroupRef} {...groupProps(item.x, item.y, failedWidth, failedHeight)}>
        <Rect width={failedWidth} height={failedHeight} fill="rgba(58,63,77,0.5)" stroke="#6b7280" strokeWidth={1} dash={[6, 4]} cornerRadius={4} />
        <KonvaText text="파일을 불러올 수 없음" width={failedWidth} height={failedHeight} align="center" verticalAlign="middle" fontSize={12} fill="#9ca3af" listening={false} />
        {showIndividualBorder && <Rect width={failedWidth} height={failedHeight} stroke="#c255ff" strokeWidth={2} listening={false} />}
      </Group>
    );
  }
  if (!source || mediaSize.width === 0) return null;
  // item.width/height가 있으면 그게 진실, 없으면(방금 올린 신규 파일) 자연 크기 기준 초기값, 리사이즈 중엔 라이브 값 우선
  const effectiveX = liveResize?.x ?? item.x;
  const effectiveY = liveResize?.y ?? item.y;
  const renderWidth = liveResize?.width ?? item.width ?? mediaSize.width;
  const renderHeight = liveResize?.height ?? item.height ?? mediaSize.height;
  const controlScale = 1 / stageScale;
  return (
    <Group ref={setGroupRef} {...groupProps(effectiveX, effectiveY, renderWidth, renderHeight)} onDblClick={() => onItemDblClick(item)}>
      <KonvaImage ref={imageRef} image={source} width={renderWidth} height={renderHeight} />
      {/* 다중 선택 시 그룹 테두리와 별도로 개별 테두리도 노출 */}
      {showIndividualBorder && <Rect width={renderWidth} height={renderHeight} stroke="#c255ff" strokeWidth={2} listening={false} />}
      {renderResizeEdges(renderWidth, renderHeight)}
      {item.type === 'video' && !isFullscreen && (
        <Group x={6} y={renderHeight - 6} offsetY={22} scaleX={controlScale} scaleY={controlScale}>
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

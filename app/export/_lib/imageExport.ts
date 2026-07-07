// F-06 이미지 내보내기: 9장의 컷 이미지를 3x3 그리드 한 장(PNG)으로 합성해서 다운로드

import { StoryboardCut } from '@/types/ai';

const GRID_SIZE = 3;
const CELL_WIDTH = 640;
const CELL_HEIGHT = 360;
const GAP = 8;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 원격 URL을 canvas에 그릴 때 CORS로 막히지 않게 함(data URI에는 영향 없음)
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`이미지 로드 실패: ${src}`));
    img.src = src;
  });
}

// PDF에 넣기 직전 이미지를 새로운 canvas에 그려 PNG data URL로 변환
export async function toPngDataUrl(src: string): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || CELL_WIDTH;
  canvas.height = img.naturalHeight || CELL_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context를 생성할 수 없습니다.');

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export async function composeGridImage(cuts: StoryboardCut[]): Promise<Blob> {
  const canvasWidth = GRID_SIZE * CELL_WIDTH + (GRID_SIZE - 1) * GAP;
  const canvasHeight = GRID_SIZE * CELL_HEIGHT + (GRID_SIZE - 1) * GAP;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context를 생성할 수 없습니다.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const sorted = [...cuts].sort((a, b) => a.shotNumber - b.shotNumber);

  for (let i = 0; i < sorted.length; i++) {
    const cut = sorted[i];
    const col = i % GRID_SIZE;
    const row = Math.floor(i / GRID_SIZE);
    const x = col * (CELL_WIDTH + GAP);
    const y = row * (CELL_HEIGHT + GAP);

    if (!cut.imageUrl) {
      ctx.strokeStyle = '#d1d5db';
      ctx.strokeRect(x, y, CELL_WIDTH, CELL_HEIGHT);
      continue;
    }

    const img = await loadImage(cut.imageUrl);
    ctx.drawImage(img, x, y, CELL_WIDTH, CELL_HEIGHT);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas를 이미지로 변환하지 못했습니다.'));
    }, 'image/png');
  });
}

export async function downloadGridImage(cuts: StoryboardCut[], fileName = 'storyboard-9cuts.png') {
  const blob = await composeGridImage(cuts);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

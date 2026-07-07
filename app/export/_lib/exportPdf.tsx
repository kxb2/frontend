import { pdf } from '@react-pdf/renderer';
import StoryboardPdfDocument from '@/app/export/_lib/pdfDocument';
import { toPngDataUrl } from '@/app/export/_lib/imageExport';
import { StoryboardResult } from '@/types/ai';

// PDF에 넣기 전 모든 컷 이미지를 PNG로 변환
async function toPdfSafeResult(result: StoryboardResult): Promise<StoryboardResult> {
  const cuts = await Promise.all(
    result.cuts.map(async (cut) => ({
      ...cut,
      imageUrl: cut.imageUrl ? await toPngDataUrl(cut.imageUrl) : undefined,
    }))
  );
  return { ...result, cuts };
}

export async function downloadStoryboardPdf(result: StoryboardResult, fileName = 'storyboard.pdf') {
  const pdfSafeResult = await toPdfSafeResult(result);
  const blob = await pdf(<StoryboardPdfDocument result={pdfSafeResult} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

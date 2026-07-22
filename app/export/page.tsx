'use client';

import { useState } from 'react';
import { mockStoryboardResult } from '@/app/data/mockStoryboardResult';
import PreviewGrid from '@/app/export/_components/PreviewGrid';
import PreviewPrompts from '@/app/export/_components/PreviewPrompts';
import { downloadGridImage } from '@/app/export/_lib/imageExport';
import { downloadStoryboardPdf } from '@/app/export/_lib/exportPdf';

// F-05/F-06 내보내기 기능만 독립적으로 확인하기 위한 임시 페이지
export default function ExportSandboxPage() {
  const [result] = useState(mockStoryboardResult);
  const [status, setStatus] = useState<string>('');

  async function handleImageExport() {
    setStatus('이미지 생성 중...');
    try {
      await downloadGridImage(result.cuts);
      setStatus('이미지 다운로드 완료');
    } catch (e) {
      setStatus(`이미지 내보내기 실패: ${(e as Error).message}`);
    }
  }

  async function handlePdfExport() {
    setStatus('PDF 생성 중...');
    try {
      await downloadStoryboardPdf(result);
      setStatus('PDF 다운로드 완료');
    } catch (e) {
      setStatus(`PDF 내보내기 실패: ${(e as Error).message}`);
    }
  }

  return (
    <div className="flex-1 min-h-0 p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-lg font-semibold">내보내기 기능 확인 (F-05 / F-06)</span>
        <div className="flex gap-2">
          <button onClick={handlePdfExport} className="border border-gray-300 px-3 py-1.5 text-sm">
            PDF 내보내기
          </button>
          <button onClick={handleImageExport} className="border border-gray-300 px-3 py-1.5 text-sm">
            이미지 내보내기
          </button>
        </div>
      </div>

      {status && <span className="text-sm text-gray-500">{status}</span>}

      <div className="max-w-3xl flex flex-col gap-3">
        <PreviewGrid cuts={result.cuts} />
        <PreviewPrompts shots={result.shots} />
      </div>
    </div>
  );
}

import { CreateStoryboardResult, GenerationResult } from '@/types/api';

// 스토리보드 생성 요청 (POST /api/storyboards)
export async function createStoryboard(formValues: Record<string, string | File[]>): Promise<CreateStoryboardResult> {
  const formData = new FormData();
  formData.append('scenario', (formValues.scenario as string) ?? '');
  formData.append('genre', (formValues.genre as string) ?? '');

  const referenceFiles = (formValues.reference as File[]) ?? [];
  referenceFiles.forEach((file) => formData.append('referenceImages', file));

  const response = await fetch('/api/storyboards', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('스토리보드 생성 요청에 실패했습니다.');
  }

  return response.json();
}

// 9컷 생성 상태 조회 (GET /api/generations/{generationId})
export async function getGeneration(generationId: number): Promise<GenerationResult> {
  const response = await fetch(`/api/generations/${generationId}`);

  if (!response.ok) {
    throw new Error('생성 상태 조회에 실패했습니다.');
  }

  return response.json();
}

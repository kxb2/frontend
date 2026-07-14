import { getGenerationResult } from '@/app/api/storyboard/store';

export async function GET(request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  // URL의 [generationId] 부분 꺼내기 (예: /api/generations/100 → generationId = "100")
  const { generationId } = await params;

  // 서버 쪽에서 실제 백엔드로 그대로 전달
  // const backendResponse = await fetch(`${process.env.BACKEND_API_URL}/generations/${generationId}`);
  // const data = await backendResponse.json();
  // return Response.json(data, { status: backendResponse.status });

  // POST /api/storyboards가 저장해둔 실제 생성 결과를 꺼내서 반환
  const result = getGenerationResult(Number(generationId));

  if (!result) {
    return Response.json({ message: '존재하지 않는 생성 결과입니다.' }, { status: 404 });
  }

  return Response.json(result);
}

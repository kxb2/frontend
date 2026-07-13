// 임시 mock용: generationId별로 몇 번 조회됐는지 기록 (서버 재시작하면 초기화됨)
const mockCallCounts = new Map<string, number>();

export async function GET(request: Request, { params }: { params: Promise<{ generationId: string }> }) {
  // URL의 [generationId] 부분 꺼내기 (예: /api/generations/100 → generationId = "100")
  const { generationId } = await params;

  // 서버 쪽에서 실제 백엔드로 그대로 전달
  // const backendResponse = await fetch(`${process.env.BACKEND_API_URL}/generations/${generationId}`);
  // const data = await backendResponse.json();
  // return Response.json(data, { status: backendResponse.status });

  // 임시 mock 데이터 (백엔드 연동 전까지 사용) - 3번째 조회부터 완료된 것처럼 응답
  // ai를 통해 테스트용 코드를 생성한 것이라 백엔드 주소 연결 후에는 코드 삭제 예정
  const callCount = (mockCallCounts.get(generationId) ?? 0) + 1;
  mockCallCounts.set(generationId, callCount);

  if (callCount < 3) {
    return Response.json({
      generationId: Number(generationId),
      storyboardId: 1,
      status: 'PENDING',
      gridImageUrl: null,
      integratedPrompt: null,
      cuts: [],
      errorMessage: null,
    });
  }

  const cuts = Array.from({ length: 9 }, (_, i) => ({
    cutId: i + 1,
    shotNumber: i + 1,
    imageUrl: `https://picsum.photos/seed/${generationId}-${i + 1}/400/400`,
    prompt: `Shot ${i + 1}: 임시 프롬프트 텍스트입니다.`,
    status: 'COMPLETED',
  }));

  return Response.json({
    generationId: Number(generationId),
    storyboardId: 1,
    status: 'COMPLETED',
    gridImageUrl: `https://picsum.photos/seed/${generationId}/900/900`,
    integratedPrompt: 'Shot 1: ...\nShot 2: ...',
    cuts,
    errorMessage: null,
  });
}

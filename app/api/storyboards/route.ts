// 이 파일은 백엔드 폴더와 합치기전 테스트 용으로 사용하는 api 파일입니다.
/*
export async function POST를 쓴 이유
export default function 함수명(req, res){...}
- (구버전 방식)Pages Router를 사용할 때의 방식
- 함수 하나를 내보내기를 하고, 그 안에서 req.method를 직접 검사해서 분기하는 방식

export default function POST(req){...}
- (신버전 방식)App Router를 사용할 때의 방식
- HTTP 메서드 이름 그대로 함수를 만들어서 내보내면
Next.js가 알아서 그 메서드로 온 요청만 이 함수로 연결
- 이로 인해 req.method를 통해 직접 비교할 필요가 없어짐
*/

import Anthropic from '@anthropic-ai/sdk';
import { createGenerationId, setGeneration } from '@/app/api/storyboard/store';
import { GenerationResult } from '@/types/api';

const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API });

// 파일의 앞부분 바이트(매직 넘버)를 보고 실제 이미지 형식을 판별
// (브라우저가 알려주는 file.type은 확장자 기반이라 실제 내용과 다를 수 있음)
function detectImageMediaType(buffer: Buffer): 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' {
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return 'image/png';
}

export async function POST(request: Request) {
  // 클라이언트가 보낸 FormData(시나리오, 장르, 레퍼런스)를 그대로 받음
  const formData = await request.formData();

  const scenario = (formData.get('scenario') as string) ?? '';
  const genre = (formData.get('genre') as string) ?? '';

  // 참고 이미지 파일들을 꺼내서 base64로 인코딩 (Claude가 이해할 수 있는 형태로 변환)
  const referenceFiles = formData.getAll('referenceImages') as File[];

  const imageBlocks = await Promise.all(
    referenceFiles.map(async (file) => {
      // 업로드된 파일의 실제 바이트 데이터를 꺼내는 브라우저 공용 API
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // 바이트 데이터를 클로드가 요구하는 base64 문자열로 교체
      const base64 = buffer.toString('base64');

      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: detectImageMediaType(buffer),
          data: base64,
        },
      };
    })
  );

  // messages.create 실제로 네트워크 요청을 보내는 함수
  const message = await anthropic.messages.create({
    // 클로드 모델 선택
    model: 'claude-sonnet-5',
    // 토큰 제한
    max_tokens: 3000,

    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            shots: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  shotNumber: { type: 'integer' }, // 1~9 중 몇 번째 컷인지
                  framing: { type: 'string' }, // 예: "ELS", "CU", "MS" 같은 샷 크기 표기
                  prompt: { type: 'string' }, // "Pixar 3D animation, vibrant colors, ..." 본문 묘사
                },
                required: ['shotNumber', 'framing', 'prompt'],
                additionalProperties: false,
              },
            },
          },
          required: ['shots'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text: `당신은 영상 스토리보드 아티스트입니다. 아래 시나리오와 장르를 참고해서 9컷짜리 스토리보드 이미지 프롬프트를 만들어주세요.

시나리오: ${scenario}
장르: ${genre}
${referenceFiles.length > 0 ? '\n첨부된 참고 이미지들에 등장하는 캐릭터/배경/소품의 생김새를 최대한 참고해서 각 컷 프롬프트에 반영해주세요.' : ''}

각 컷의 prompt는 영어로 작성하고, 아래 예시와 같은 스타일/구성으로 작성해주세요:

"Pixar 3D animation, vibrant colors, expressive ninja character Alex on a rooftop above a Times Square-inspired New York city canyon, abstract neon panels with no readable text logos or numbers, 16:9, ELS, Alex poised on the ledge with scarf fluttering and traffic bokeh far below, anticipation, soft studio three-point lighting with gentle rim light and neon glow, warm saturated palette with clean highlights, ~3 seconds, cinematic 24fps"

이 예시처럼 아트 스타일, 색감, 인물/배경 묘사, 화면비, 샷 구도, 분위기, 조명, 팔레트, 지속시간, 프레임레이트를 한 문단으로 포함해주세요. 9개 컷이 하나의 이야기로 자연스럽게 이어지도록 구성해주세요.`,
          },
        ],
      },
    ],
  });

  // 잘 받았는지 터미널에서 확인용
  console.log('받은 시나리오:', formData.get('scenario'));
  console.log('받은 장르:', formData.get('genre'));
  console.log('받은 레퍼런스 이미지 개수:', formData.getAll('referenceImages').length);

  // Claude 응답에서 실제 데이터(JSON 문자열) 블록을 찾아서 파싱
  const textBlock = message.content.find((block) => block.type === 'text');
  const parsed = textBlock && textBlock.type === 'text' ? JSON.parse(textBlock.text) : null;

  const shots: { shotNumber: number; framing: string; prompt: string }[] = parsed?.shots ?? [];

  // shots 9개를 "shot 1 (ELS) - ..." 형식으로 한 줄씩 만든 뒤, 하나의 텍스트로 합침
  const integratedPrompt = shots.map((shot) => `shot ${shot.shotNumber} (${shot.framing}) - ${shot.prompt}`).join('\n\n');

  // 이미지 생성은 다음 단계라 지금은 컷마다 자리표시용 이미지를 넣어둠
  const generationId = createGenerationId(); // 고유 ID 발급
  const cuts = shots.map((shot) => ({
    cutId: shot.shotNumber, // 몇 번째 컷인지
    shotNumber: shot.shotNumber, // 화면에 몇 번째로 표시할 것인지
    imageUrl: `https://picsum.photos/seed/${generationId}-${shot.shotNumber}/400/400`, // 실제 생성 이미지 넣을 곳
    prompt: shot.prompt, // 클로드로 생성한 프롬프트
    status: 'COMPLETED', // 생성 상태
  }));

  const result: GenerationResult = {
    generationId,
    storyboardId: generationId,
    status: 'COMPLETED',
    gridImageUrl: null,
    integratedPrompt,
    cuts,
    errorMessage: null,
  };

  // GET /api/generations/[generationId]가 꺼내 쓸 수 있도록 결과를 저장
  setGeneration(generationId, result);

  return Response.json({
    storyboardId: generationId,
    generationId,
    status: 'COMPLETED',
  });
}

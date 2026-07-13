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

export async function POST(request: Request) {
  // 클라이언트가 보낸 FormData(시나리오, 장르, 레퍼런스)를 그대로 받음
  const formData = await request.formData();

  // 잘 받았는지 터미널에서 확인용
  console.log('받은 시나리오:', formData.get('scenario'));
  console.log('받은 장르:', formData.get('genre'));
  console.log('받은 레퍼런스 이미지 개수:', formData.getAll('referenceImages').length);

  // 서버 쪽에서 실제 백엔드로 그대로 전달
  // const backendResponse = await fetch(`${process.env.BACKEND_API_URL}/storyboards`, {
  //   method: 'POST',
  //   body: formData,
  // });
  // const data = await backendResponse.json();
  // return Response.json(data, { status: backendResponse.status });

  // 임시 mock 데이터 (백엔드 연동 전까지 사용)
  return Response.json({
    storyboardId: 1,
    generationId: 100,
    status: 'pending',
  });
}

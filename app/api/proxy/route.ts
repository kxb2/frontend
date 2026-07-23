// 개발 환경의 CORS 미설정 호스트 이미지/영상을 서버가 대신 가져오는 프록시
import { NextRequest, NextResponse } from 'next/server';

// 아무 URL이나 대신 가져오는 열린 프록시가 되지 않도록, 알려진 첨부파일 호스트(R2 public 버킷 도메인)로만 제한
function isAllowedHost(hostname: string) {
  return hostname.endsWith('.r2.dev');
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url 파라미터가 필요합니다.' }, { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ error: '올바르지 않은 url입니다.' }, { status: 400 });
  }
  if ((target.protocol !== 'http:' && target.protocol !== 'https:') || !isAllowedHost(target.hostname)) {
    return NextResponse.json({ error: '허용되지 않은 호스트입니다.' }, { status: 400 });
  }

  const upstream = await fetch(target.toString());
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: '이미지를 가져오지 못했습니다.' }, { status: upstream.status || 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

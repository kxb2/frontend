import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 외부 이미지를 가져와서 next/image로 쓰기 위함
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  // 보안 헤더
  headers: async () => [
    {
      // source 적용할 경로 설정(아무 경로나)
      source: '/(.*)',
      headers: [
        {
          // 파일을 엉뚱한 타입으로 실행시키는 공격 방어
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          // iframe으로 속여서 클릭 유도하는 공격 방어
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        {
          // URL에 담긴 민감정보가 외부로 새는 것 방어
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ],
};

export default nextConfig;

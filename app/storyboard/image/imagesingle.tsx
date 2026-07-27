'use client';

import { useEffect, useRef, useState } from 'react';
import Skeleton from 'react-loading-skeleton';
import { ImageSingleProps } from '@/types/storyboard';

// 백엔드가 고정 생성하는 그리드 이미지 비율(1264:848)
const RATIO = 1264 / 848;

// 9컷이 합쳐진 그리드 이미지 1장을 표시 (재생성은 사이드바의 '스토리보드 재생성하기' 버튼이 담당)
export default function ImageSingle({ imageUrl, isLoading }: ImageSingleProps) {
  // 바깥 슬롯(남는 공간) 크기를 재기 위한 ref
  const outerRef = useRef<HTMLDivElement>(null);
  // 비율을 유지한 채 계산된 프레임의 실제 픽셀 크기(로딩/빈 상태/이미지 상태 모두 동일하게 사용)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;

    // 바깥 슬롯의 가로/세로 중 더 빠듯한 쪽 기준으로, 비율(RATIO)을 유지한 최대 크기를 계산
    const updateSize = () => {
      const { width: availableWidth, height: availableHeight } = el.getBoundingClientRect();
      let width = availableWidth;
      let height = width / RATIO;
      if (height > availableHeight) {
        height = availableHeight;
        width = height * RATIO;
      }
      setSize({ width, height });
    };

    updateSize();
    // 창 크기 변경 등으로 바깥 슬롯 크기가 바뀔 때마다 다시 계산
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="relative flex-1 min-h-0 flex items-center justify-center">
      <div className="@container relative overflow-hidden rounded-xl border border-border bg-linear-to-br from-[#3B2478] via-[#141634] to-[#1B2A63] flex items-center justify-center" style={size ? { width: size.width, height: size.height } : { width: '100%', minHeight: '500px' }}>
        {isLoading && !imageUrl ? (
          // 생성 중이고 아직 그리드 이미지가 없으면 스켈레톤 표시
          <div className="absolute inset-0">
            <Skeleton height="100%" width="100%" borderRadius={12} baseColor="#3a3c41" highlightColor="#ffffff1a" duration={2.5} className="block!" containerClassName="block! h-full w-full" />
          </div>
        ) : imageUrl ? (
          // 프레임이 이미 이미지와 같은 비율로 계산돼 있으므로, 그냥 꽉 채우면 여백도 잘림도 없음
          <img src={imageUrl} alt="9컷 스토리보드" className="w-full h-full object-cover" />
        ) : (
          <>
            {/* 아직 생성 전임을 보여주는 3x3 그리드 라인(장식용) */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="border border-border/30" />
              ))}
            </div>

            {/* 가운데 안내 아이콘 + 문구 */}
            <div className="relative z-10 flex flex-col items-center gap-3 text-center px-4">
              <svg className="w-[clamp(1.5rem,10cqw,2.5rem)] h-[clamp(1.5rem,10cqw,2.5rem)]" viewBox="0 0 39 39" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M37.2 25.1998L31.028 19.0278C30.2778 18.2779 29.2606 17.8567 28.2 17.8567C27.1393 17.8567 26.1221 18.2779 25.372 19.0278L7.19995 37.1998M5.19995 1.19995H33.2C35.4091 1.19995 37.2 2.99081 37.2 5.19995V33.2C37.2 35.4091 35.4091 37.2 33.2 37.2H5.19995C2.99081 37.2 1.19995 35.4091 1.19995 33.2V5.19995C1.19995 2.99081 2.99081 1.19995 5.19995 1.19995ZM17.2 13.2C17.2 15.4091 15.4091 17.2 13.2 17.2C10.9908 17.2 9.19995 15.4091 9.19995 13.2C9.19995 10.9908 10.9908 9.19995 13.2 9.19995C15.4091 9.19995 17.2 10.9908 17.2 13.2Z"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              <p className="text-[clamp(0.75rem,3cqw,1.25rem)] text-text-primary font-light">
                생성된 스토리보드가 여기에 표시됩니다.
                <br />
                스토리보드를 생성해보세요!
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

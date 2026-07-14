// POST에서 만든 생성 결과를 GET에서 꺼내 쓸 수 있도록 잠깐 담아두는 인메모리 저장소
// (서버 재시작하면 초기화됨 — 진짜 백엔드가 연결되면 이 파일은 통째로 걷어내면 됨)
//
// Next.js는 route.ts 파일마다 별도 모듈로 번들링해서, 일반 모듈 변수로는
// 서로 다른 route.ts 파일끼리 상태를 공유하지 못함. 그래서 프로세스 전체에서
// 진짜로 하나뿐인 globalThis에 저장해서, POST/GET 라우트가 항상 같은 Map을 보게 함.
import { GenerationResult } from '@/types/api';

// globalThis에는 원래 이런 필드가 없어서, "이런 모양일 것"이라고 타입을 알려주기 위한 선언
// (unknown을 한 번 거치는 이유: globalThis 타입에서 바로 임의 타입으로 바꾸는 걸 TS가 막기 때문)
const globalForStore = globalThis as unknown as {
  __storyboardGenerations?: Map<number, GenerationResult>; // generationId -> 생성 결과
  __storyboardNextId?: number; // 다음에 발급할 generationId
};

// 이미 만들어둔 Map이 있으면 재사용, 없으면(서버가 방금 켜졌으면) 새로 생성
const generations = globalForStore.__storyboardGenerations ?? new Map<number, GenerationResult>();
// 다음번에 이 모듈이 다시 로드돼도 같은 Map을 찾을 수 있도록 전역에 다시 기록
globalForStore.__storyboardGenerations = generations;

// 이미 진행 중이던 카운터가 있으면 이어서, 없으면 100부터 시작
let nextId = globalForStore.__storyboardNextId ?? 100;

// 호출할 때마다 겹치지 않는 새 generationId를 하나씩 발급
export function createGenerationId(): number {
  const id = nextId; // 지금 번호를 먼저 챙겨두고
  nextId += 1; // 다음 번호로 넘어간 뒤
  globalForStore.__storyboardNextId = nextId; // 전역에도 반영
  return id; // 챙겨뒀던 번호를 돌려줌
}

// generationId를 키로 생성 결과를 저장 (POST에서 호출)
export function setGeneration(generationId: number, result: GenerationResult): void {
  generations.set(generationId, result);
}

// generationId로 저장된 결과를 조회 (GET에서 호출). 없으면 undefined
export function getGenerationResult(generationId: number): GenerationResult | undefined {
  return generations.get(generationId);
}

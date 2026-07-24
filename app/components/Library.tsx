'use client';

import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import XIcon from '@/app/components/icons/x.svg';
import PlusIcon from '@/app/components/icons/plus.svg';
import ClapperboardIcon from '@/app/components/icons/clapperboard.svg';
import ChevronDownIcon from '@/app/components/icons/chevron-down.svg';
import FolderClosedIcon from '@/app/components/icons/folder-closed.svg';
import { listCanvases, createCanvas } from '@/app/api/canvas/api';
import { listStoryboards } from '@/app/api/storyboard/api';
import { formatRelativeTime } from '@/app/utils/time';
import { loadLastSavedAt } from '@/app/utils/savedAt';
import { loadLastActiveCanvasId, loadLastViewedStoryboardId } from '@/app/utils/lastSelected';

interface RecentItem {
  id: string;
  label: string;
  time: string;
}

const RECENT_SECTION_VISIBLE_COUNT = 5;

interface RecentSectionProps {
  title: string;
  items: RecentItem[];
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onCreateNew: () => void;
}

function RecentSection({ title, items, icon: Icon, selectedId, onSelectItem, onCreateNew }: RecentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMore = items.length > RECENT_SECTION_VISIBLE_COUNT;
  const visibleItems = isExpanded ? items : items.slice(0, RECENT_SECTION_VISIBLE_COUNT);

  return (
    <div className="flex w-full flex-col gap-4 px-8 py-5">
      <div className="flex w-full items-center justify-between">
        <p className="text-label-semibold-16 text-text-secondary">{title}</p>
        <button type="button" onClick={onCreateNew} className="text-text-secondary flex cursor-pointer items-center gap-2 rounded-lg border border-text-disabled px-3 py-1">
          <PlusIcon className="size-2.5" />
          <span className="text-label-semibold-12">새로 만들기</span>
        </button>
      </div>

      <div className="flex w-full flex-col gap-2">
        {visibleItems.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item.id)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2 ${isSelected ? 'bg-background' : ''}`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`size-4 shrink-0 ${isSelected ? 'text-primary' : 'text-text-primary'}`} />
                <p className={`text-label-regular-14 ${isSelected ? 'text-primary' : 'text-text-primary'}`}>{item.label}</p>
              </div>
              <p className="text-caption-12 text-text-disabled">{item.time}</p>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <button type="button" onClick={() => setIsExpanded((prev) => !prev)} className="flex cursor-pointer items-center justify-center gap-2 self-start">
          <ChevronDownIcon className={`text-text-secondary size-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          <span className="text-label-regular-14 text-text-primary">{isExpanded ? '접기' : '더보기'}</span>
        </button>
      )}
    </div>
  );
}

interface LibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Library({ isOpen, onClose }: LibraryProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [canvasItems, setCanvasItems] = useState<RecentItem[]>([]);
  const [storyboardItems, setStoryboardItems] = useState<RecentItem[]>([]);

  // 캔버스 화면에 있을 때만, 지금 보고 있는 캔버스를 선택된 것으로 표시 (canvas/page.tsx가 기록해두는 값)
  const selectedCanvasId = pathname === '/canvas' ? loadLastActiveCanvasId() : null;
  // 스토리보드 화면에 있을 때만, 지금 보고 있는 스토리보드를 선택된 것으로 표시 (storyboard/page.tsx가 기록해두는 값)
  const selectedStoryboardId = pathname === '/storyboard' ? loadLastViewedStoryboardId() : null;

  // 메뉴를 열 때마다 다시 조회
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const list = await listCanvases();
        // 생성 순서로 고정
        const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        // 백엔드 updatedAt은 저장해도 안 바뀌므로, 이 브라우저에서 직접 기록해둔 마지막 저장 시각이 있으면 그걸 우선 사용
        setCanvasItems(sorted.map((item) => ({ id: String(item.id), label: item.title ?? `Canvas ${item.id}`, time: formatRelativeTime(loadLastSavedAt(String(item.id)) ?? item.updatedAt) })));
      } catch (error) {
        console.error('캔버스 목록 조회에 실패했습니다:', error);
      }
    })();
    (async () => {
      try {
        const list = await listStoryboards();
        const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setStoryboardItems(sorted.map((item) => ({ id: String(item.id), label: item.title ?? `Storyboard ${item.id}`, time: formatRelativeTime(item.updatedAt) })));
      } catch (error) {
        console.error('스토리보드 목록 조회에 실패했습니다:', error);
      }
    })();
  }, [isOpen]);

  // 캔버스 선택 (메뉴를 닫고 그 캔버스를 활성화한 상태로 캔버스 페이지로 이동)
  function handleSelectCanvas(id: string) {
    onClose();
    router.push(`/canvas?id=${id}`);
  }

  // 스토리보드 선택 (메뉴를 닫고 그 스토리보드를 읽기 전용으로 보여주는 상태로 이동)
  function handleSelectStoryboard(id: string) {
    onClose();
    router.push(`/storyboard?id=${id}`);
  }

  // 새 캔버스 추가
  async function handleCreateCanvas() {
    onClose();
    try {
      const created = await createCanvas();
      router.push(`/canvas?id=${created.canvasId}`);
    } catch (error) {
      console.error(error);
      alert('캔버스 생성에 실패했습니다.');
    }
  }

  // 완전히 빈 스토리보드 생성 화면으로 이동
  function handleCreateStoryboard() {
    onClose();
    router.push(`/storyboard?new=${Date.now()}`);
  }

  return (
    <div className="bg-card scrollbar-none flex h-full w-101 flex-col overflow-y-auto rounded-r-xl">
      <div className="flex w-full items-center justify-end p-8">
        <button type="button" aria-label="닫기" onClick={onClose} className="text-text-secondary size-5 shrink-0 cursor-pointer">
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="bg-border h-px w-full shrink-0" />

      <RecentSection title="스토리보드" items={storyboardItems} icon={ClapperboardIcon} selectedId={selectedStoryboardId} onSelectItem={handleSelectStoryboard} onCreateNew={handleCreateStoryboard} />

      <div className="bg-border h-px w-full shrink-0" />

      <RecentSection title="캔버스" items={canvasItems} icon={FolderClosedIcon} selectedId={selectedCanvasId} onSelectItem={handleSelectCanvas} onCreateNew={handleCreateCanvas} />

      <div className="bg-border h-px w-full shrink-0" />
    </div>
  );
}

'use client';

import { useEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import MenuIcon from '@/app/components/icons/menu.svg';
import PlusIcon from '@/app/components/icons/plus.svg';
import ClapperboardIcon from '@/app/components/icons/clapperboard.svg';
import ChevronDownIcon from '@/app/components/icons/chevron-down.svg';
import FolderClosedIcon from '@/app/components/icons/folder-closed.svg';
import PencilLineIcon from '@/app/components/icons/pencil-line.svg';
import TrashIcon from '@/app/components/icons/trash.svg';
import logoMark from '@/app/components/icons/logo-mark.png';
import logoText from '@/app/components/icons/logo-text.png';
import { listCanvases, createCanvas, deleteCanvas } from '@/app/api/canvas/api';
import { listStoryboards, deleteStoryboard } from '@/app/api/storyboard/api';
import { formatRelativeTime } from '@/app/utils/time';
import { loadLastSavedAt } from '@/app/utils/savedAt';
import { loadLastActiveCanvasId, loadLastViewedStoryboardId } from '@/app/utils/lastSelected';

interface RecentItem {
  id: string;
  label: string;
  time: string;
}

const RECENT_SECTION_VISIBLE_COUNT = 5;

// 더보기
function MoreDotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 4" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="2" cy="2" r="2" fill="currentColor" />
      <circle cx="10" cy="2" r="2" fill="currentColor" />
      <circle cx="18" cy="2" r="2" fill="currentColor" />
    </svg>
  );
}

interface ItemActionsMenuProps {
  onRename: () => void;
  onDelete: () => void;
}

// 더보기 클릭 시 뜨는 드롭다운
function ItemActionsMenu({ onRename, onDelete }: ItemActionsMenuProps) {
  return (
    <div className="bg-surface absolute right-0 top-full z-20 mt-1 flex w-fit flex-col gap-4 rounded-2xl p-5 shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)]">
      <button type="button" onClick={onRename} className="text-text-secondary flex cursor-pointer items-center gap-2 whitespace-nowrap">
        <PencilLineIcon className="size-4" />
        <span className="text-caption-12">이름 바꾸기</span>
      </button>
      <button type="button" onClick={onDelete} className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-[#cc0126]">
        <TrashIcon className="size-4" />
        <span className="text-caption-12">삭제하기</span>
      </button>
    </div>
  );
}

interface RecentSectionProps {
  title: string;
  items: RecentItem[];
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onCreateNew: () => void;
  onDeleteItem: (id: string) => void;
}

function RecentSection({ title, items, icon: Icon, selectedId, onSelectItem, onCreateNew, onDeleteItem }: RecentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);
  const hasMore = items.length > RECENT_SECTION_VISIBLE_COUNT;
  const visibleItems = isExpanded ? items : items.slice(0, RECENT_SECTION_VISIBLE_COUNT);

  // 드롭다운이 열려있을 때 바깥 클릭하면 닫기
  useEffect(() => {
    if (!openMenuItemId) return;
    function handleOutsideClick(e: MouseEvent) {
      if (openMenuRef.current && !openMenuRef.current.contains(e.target as Node)) setOpenMenuItemId(null);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [openMenuItemId]);

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
          const isMenuOpen = openMenuItemId === item.id;
          const showActions = isSelected || isMenuOpen;
          return (
            <div
              key={item.id}
              ref={isMenuOpen ? openMenuRef : undefined}
              className={`group relative flex w-full items-center justify-between px-3 py-2 ${isSelected ? 'rounded-xl bg-background' : 'rounded-2xl'}`}
            >
              <button type="button" onClick={() => onSelectItem(item.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left">
                <Icon className={`size-4 shrink-0 ${isSelected ? 'text-primary' : 'text-text-primary'}`} />
                <p className={`truncate text-label-regular-14 ${isSelected ? 'text-primary' : 'text-text-primary'}`}>{item.label}</p>
              </button>

              <div className="flex shrink-0 items-center gap-2 pl-2">
                <p className={`text-caption-12 text-text-disabled ${showActions ? 'hidden' : 'group-hover:hidden'}`}>{item.time}</p>
                <button
                  type="button"
                  aria-label="더보기"
                  onClick={() => setOpenMenuItemId((prev) => (prev === item.id ? null : item.id))}
                  className={`text-text-primary size-5 shrink-0 cursor-pointer items-center justify-center ${showActions ? 'flex' : 'hidden group-hover:flex'}`}
                >
                  <MoreDotsIcon className="w-5" />
                </button>
              </div>

              {isMenuOpen && (
                <ItemActionsMenu
                  onRename={() => setOpenMenuItemId(null)}
                  onDelete={() => {
                    setOpenMenuItemId(null);
                    onDeleteItem(item.id);
                  }}
                />
              )}
            </div>
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

  // 캔버스 삭제
  async function handleDeleteCanvas(id: string) {
    if (!confirm('이 캔버스를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
    try {
      await deleteCanvas(Number(id));
      setCanvasItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      alert('캔버스 삭제에 실패했습니다.');
    }
  }

  // 스토리보드 삭제
  async function handleDeleteStoryboard(id: string) {
    if (!confirm('이 스토리보드를 삭제할까요? 삭제하면 되돌릴 수 없어요.')) return;
    try {
      await deleteStoryboard(Number(id));
      setStoryboardItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error(error);
      alert('스토리보드 삭제에 실패했습니다.');
    }
  }

  return (
    <div className="bg-card scrollbar-none flex h-full w-101 flex-col overflow-y-auto rounded-r-xl">
      <div className="flex w-full items-center gap-2 p-8">
        <button type="button" aria-label="메뉴 닫기" onClick={onClose} className="text-text-primary size-6 shrink-0 cursor-pointer">
          <MenuIcon className="size-6" />
        </button>
        <Image src={logoMark} alt="" className="size-6" />
        <Image src={logoText} alt="GeNova" className="h-4.5 w-20" />
      </div>

      <div className="bg-border h-px w-full shrink-0" />

      <RecentSection
        title="스토리보드"
        items={storyboardItems}
        icon={ClapperboardIcon}
        selectedId={selectedStoryboardId}
        onSelectItem={handleSelectStoryboard}
        onCreateNew={handleCreateStoryboard}
        onDeleteItem={handleDeleteStoryboard}
      />

      <div className="bg-border h-px w-full shrink-0" />

      <RecentSection
        title="캔버스"
        items={canvasItems}
        icon={FolderClosedIcon}
        selectedId={selectedCanvasId}
        onSelectItem={handleSelectCanvas}
        onCreateNew={handleCreateCanvas}
        onDeleteItem={handleDeleteCanvas}
      />

      <div className="bg-border h-px w-full shrink-0" />
    </div>
  );
}

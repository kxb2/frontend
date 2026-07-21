'use client';

import { useState, type ComponentType, type SVGProps } from 'react';
import Image from 'next/image';
import XIcon from '@/app/components/icons/x.svg';
import logoMark from '@/app/components/icons/logo-mark.png';
import PlusIcon from '@/app/components/icons/plus.svg';
import ClapperboardIcon from '@/app/components/icons/clapperboard.svg';
import ChevronDownIcon from '@/app/components/icons/chevron-down.svg';
import FolderClosedIcon from '@/app/components/icons/folder-closed.svg';

const STORYBOARD_ITEMS = [
  { label: 'My Storyboard 1', time: '방금전' },
  { label: 'My Storyboard 2', time: '1시간 전' },
  { label: 'My Storyboard 3', time: '어제' },
  { label: 'My Storyboard 4', time: '지난 주' },
  { label: 'My Storyboard 5', time: '저번 달' },
];

const CANVAS_ITEMS = [
  { label: 'Canvas 1', time: '방금 전' },
  { label: 'Canvas 2', time: '1분 전' },
  { label: 'Canvas 3', time: '방금 전' },
  { label: 'Canvas 4', time: '1분 전' },
  { label: 'Canvas 5', time: '방금 전' },
  { label: 'Canvas 6', time: '1분 전' },
];

const RECENT_SECTION_VISIBLE_COUNT = 5;

interface RecentSectionProps {
  title: string;
  items: { label: string; time: string }[];
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  selectedLabel: string | null;
  onSelectItem: (label: string) => void;
}

function RecentSection({ title, items, icon: Icon, selectedLabel, onSelectItem }: RecentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMore = items.length > RECENT_SECTION_VISIBLE_COUNT;
  const visibleItems = isExpanded ? items : items.slice(0, RECENT_SECTION_VISIBLE_COUNT);

  return (
    <div className="flex w-full flex-col gap-4 px-8 py-5">
      <div className="flex w-full items-center justify-between">
        <p className="text-label-semibold-16 text-text-secondary">{title}</p>
        {/* 실제 생성 흐름이 붙기 전까지는 눌러도 동작 없음 */}
        <button type="button" className="text-text-secondary flex cursor-pointer items-center gap-2 rounded-lg border border-text-disabled px-3 py-1">
          <PlusIcon className="size-2.5" />
          <span className="text-label-semibold-12">새로 만들기</span>
        </button>
      </div>

      <div className="flex w-full flex-col gap-2">
        {visibleItems.map((item) => {
          const isSelected = item.label === selectedLabel;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelectItem(item.label)}
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
  onClose: () => void;
}

export default function Library({ onClose }: LibraryProps) {
  const [selectedRecentItem, setSelectedRecentItem] = useState<{ section: string; label: string } | null>(null);
  return (
    <div className="bg-card scrollbar-none flex h-full w-101 flex-col overflow-y-auto rounded-r-xl">
      <div className="flex w-full items-center justify-between p-8">
        <Image src={logoMark} alt="GeNova" className="size-11" />
        <button type="button" aria-label="닫기" onClick={onClose} className="text-text-secondary size-5 shrink-0 cursor-pointer">
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="bg-border h-px w-full shrink-0" />

      <RecentSection
        title="스토리보드"
        items={STORYBOARD_ITEMS}
        icon={ClapperboardIcon}
        selectedLabel={selectedRecentItem?.section === '스토리보드' ? selectedRecentItem.label : null}
        onSelectItem={(label) => setSelectedRecentItem({ section: '스토리보드', label })}
      />

      <div className="bg-border h-px w-full shrink-0" />

      <RecentSection
        title="캔버스"
        items={CANVAS_ITEMS}
        icon={FolderClosedIcon}
        selectedLabel={selectedRecentItem?.section === '캔버스' ? selectedRecentItem.label : null}
        onSelectItem={(label) => setSelectedRecentItem({ section: '캔버스', label })}
      />

      <div className="bg-border h-px w-full shrink-0" />
    </div>
  );
}

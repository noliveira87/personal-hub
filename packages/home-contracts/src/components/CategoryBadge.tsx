import { ContractCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '@/types/contract';

export function CategoryBadge({ category }: { category: ContractCategory }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
      <span>{CATEGORY_ICONS[category]}</span>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

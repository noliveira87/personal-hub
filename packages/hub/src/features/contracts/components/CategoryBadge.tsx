import { ContractCategory, ContractType, CATEGORY_LABELS, getContractCategoryIcon } from '@/features/contracts/types/contract';

export function CategoryBadge({ category, contractType }: { category: ContractCategory; contractType?: ContractType }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
      <span>{getContractCategoryIcon(category, contractType)}</span>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

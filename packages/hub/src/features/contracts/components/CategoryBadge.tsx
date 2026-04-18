import { useI18n } from '@/i18n/I18nProvider';
import { ContractCategory, ContractType, CATEGORY_LABELS, CATEGORY_NAME_KEYS, getContractCategoryIcon } from '@/features/contracts/types/contract';

export function CategoryBadge({ category, contractType }: { category: ContractCategory; contractType?: ContractType }) {
  const { t } = useI18n();

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
      <span>{getContractCategoryIcon(category, contractType)}</span>
      {t(`contracts.categoryNames.${CATEGORY_NAME_KEYS[category]}`) || CATEGORY_LABELS[category]}
    </span>
  );
}

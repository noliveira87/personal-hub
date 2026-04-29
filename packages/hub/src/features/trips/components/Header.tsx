import AppSectionHeader from "@/components/AppSectionHeader";
import { useI18n } from "@/i18n/I18nProvider";
import { ReactNode } from "react";
import { Compass } from "lucide-react";

type HeaderProps = {
  actions?: ReactNode;
  backTo?: string | number;
  backLabel?: string;
  onBack?: () => void;
};

export function Header({ actions, backTo = "/", backLabel, onBack }: HeaderProps) {
  const { t } = useI18n();

  return (
    <>
      <AppSectionHeader
        title={t("trips.headerTitle")}
        icon={Compass}
        backTo={backTo}
        backLabel={backLabel ?? t("common.backToProjects")}
        onBack={onBack}
        actions={actions}
      />
      <div className="h-16" aria-hidden="true" />
    </>
  );
}

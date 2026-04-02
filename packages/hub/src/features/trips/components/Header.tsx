import AppSectionHeader from "@/components/AppSectionHeader";
import { useI18n } from "@/i18n/I18nProvider";
import { ReactNode } from "react";
import { Compass } from "lucide-react";

type HeaderProps = {
  actions?: ReactNode;
};

export function Header({ actions }: HeaderProps) {
  const { t } = useI18n();

  return (
    <>
      <AppSectionHeader
        title={t("trips.headerTitle")}
        icon={Compass}
        backTo="/"
        backLabel={t("common.backToProjects")}
        actions={actions}
      />
      <div className="h-16" aria-hidden="true" />
    </>
  );
}

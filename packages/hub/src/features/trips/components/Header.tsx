import AppSectionHeader from "@/components/AppSectionHeader";
import { useI18n } from "@/i18n/I18nProvider";
import { Compass } from "lucide-react";

export function Header() {
  const { t } = useI18n();

  return (
    <>
      <AppSectionHeader
        title={t("trips.headerTitle")}
        icon={Compass}
        backTo="/"
        backLabel={t("common.backToProjects")}
      />
      <div className="h-16" aria-hidden="true" />
    </>
  );
}

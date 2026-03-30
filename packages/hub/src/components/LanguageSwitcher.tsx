import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border/70 bg-card/80 p-1 backdrop-blur-sm",
        className,
      )}
      role="group"
      aria-label={t("common.language")}
    >
      {(["pt", "en"] as const).map((item) => {
        const active = language === item;
        const label = item.toUpperCase();

        return (
          <Button
            key={item}
            type="button"
            variant="ghost"
            size={compact ? "sm" : "default"}
            onClick={() => setLanguage(item)}
            className={cn(
              "rounded-full px-3 text-xs font-semibold tracking-[0.14em]",
              active ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background" : "text-muted-foreground",
              compact ? "h-8" : "h-9",
            )}
            aria-pressed={active}
            aria-label={item === "pt" ? t("common.portuguese") : t("common.english")}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
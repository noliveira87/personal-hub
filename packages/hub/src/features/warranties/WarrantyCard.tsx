import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getStatus, getDaysLeft, type Warranty } from "@/lib/warranties";
import { formatHiddenAmount, isHideAmountsEnabled } from "@/lib/moneyPrivacy";
import { ChevronDown, Trash2, FileText, Pencil, Archive } from "lucide-react";
import { EditWarrantyDialog } from "./EditWarrantyDialog";
import { useI18n } from "@/i18n/I18nProvider";

interface Props {
  warranty: Warranty;
  onDelete: (id: string) => void;
  onEdit: (updated: Warranty) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  index: number;
}

export function WarrantyCard({ warranty, onDelete, onEdit, onArchive, onUnarchive, index }: Props) {
  const { t, formatDate: formatDateValue } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const status = getStatus(warranty);
  const daysLeft = getDaysLeft(warranty);
  const categoryLabel = {
    tech: t("warranties.category.tech"),
    appliances: t("warranties.category.appliances"),
    tools: t("warranties.category.tools"),
    others: t("warranties.category.others"),
  }[warranty.category];

  const statusLabel = {
    active: t("warranties.status.active"),
    expiring: t("warranties.status.expiring"),
    expired: t("warranties.status.expired"),
  }[status];

  const formatDisplayDate = (iso: string) =>
    formatDateValue(iso, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatPrice = (price: number) => {
    if (isHideAmountsEnabled()) {
      return formatHiddenAmount("EUR");
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  return (
    <>
      <div
        className="fade-in-up bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform"
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              status === "active"
                ? "bg-status-active"
                : status === "expiring"
                ? "bg-status-expiring"
                : "bg-status-expired"
            }`}
          />
          <div className="flex-1 min-w-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="font-medium text-card-foreground truncate">
                  {warranty.productName}
                </p>
              </TooltipTrigger>
              <TooltipContent side="top" align="start">
                {warranty.productName}
              </TooltipContent>
            </Tooltip>
            <p className="text-xs text-muted-foreground mt-0.5">
              {status === "expired"
                ? t("warranties.expiredOn", { date: formatDisplayDate(warranty.expirationDate) })
                : `${daysLeft} ${daysLeft === 1 ? t("warranties.day") : t("warranties.days")} ${t("warranties.left")}`}
            </p>
          </div>
          {warranty.receiptDataUrl && (
            <Badge variant="secondary" className="shrink-0 gap-1.5">
              <FileText className="h-3 w-3" />
              {t("warranties.invoice")}
            </Badge>
          )}
          {warranty.archivedAt && (
            <Badge variant="secondary" className="shrink-0">
              {t("warranties.archived")}
            </Badge>
          )}
          <Badge variant={status}>{statusLabel}</Badge>
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </button>

        {expanded && (
          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-border/60">
            <div className="grid grid-cols-2 gap-3 pt-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{t("warranties.purchased")}</p>
                <p className="font-medium">{formatDisplayDate(warranty.purchaseDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("warranties.expires")}</p>
                <p className="font-medium">{formatDisplayDate(warranty.expirationDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("warranties.duration")}</p>
                <p className="font-medium">{t("warranties.yearsCount", { count: warranty.warrantyYears })}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t("warranties.categoryLabel")}</p>
                <p className="font-medium">{categoryLabel}</p>
              </div>
              {warranty.price !== undefined && (
                <div>
                  <p className="text-muted-foreground text-xs">{t("warranties.price")}</p>
                  <p className="font-medium">{formatPrice(warranty.price)}</p>
                </div>
              )}
              {warranty.purchasedFrom && (
                <div>
                  <p className="text-muted-foreground text-xs">{t("warranties.purchasedFrom")}</p>
                  <p className="font-medium">{warranty.purchasedFrom}</p>
                </div>
              )}
            </div>

            {warranty.receiptDataUrl && (
              <a
                href={warranty.receiptDataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileText className="h-3.5 w-3.5" />
                {t("warranties.viewReceipt")}
              </a>
            )}

            <div className="flex items-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditOpen(true);
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors active:scale-[0.96]"
              >
                <Pencil className="h-3 w-3" />
                {t("warranties.edit")}
              </button>
              {warranty.archivedAt ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnarchive(warranty.id);
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors active:scale-[0.96]"
                >
                  <Archive className="h-3 w-3" />
                  {t("warranties.restore")}
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(warranty.id);
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-yellow-600 transition-colors active:scale-[0.96]"
                >
                  <Archive className="h-3 w-3" />
                  {t("warranties.archive")}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(warranty.id);
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors active:scale-[0.96]"
              >
                <Trash2 className="h-3 w-3" />
                {t("warranties.delete")}
              </button>
            </div>
          </div>
        )}
      </div>

      <EditWarrantyDialog
        warranty={warranty}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={onEdit}
      />
    </>
  );
}

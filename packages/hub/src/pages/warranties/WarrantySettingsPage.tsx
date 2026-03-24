import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import AppSectionHeader from "@/components/AppSectionHeader";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_WARRANTY_NOTIFICATION_SETTINGS,
  loadWarrantyNotificationSettings,
  persistWarrantyNotificationSettings,
  type WarrantyNotificationSettings,
} from "@/features/warranties/lib/notificationSettings";

export default function WarrantySettingsPage() {
  const navigate = useNavigate();
  const [notificationSettings, setNotificationSettings] = useState<WarrantyNotificationSettings>(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const [notificationSaved, setNotificationSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loaded = await loadWarrantyNotificationSettings();
        setNotificationSettings(loaded);
      } catch (error) {
        console.error("Error loading warranty settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleSaveNotificationSettings = async () => {
    setSavingNotificationSettings(true);
    try {
      await persistWarrantyNotificationSettings(notificationSettings);
      setNotificationSaved(true);
      setTimeout(() => setNotificationSaved(false), 2000);
    } finally {
      setSavingNotificationSettings(false);
    }
  };

  const backAction = (
    <button
      onClick={() => navigate("/warranties")}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Back</span>
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader
        title="Warranty Settings"
        icon={Bell}
        actions={backAction}
      />

      <div className="max-w-lg mx-auto px-4 pt-20 pb-24">
        <div className="fade-in-up mb-6 rounded-2xl border bg-card p-6 space-y-6" style={{ animationDelay: "80ms" }}>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Warranty notifications</h2>
            <p className="text-sm text-muted-foreground">Configure how and when you receive alerts about expiring warranties.</p>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between gap-4 rounded-xl border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable warranty alerts</p>
              <p className="text-xs text-muted-foreground">Send Telegram messages for products nearing expiry</p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.enabled}
              onChange={(e) => setNotificationSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4 rounded"
            />
          </div>

          <div>
            <label htmlFor="warranty-alert-days" className="mb-1.5 block text-sm font-medium text-foreground">Alert lead time (days)</label>
            <Input
              id="warranty-alert-days"
              type="number"
              min={1}
              max={365}
              value={notificationSettings.alertDays}
              onChange={(e) => setNotificationSettings((prev) => ({ ...prev, alertDays: Math.max(1, Number(e.target.value) || 1) }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Controls how far ahead this feature starts notifying.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void handleSaveNotificationSettings()}
              disabled={savingNotificationSettings}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {savingNotificationSettings ? 'Saving…' : notificationSaved ? '✓ Saved!' : 'Save warranty settings'}
            </button>
            <p className="text-xs text-muted-foreground">Stored separately from global Telegram credentials.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

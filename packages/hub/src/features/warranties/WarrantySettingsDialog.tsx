import { useEffect, useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Check, Save, Settings2 } from 'lucide-react';
import type { WarrantyCategory } from '@/lib/warranties';
import {
  DEFAULT_WARRANTY_DEFAULTS_SETTINGS,
  loadWarrantyDefaultsSettings,
  persistWarrantyDefaultsSettings,
} from './lib/defaultSettings';
import {
  DEFAULT_WARRANTY_NOTIFICATION_SETTINGS,
  loadWarrantyNotificationSettings,
  persistWarrantyNotificationSettings,
} from './lib/notificationSettings';

type DefaultYears = 2 | 3;

const CATEGORY_OPTIONS: { value: WarrantyCategory; label: string }[] = [
  { value: 'tech', label: 'Tech' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'others', label: 'Others' },
];

export function WarrantySettingsDialog({ trigger }: { trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);

  const [defaultCategory, setDefaultCategory] = useState<WarrantyCategory>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultCategory);
  const [defaultYears, setDefaultYears] = useState<DefaultYears>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultYears);
  const [alertsEnabled, setAlertsEnabled] = useState(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.enabled);
  const [alertDays, setAlertDays] = useState(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.alertDays);

  const [initialCategory, setInitialCategory] = useState<WarrantyCategory>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultCategory);
  const [initialYears, setInitialYears] = useState<DefaultYears>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultYears);
  const [initialAlertsEnabled, setInitialAlertsEnabled] = useState(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.enabled);
  const [initialAlertDays, setInitialAlertDays] = useState(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.alertDays);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const loadSettings = async () => {
      const [defaults, notifications] = await Promise.all([
        loadWarrantyDefaultsSettings(),
        loadWarrantyNotificationSettings(),
      ]);

      if (cancelled) return;

      setDefaultCategory(defaults.defaultCategory);
      setDefaultYears(defaults.defaultYears);
      setAlertsEnabled(notifications.enabled);
      setAlertDays(notifications.alertDays);

      setInitialCategory(defaults.defaultCategory);
      setInitialYears(defaults.defaultYears);
      setInitialAlertsEnabled(notifications.enabled);
      setInitialAlertDays(notifications.alertDays);
    };

    void loadSettings();

    return () => {
      cancelled = true;
      setSaved(false);
      setIsSaving(false);
    };
  }, [open]);

  const hasChanges =
    defaultCategory !== initialCategory ||
    defaultYears !== initialYears ||
    alertsEnabled !== initialAlertsEnabled ||
    alertDays !== initialAlertDays;

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);

    const normalizedAlertDays = Math.max(1, Math.floor(Number(alertDays) || 1));

    try {
      await Promise.all([
        persistWarrantyDefaultsSettings({
          defaultCategory,
          defaultYears,
        }),
        persistWarrantyNotificationSettings({
          enabled: alertsEnabled,
          alertDays: normalizedAlertDays,
        }),
      ]);

      setAlertDays(normalizedAlertDays);
      setInitialCategory(defaultCategory);
      setInitialYears(defaultYears);
      setInitialAlertsEnabled(alertsEnabled);
      setInitialAlertDays(normalizedAlertDays);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } finally {
      setIsSaving(false);
    }
  };

  const restoreDefaults = () => {
    setDefaultCategory(DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultCategory);
    setDefaultYears(DEFAULT_WARRANTY_DEFAULTS_SETTINGS.defaultYears);
    setAlertsEnabled(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.enabled);
    setAlertDays(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS.alertDays);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="h-10 w-10 rounded-xl sm:h-9 sm:w-auto sm:rounded-lg sm:px-3" aria-label="Warranty settings" title="Warranty settings">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>Warranty settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Default category</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDefaultCategory(option.value)}
                  className={`h-10 rounded-lg text-sm font-medium transition-all active:scale-[0.96] ${
                    defaultCategory === option.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Default warranty length</p>
            <div className="grid grid-cols-2 gap-2">
              {([2, 3] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDefaultYears(value)}
                  className={`h-10 rounded-lg text-sm font-medium transition-all active:scale-[0.96] ${
                    defaultYears === value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                  }`}
                >
                  {value} years
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Telegram warranty alerts</p>
                <p className="text-xs text-muted-foreground">Send reminders before expiration</p>
              </div>
              <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} aria-label="Enable warranty alerts" />
            </div>

            <div>
              <label htmlFor="warranty-alert-days" className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Alert days before expiration
              </label>
              <Input
                id="warranty-alert-days"
                type="number"
                min={1}
                max={365}
                value={alertDays}
                onChange={(event) => setAlertDays(Math.max(1, Number(event.target.value) || 1))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" onClick={restoreDefaults}>
              Restore defaults
            </Button>
            <div className="flex items-center gap-2">
              {saved && <Badge variant="secondary">Saved</Badge>}
              <Button type="button" onClick={() => void handleSave()} disabled={isSaving || !hasChanges} className="gap-2">
                {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? 'Saved' : isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
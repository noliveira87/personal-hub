import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Save } from 'lucide-react';
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

export function WarrantySettingsMenuSection() {
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
    };
  }, []);

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

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase">Warranties</p>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Default category</p>
        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDefaultCategory(option.value)}
              className={`h-8 rounded-md text-xs font-medium transition-all active:scale-[0.96] ${
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

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Default length</p>
        <div className="grid grid-cols-2 gap-1.5">
          {([2, 3] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDefaultYears(value)}
              className={`h-8 rounded-md text-xs font-medium transition-all active:scale-[0.96] ${
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

      <div className="rounded-md border p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-foreground">Telegram alerts</p>
          <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} aria-label="Enable warranty alerts" />
        </div>

        <div>
          <label htmlFor="warranty-alert-days-menu" className="mb-1 block text-xs font-medium text-muted-foreground">
            Alert days before expiration
          </label>
          <Input
            id="warranty-alert-days-menu"
            type="number"
            min={1}
            max={365}
            value={alertDays}
            onChange={(event) => setAlertDays(Math.max(1, Number(event.target.value) || 1))}
            className="h-8"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {saved && <Badge variant="secondary">Saved</Badge>}
        <Button type="button" size="sm" onClick={() => void handleSave()} disabled={isSaving || !hasChanges} className="gap-1.5">
          {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved' : isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}

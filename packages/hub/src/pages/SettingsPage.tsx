import { useEffect, useMemo, useState } from 'react';
import { Send, Settings, Bell } from 'lucide-react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppSectionHeader from '@/components/AppSectionHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useLocation } from 'react-router-dom';
import {
  getSettingsPersistenceMode,
  loadTelegramConfig,
  persistTelegramConfig,
  sendTestMessage,
} from '@/lib/telegram';
import {
  DEFAULT_WARRANTY_NOTIFICATION_SETTINGS,
  loadWarrantyNotificationSettings,
  persistWarrantyNotificationSettings,
  type WarrantyNotificationSettings,
} from '@/features/warranties/lib/notificationSettings';

export default function SettingsPage() {
  const { t } = useI18n();
  const location = useLocation();
  const locationState = (location.state as { from?: string; fromPath?: string } | null) ?? null;
  const isFromWarranties = locationState?.from === 'warranties';
  const backToPath: string | number = locationState?.fromPath ?? (window.history.length > 1 ? -1 : '/');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [warrantyNotificationSettings, setWarrantyNotificationSettings] = useState<WarrantyNotificationSettings>(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS);
  const [savingWarrantyNotificationSettings, setSavingWarrantyNotificationSettings] = useState(false);
  const [warrantyNotificationSaved, setWarrantyNotificationSaved] = useState(false);
  const storageMode = useMemo(() => getSettingsPersistenceMode(), []);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const telegramConfig = await loadTelegramConfig();

        if (cancelled) return;

        setTelegramBotToken(telegramConfig.botToken);
        setTelegramChatId(telegramConfig.chatId);

        if (isFromWarranties) {
          const warrantySettings = await loadWarrantyNotificationSettings();
          if (cancelled) return;
          setWarrantyNotificationSettings(warrantySettings);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [isFromWarranties]);

  const handleSave = async () => {
    await persistTelegramConfig({
      botToken: telegramBotToken,
      chatId: telegramChatId,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSendTest = async () => {
    const token = telegramBotToken.trim();
    const chatId = telegramChatId.trim();

    if (!token || !chatId) {
      setTestStatus({ type: 'error', message: t('settingsPage.fillTelegramFirst') });
      return;
    }

    setSendingTest(true);
    setTestStatus(null);

    try {
      await persistTelegramConfig({ botToken: token, chatId });
      await sendTestMessage();

      setTestStatus({ type: 'success', message: t('settingsPage.testSuccess') });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('settingsPage.unexpectedTestError');
      setTestStatus({ type: 'error', message });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveWarrantyNotificationSettings = async () => {
    setSavingWarrantyNotificationSettings(true);
    try {
      await persistWarrantyNotificationSettings(warrantyNotificationSettings);
      setWarrantyNotificationSaved(true);
      setTimeout(() => setWarrantyNotificationSaved(false), 2000);
    } finally {
      setSavingWarrantyNotificationSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppSectionHeader title={t('settingsPage.title')} icon={Settings} showSettings={false} backTo={backToPath} backLabel={t('common.back')} />
        <div className="mx-auto max-w-2xl space-y-6 px-4 pt-20 sm:px-6 lg:px-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('settingsPage.title')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('settingsPage.loadingPreferences')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader title={t('settingsPage.title')} icon={Settings} showSettings={false} backTo={backToPath} backLabel={t('common.back')} />

      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-8 pt-20 sm:px-6 lg:px-0">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground">{t('settingsPage.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('settingsPage.description')}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('settingsPage.storageMode')}: <span className="font-medium text-foreground">{storageMode === 'local' ? t('settingsPage.localStorage') : t('settingsPage.databaseSync')}</span>
          </p>
        </div>

        <div className="animate-fade-up space-y-4 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{t('settingsPage.languageCardTitle')}</h2>
            <p className="text-xs text-muted-foreground">{t('settingsPage.languageCardDescription')}</p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Telegram */}
        <div className="animate-fade-up space-y-4 rounded-xl border bg-card p-6" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t('settingsPage.telegramTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('settingsPage.telegramDescription')}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="telegram-bot-token" className="mb-1.5 block">{t('settingsPage.botToken')}</Label>
              <Input
                id="telegram-bot-token"
                value={telegramBotToken}
                onChange={e => setTelegramBotToken(e.target.value)}
                placeholder="123456:ABC-DEF..."
                type="password"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('settingsPage.botTokenHint')}</p>
            </div>
            <div>
              <Label htmlFor="telegram-chat-id" className="mb-1.5 block">{t('settingsPage.chatId')}</Label>
              <Input
                id="telegram-chat-id"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder={t('settingsPage.yourChatId')}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('settingsPage.chatIdHint')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void handleSave()}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
              >
                {saved ? t('settingsPage.saved') : t('settingsPage.saveSettings')}
              </button>
              <button
                onClick={() => void handleSendTest()}
                disabled={sendingTest}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted active:scale-95 disabled:opacity-60"
              >
                {sendingTest ? t('settingsPage.sending') : t('settingsPage.sendTestMessage')}
              </button>
            </div>
            {testStatus && (
              <p className={`text-xs mt-2 ${testStatus.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}>
                {testStatus.message}
              </p>
            )}
          </div>
        </div>

        {isFromWarranties && (
          <div className="animate-fade-up space-y-4 rounded-xl border bg-card p-6" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">{t('settingsPage.warrantyTitle')}</h2>
                <p className="text-xs text-muted-foreground">{t('settingsPage.warrantyDescription')}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{t('settingsPage.warrantyEnabled')}</p>
                  <p className="text-xs text-muted-foreground">{t('settingsPage.warrantyEnabledHint')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={warrantyNotificationSettings.enabled}
                  onChange={(e) => setWarrantyNotificationSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                  className="h-4 w-4 rounded"
                />
              </div>

              <div>
                <Label htmlFor="warranty-alert-days" className="mb-1.5 block">{t('settingsPage.warrantyLeadTime')}</Label>
                <Input
                  id="warranty-alert-days"
                  type="number"
                  min={1}
                  max={365}
                  value={warrantyNotificationSettings.alertDays}
                  onChange={(e) => setWarrantyNotificationSettings((prev) => ({ ...prev, alertDays: Math.max(1, Number(e.target.value) || 1) }))}
                />
                <p className="mt-1 text-xs text-muted-foreground">{t('settingsPage.warrantyLeadTimeHint')}</p>
              </div>

              <button
                onClick={() => void handleSaveWarrantyNotificationSettings()}
                disabled={savingWarrantyNotificationSettings}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-60"
              >
                {savingWarrantyNotificationSettings ? t('settingsPage.savingWarranty') : warrantyNotificationSaved ? t('settingsPage.saved') : t('settingsPage.saveWarranty')}
              </button>
            </div>
          </div>
        )}

        <div className="animate-fade-up rounded-xl border bg-card p-6" style={{ animationDelay: isFromWarranties ? '240ms' : '160ms' }}>
          <p className="text-sm font-medium text-foreground">{t('settingsPage.featureNotificationsTitle')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{isFromWarranties ? t('settingsPage.featureNotificationsConfigured') : t('settingsPage.featureNotificationsDescription')}</p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Bell, Send, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import AppSectionHeader from '@/components/AppSectionHeader';
import {
  type AlertSettings,
  getSettingsPersistenceMode,
  loadAlertSettings,
  loadTelegramConfig,
  persistAlertSettings,
  persistTelegramConfig,
  sendTestMessage,
} from '@/lib/telegram';

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  warrantiesEnabled: true,
  contractsEnabled: true,
  portfolioEnabled: false,
  warrantyAlertDays: 30,
};

export default function SettingsPage() {
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const storageMode = useMemo(() => getSettingsPersistenceMode(), []);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const [telegramConfig, alerts] = await Promise.all([
          loadTelegramConfig(),
          loadAlertSettings(),
        ]);

        if (cancelled) return;

        setTelegramBotToken(telegramConfig.botToken);
        setTelegramChatId(telegramConfig.chatId);
        setAlertSettings(alerts);
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
  }, []);

  const handleSave = async () => {
    await Promise.all([
      persistTelegramConfig({
        botToken: telegramBotToken,
        chatId: telegramChatId,
      }),
      persistAlertSettings(alertSettings),
    ]);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSendTest = async () => {
    const token = telegramBotToken.trim();
    const chatId = telegramChatId.trim();

    if (!token || !chatId) {
      setTestStatus({ type: 'error', message: 'Fill Bot Token and Chat ID first.' });
      return;
    }

    setSendingTest(true);
    setTestStatus(null);

    try {
      await persistTelegramConfig({ botToken: token, chatId });
      await sendTestMessage();

      setTestStatus({ type: 'success', message: 'Test message sent successfully ✅' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while sending message.';
      setTestStatus({ type: 'error', message });
    } finally {
      setSendingTest(false);
    }
  };

  const updateAlertSetting = <K extends keyof AlertSettings>(key: K, value: AlertSettings[K]) => {
    setAlertSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppSectionHeader title="Settings" icon={Settings} showSettings={false} />
        <div className="mx-auto max-w-2xl space-y-6 px-4 pt-20 sm:px-6 lg:px-0">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Loading your preferences…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSectionHeader title="Settings" icon={Settings} showSettings={false} />

      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-8 pt-20 sm:px-6 lg:px-0">
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configure your preferences and integrations</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Storage mode: <span className="font-medium text-foreground">{storageMode === 'local' ? 'Local browser storage' : 'Database sync'}</span>
          </p>
        </div>

        {/* Telegram */}
        <div className="animate-fade-up space-y-4 rounded-xl border bg-card p-6" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Send className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Telegram Integration</h2>
              <p className="text-xs text-muted-foreground">Receive alerts via Telegram before contracts expire</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="telegram-bot-token" className="mb-1.5 block">Bot Token</Label>
              <Input
                id="telegram-bot-token"
                value={telegramBotToken}
                onChange={e => setTelegramBotToken(e.target.value)}
                placeholder="123456:ABC-DEF..."
                type="password"
              />
              <p className="mt-1 text-xs text-muted-foreground">Get from @BotFather on Telegram</p>
            </div>
            <div>
              <Label htmlFor="telegram-chat-id" className="mb-1.5 block">Chat ID</Label>
              <Input
                id="telegram-chat-id"
                value={telegramChatId}
                onChange={e => setTelegramChatId(e.target.value)}
                placeholder="Your chat ID"
              />
              <p className="mt-1 text-xs text-muted-foreground">Send /start to @userinfobot to get your ID</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void handleSave()}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95"
              >
                {saved ? '✓ Saved!' : 'Save Settings'}
              </button>
              <button
                onClick={() => void handleSendTest()}
                disabled={sendingTest}
                className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted active:scale-95 disabled:opacity-60"
              >
                {sendingTest ? 'Sending…' : 'Send Test Message'}
              </button>
            </div>
            {testStatus && (
              <p className={`text-xs mt-2 ${testStatus.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}>
                {testStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* Alerts defaults */}
        <div className="animate-fade-up space-y-4 rounded-xl border bg-card p-6" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Bell className="h-4 w-4 text-warning" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Alerts & defaults</h2>
              <p className="text-xs text-muted-foreground">Consistent app-level settings, ready to move into a database later</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Warranty alerts</p>
                <p className="text-xs text-muted-foreground">Send Telegram alerts for warranties nearing expiry</p>
              </div>
              <Switch
                checked={alertSettings.warrantiesEnabled}
                onCheckedChange={(checked) => updateAlertSetting('warrantiesEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Contract alerts</p>
                <p className="text-xs text-muted-foreground">Enable Telegram reminders for contracts and renewals</p>
              </div>
              <Switch
                checked={alertSettings.contractsEnabled}
                onCheckedChange={(checked) => updateAlertSetting('contractsEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Portfolio alerts</p>
                <p className="text-xs text-muted-foreground">Reserve a toggle for future portfolio notifications</p>
              </div>
              <Switch
                checked={alertSettings.portfolioEnabled}
                onCheckedChange={(checked) => updateAlertSetting('portfolioEnabled', checked)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="warranty-alert-days" className="mb-1.5 block">Default warranty alert lead time</Label>
            <Input
              id="warranty-alert-days"
              type="number"
              min={1}
              max={365}
              value={alertSettings.warrantyAlertDays}
              onChange={(e) => updateAlertSetting('warrantyAlertDays', Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Used as the default threshold before expiry for warranty reminders.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[90, 60, 30, 15, 7, 3, 1].map(d => (
              <span key={d} className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                {d} days
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Alert timing can still be customized per contract in the edit form.</p>
        </div>
      </div>
    </div>
  );
}

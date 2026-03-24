import { useEffect, useMemo, useState } from 'react';
import { Send, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppSectionHeader from '@/components/AppSectionHeader';
import {
  getSettingsPersistenceMode,
  loadTelegramConfig,
  persistTelegramConfig,
  sendTestMessage,
} from '@/lib/telegram';

export default function SettingsPage() {
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const storageMode = useMemo(() => getSettingsPersistenceMode(), []);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const telegramConfig = await loadTelegramConfig();

        if (cancelled) return;

        setTelegramBotToken(telegramConfig.botToken);
        setTelegramChatId(telegramConfig.chatId);
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
          <p className="mt-1 text-sm text-muted-foreground">Configure the shared Telegram integration used by feature-level notification modules</p>
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
              <p className="text-xs text-muted-foreground">Shared bot credentials used by notifications inside each feature</p>
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

        <div className="animate-fade-up rounded-xl border bg-card p-6" style={{ animationDelay: '160ms' }}>
          <p className="text-sm font-medium text-foreground">Feature-level notifications</p>
          <p className="mt-1 text-xs text-muted-foreground">Each module owns its own notification switches, thresholds and send history. Access feature-specific settings inside each module.</p>
        </div>
      </div>
    </div>
  );
}

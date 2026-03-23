import { useState } from 'react';
import { Bell, Send } from 'lucide-react';

export default function SettingsPage() {
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('telegramChatId') || '');
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem('telegramBotToken') || '');
  const [saved, setSaved] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = () => {
    localStorage.setItem('telegramChatId', telegramChatId);
    localStorage.setItem('telegramBotToken', telegramBotToken);
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
      const text = `🧪 Test notification from Home Contracts\n${new Date().toLocaleString()}`;
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          disable_web_page_preview: true,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.ok) {
        const description = result?.description || 'Failed to send test message.';
        throw new Error(description);
      }

      setTestStatus({ type: 'success', message: 'Test message sent successfully ✅' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error while sending message.';
      setTestStatus({ type: 'error', message });
    } finally {
      setSendingTest(false);
    }
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure your preferences and integrations</p>
      </div>

      {/* Telegram */}
      <div className="bg-card rounded-xl p-6 border space-y-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Send className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Telegram Integration</h2>
            <p className="text-xs text-muted-foreground">Receive alerts via Telegram before contracts expire</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Bot Token</label>
            <input
              className={inputClass}
              value={telegramBotToken}
              onChange={e => setTelegramBotToken(e.target.value)}
              placeholder="123456:ABC-DEF..."
              type="password"
            />
            <p className="text-xs text-muted-foreground mt-1">Get from @BotFather on Telegram</p>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Chat ID</label>
            <input
              className={inputClass}
              value={telegramChatId}
              onChange={e => setTelegramChatId(e.target.value)}
              placeholder="Your chat ID"
            />
            <p className="text-xs text-muted-foreground mt-1">Send /start to @userinfobot to get your ID</p>
          </div>
          <button
            onClick={handleSave}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95"
          >
            {saved ? '✓ Saved!' : 'Save Telegram Settings'}
          </button>
          <button
            onClick={handleSendTest}
            disabled={sendingTest}
            className="ml-2 px-4 py-2.5 rounded-lg text-sm font-medium border hover:bg-muted transition-colors active:scale-95 disabled:opacity-60"
          >
            {sendingTest ? 'Sending…' : 'Send Test Message'}
          </button>
          {testStatus && (
            <p className={`text-xs mt-2 ${testStatus.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}>
              {testStatus.message}
            </p>
          )}
        </div>
      </div>

      {/* Alerts defaults */}
      <div className="bg-card rounded-xl p-6 border space-y-4 animate-fade-up" style={{ animationDelay: '160ms' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
            <Bell className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Default Alert Timing</h2>
            <p className="text-xs text-muted-foreground">These are the default reminder windows for new contracts</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[90, 60, 30, 15, 7, 3, 1].map(d => (
            <span key={d} className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {d} days
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Alert timing can be customized per contract in the edit form.</p>
      </div>
    </div>
  );
}

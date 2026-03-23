import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Moon, Send, ShieldCheck, FileCheck2, ChartLine, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getTelegramConfig,
  saveTelegramConfig,
  getAlertSettings,
  saveAlertSettings,
  sendTestMessage,
} from '@/lib/telegram';
import { useDarkMode } from '@shared-ui/use-dark-mode';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isDark, toggleDark } = useDarkMode();

  const [botToken, setBotToken] = useState(() => getTelegramConfig().botToken);
  const [chatId, setChatId] = useState(() => getTelegramConfig().chatId);
  const [telegramSaved, setTelegramSaved] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [alertSettings, setAlertSettings] = useState(() => getAlertSettings());
  const [alertsSaved, setAlertsSaved] = useState(false);

  const handleSaveTelegram = () => {
    saveTelegramConfig({ botToken, chatId });
    setTelegramSaved(true);
    setTimeout(() => setTelegramSaved(false), 2000);
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setTestStatus(null);
    try {
      await sendTestMessage();
      setTestStatus({ type: 'success', message: 'Test message sent successfully ✅' });
    } catch (e) {
      setTestStatus({ type: 'error', message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveAlerts = () => {
    saveAlertSettings(alertSettings);
    setAlertsSaved(true);
    setTimeout(() => setAlertsSaved(false), 2000);
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow';

  const alertDayOptions = [7, 14, 30, 60, 90];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Hub</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleDark} className="text-muted-foreground">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure integrations and alert preferences</p>
        </div>

        {/* Telegram */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Telegram Integration</h2>
              <p className="text-xs text-muted-foreground">Configure once — used by all features</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Bot Token</label>
              <input
                className={inputClass}
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                placeholder="123456:ABC-DEF..."
                type="password"
              />
              <p className="text-xs text-muted-foreground mt-1">Get from @BotFather on Telegram</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Chat ID</label>
              <input
                className={inputClass}
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="Your chat ID"
              />
              <p className="text-xs text-muted-foreground mt-1">Send /start to @userinfobot to get your ID</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleSaveTelegram}
                className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95"
              >
                {telegramSaved ? '✓ Saved!' : 'Save Telegram Settings'}
              </button>
              <button
                onClick={handleSendTest}
                disabled={sendingTest}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border hover:bg-muted transition-colors active:scale-95 disabled:opacity-60"
              >
                {sendingTest ? 'Sending…' : 'Send Test Message'}
              </button>
            </div>
            {testStatus && (
              <p className={`text-xs ${testStatus.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}>
                {testStatus.message}
              </p>
            )}
          </div>
        </div>

        {/* Alert Preferences */}
        <div className="bg-card rounded-xl p-6 border space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Alert Preferences</h2>
              <p className="text-xs text-muted-foreground">Choose which features send Telegram notifications</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Warranties */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Warranty Vault</p>
                  <p className="text-xs text-muted-foreground">Alert when warranties are about to expire</p>
                </div>
              </div>
              <button
                onClick={() => setAlertSettings(s => ({ ...s, warrantiesEnabled: !s.warrantiesEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  alertSettings.warrantiesEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  alertSettings.warrantiesEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Warranty days */}
            {alertSettings.warrantiesEnabled && (
              <div className="pl-7">
                <p className="text-xs font-medium text-foreground mb-2">Alert me this many days before expiry:</p>
                <div className="flex flex-wrap gap-2">
                  {alertDayOptions.map(d => (
                    <button
                      key={d}
                      onClick={() => setAlertSettings(s => ({ ...s, warrantyAlertDays: d }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        alertSettings.warrantyAlertDays === d
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contracts */}
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <FileCheck2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Home Contracts</p>
                  <p className="text-xs text-muted-foreground">Alert when contracts are nearing renewal</p>
                </div>
              </div>
              <button
                onClick={() => setAlertSettings(s => ({ ...s, contractsEnabled: !s.contractsEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  alertSettings.contractsEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  alertSettings.contractsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Portfolio */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <ChartLine className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Portfolio Tracker</p>
                  <p className="text-xs text-muted-foreground">Future: portfolio performance alerts</p>
                </div>
              </div>
              <button
                onClick={() => setAlertSettings(s => ({ ...s, portfolioEnabled: !s.portfolioEnabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  alertSettings.portfolioEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  alertSettings.portfolioEnabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>

          <button
            onClick={handleSaveAlerts}
            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95"
          >
            {alertsSaved ? '✓ Saved!' : 'Save Alert Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
}

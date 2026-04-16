import { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, Send, Settings, Bell, Moon, Sun, Eye, EyeOff, Plus, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import AppSectionHeader from '@/components/AppSectionHeader';
import AppLoadingState from '@/components/AppLoadingState';
import { useI18n } from '@/i18n/I18nProvider';
import { useLocation } from 'react-router-dom';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { useDarkMode } from '@shared-ui/use-dark-mode';
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
import {
  DEFAULT_WARRANTY_DEFAULTS_SETTINGS,
  loadWarrantyDefaultsSettings,
  persistWarrantyDefaultsSettings,
  type WarrantyDefaultsSettings,
} from '@/features/warranties/lib/defaultSettings';
import {
  DEFAULT_CASHBACK_CARD_RULES,
  loadCashbackCardRulesSettings,
  persistCashbackCardRulesSettings,
  type CashbackCardRulesSettings,
} from '@/features/cashback-hero/lib/cardRulesSettings';
import type { WarrantyCategory } from '@/lib/warranties';
import { useCashbackSources } from '@/features/cashback-hero/use-cashback-sources';
import { useCashbackCards } from '@/features/cashback-hero/use-cashback-cards';

const WARRANTY_CATEGORY_OPTIONS: Array<{ value: WarrantyCategory; label: string }> = [
  { value: 'tech', label: 'Tech' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'tools', label: 'Tools' },
  { value: 'others', label: 'Others' },
];

export default function SettingsPage() {
  const { hideAmounts, language, setLanguage, t, toggleHideAmounts } = useI18n();
  const { isDark, toggleDark } = useDarkMode();
  const { sources, addSource, removeSource } = useCashbackSources();
  const { cards, addCard, removeCard } = useCashbackCards();
  const location = useLocation();
  const locationState = (location.state as { from?: string; fromPath?: string } | null) ?? null;
  const backToPath: string | number = locationState?.fromPath ?? (window.history.length > 1 ? -1 : '/');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [warrantyNotificationSettings, setWarrantyNotificationSettings] = useState<WarrantyNotificationSettings>(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS);
  const [warrantyDefaults, setWarrantyDefaults] = useState<WarrantyDefaultsSettings>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS);
  const [initialTelegramConfig, setInitialTelegramConfig] = useState({ botToken: '', chatId: '' });
  const [initialWarrantyNotificationSettings, setInitialWarrantyNotificationSettings] = useState<WarrantyNotificationSettings>(DEFAULT_WARRANTY_NOTIFICATION_SETTINGS);
  const [initialWarrantyDefaults, setInitialWarrantyDefaults] = useState<WarrantyDefaultsSettings>(DEFAULT_WARRANTY_DEFAULTS_SETTINGS);
  const [savingWarrantyNotificationSettings, setSavingWarrantyNotificationSettings] = useState(false);
  const [warrantyNotificationSaved, setWarrantyNotificationSaved] = useState(false);
  const storageMode = useMemo(() => getSettingsPersistenceMode(), []);
  const showWarrantySettings = useMemo(
    () => locationState?.from === 'warranties' || (locationState?.fromPath?.startsWith('/warranties') ?? false),
    [locationState],
  );
  const showCashbackSourcesSettings = useMemo(
    () => locationState?.from === 'cashback-hero' || (locationState?.fromPath?.startsWith('/cashback-hero') ?? false),
    [locationState],
  );
  const shouldCompactGeneralByDefault = showWarrantySettings || showCashbackSourcesSettings;
  const [generalExpanded, setGeneralExpanded] = useState(!shouldCompactGeneralByDefault);

  const telegramDirty = telegramBotToken !== initialTelegramConfig.botToken || telegramChatId !== initialTelegramConfig.chatId;
  const warrantyDirty =
    warrantyNotificationSettings.enabled !== initialWarrantyNotificationSettings.enabled ||
    warrantyNotificationSettings.alertDays !== initialWarrantyNotificationSettings.alertDays ||
    warrantyDefaults.defaultCategory !== initialWarrantyDefaults.defaultCategory ||
    warrantyDefaults.defaultYears !== initialWarrantyDefaults.defaultYears;

  useEffect(() => {
    setGeneralExpanded(!shouldCompactGeneralByDefault);
  }, [shouldCompactGeneralByDefault]);

  useEffect(() => {
    if (telegramDirty) {
      setGeneralExpanded(true);
    }
  }, [telegramDirty]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const telegramConfig = await loadTelegramConfig();

        if (cancelled) return;

        setTelegramBotToken(telegramConfig.botToken);
        setTelegramChatId(telegramConfig.chatId);
        setInitialTelegramConfig({ botToken: telegramConfig.botToken, chatId: telegramConfig.chatId });

        const [warrantySettings, warrantyDefaultsSettings] = await Promise.all([
          loadWarrantyNotificationSettings(),
          loadWarrantyDefaultsSettings(),
        ]);

        if (cancelled) return;
        setWarrantyNotificationSettings(warrantySettings);
        setWarrantyDefaults(warrantyDefaultsSettings);
        setInitialWarrantyNotificationSettings(warrantySettings);
        setInitialWarrantyDefaults(warrantyDefaultsSettings);
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
    if (!telegramDirty) return;

    await persistTelegramConfig({
      botToken: telegramBotToken,
      chatId: telegramChatId,
    });

    setInitialTelegramConfig({ botToken: telegramBotToken, chatId: telegramChatId });

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
    if (!warrantyDirty) return;

    setSavingWarrantyNotificationSettings(true);
    try {
      await Promise.all([
        persistWarrantyNotificationSettings(warrantyNotificationSettings),
        persistWarrantyDefaultsSettings(warrantyDefaults),
      ]);
      setInitialWarrantyNotificationSettings(warrantyNotificationSettings);
      setInitialWarrantyDefaults(warrantyDefaults);
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
          <AppLoadingState label={t('settingsPage.loadingPreferences')} variant="compact" />
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

        <section className="animate-fade-up space-y-4 rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t('settingsPage.generalSectionTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('settingsPage.generalSectionDescription')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px]">
                {t('settingsPage.generalSectionBadge')}
              </Badge>
              {shouldCompactGeneralByDefault && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setGeneralExpanded((prev) => !prev)}
                  className="h-7 px-2 text-xs"
                  aria-label={generalExpanded ? t('settingsPage.collapseGeneralSettings') : t('settingsPage.expandGeneralSettings')}
                >
                  {generalExpanded ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
                  {generalExpanded ? t('settingsPage.collapseGeneralSettings') : t('settingsPage.expandGeneralSettings')}
                </Button>
              )}
            </div>
          </div>

          {generalExpanded ? (
            <>
          <div className="space-y-4 rounded-xl border bg-card p-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('settingsPage.languageCardTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('settingsPage.languageCardDescription')}</p>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={language === 'pt' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5 transition-all"
                onClick={() => setLanguage('pt')}
              >
                {t('common.portuguese')}
              </Badge>
              <Badge
                variant={language === 'en' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5 transition-all"
                onClick={() => setLanguage('en')}
              >
                {t('common.english')}
              </Badge>
            </div>
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-6" style={{ animationDelay: '40ms' }}>
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('settingsPage.appearanceTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('settingsPage.appearanceDescription')}</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {isDark ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('common.darkMode')}</p>
                    <p className="text-xs text-muted-foreground">{isDark ? t('common.lightMode') : t('common.darkMode')}</p>
                  </div>
                </div>
                <Switch checked={isDark} onCheckedChange={toggleDark} aria-label={t('common.darkMode')} />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {hideAmounts ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{t('common.hideAmounts')}</p>
                    <p className="text-xs text-muted-foreground">{hideAmounts ? t('common.showAmounts') : t('common.hideAmounts')}</p>
                  </div>
                </div>
                <Switch checked={hideAmounts} onCheckedChange={toggleHideAmounts} aria-label={t('common.hideAmounts')} />
              </div>
            </div>
          </div>

          {/* Telegram */}
          <div className="space-y-4 rounded-xl border bg-card p-6" style={{ animationDelay: '80ms' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Send className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{t('settingsPage.telegramTitle')}</h3>
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
                  disabled={!telegramDirty}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted"
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
            </>
          ) : null}
        </section>

        {(showWarrantySettings || showCashbackSourcesSettings) && (
          <section className="animate-fade-up space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5" style={{ animationDelay: '120ms' }}>
            <div>
              <h2 className="text-base font-semibold text-foreground">{t('settingsPage.componentSectionTitle')}</h2>
              <p className="text-xs text-muted-foreground">{t('settingsPage.componentSectionDescription')}</p>
            </div>

            {showWarrantySettings && (
              <div className="space-y-4 rounded-xl border bg-card p-6" style={{ animationDelay: '160ms' }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t('settingsPage.warrantyTitle')}</h3>
                    <p className="text-xs text-muted-foreground">{t('settingsPage.warrantyDescription')}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-foreground">Default category</p>
                    <div className="flex gap-2">
                      {WARRANTY_CATEGORY_OPTIONS.map((option) => (
                        <Badge
                          key={option.value}
                          variant={warrantyDefaults.defaultCategory === option.value ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5 transition-all"
                          onClick={() => setWarrantyDefaults((prev) => ({ ...prev, defaultCategory: option.value }))}
                        >
                          {option.label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-1.5 text-sm font-medium text-foreground">Default warranty length</p>
                    <div className="flex gap-2">
                      {([2, 3] as const).map((years) => (
                        <Badge
                          key={years}
                          variant={warrantyDefaults.defaultYears === years ? 'default' : 'outline'}
                          className="cursor-pointer px-3 py-1.5 transition-all"
                          onClick={() => setWarrantyDefaults((prev) => ({ ...prev, defaultYears: years }))}
                        >
                          {years} years
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('settingsPage.warrantyEnabled')}</p>
                      <p className="text-xs text-muted-foreground">{t('settingsPage.warrantyEnabledHint')}</p>
                    </div>
                    <Switch
                      checked={warrantyNotificationSettings.enabled}
                      onCheckedChange={(checked) => setWarrantyNotificationSettings((prev) => ({ ...prev, enabled: checked }))}
                      aria-label={t('settingsPage.warrantyEnabled')}
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
                    disabled={savingWarrantyNotificationSettings || !warrantyDirty}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:bg-muted"
                  >
                    {savingWarrantyNotificationSettings ? t('settingsPage.savingWarranty') : warrantyNotificationSaved ? t('settingsPage.saved') : t('settingsPage.saveWarranty')}
                  </button>
                </div>
              </div>
            )}

            {showWarrantySettings && (
              <div className="rounded-xl border bg-card p-6" style={{ animationDelay: '240ms' }}>
                <p className="text-sm font-medium text-foreground">{t('settingsPage.featureNotificationsTitle')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('settingsPage.featureNotificationsConfigured')}</p>
              </div>
            )}

            {showCashbackSourcesSettings && (
              <div className="space-y-4">
                <CashbackRulesCard />
                <CashbackSourcesCard sources={sources} onAdd={addSource} onRemove={removeSource} />
                <CashbackCardsCard cards={cards} onAdd={addCard} onRemove={removeCard} />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function CashbackRulesCard() {
  const { t } = useI18n();
  const [rules, setRules] = useState<CashbackCardRulesSettings>(DEFAULT_CASHBACK_CARD_RULES);
  const [initialRules, setInitialRules] = useState<CashbackCardRulesSettings>(DEFAULT_CASHBACK_CARD_RULES);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    unibanco: false,
    cetelem: false,
    universo: false,
  });

  useEffect(() => {
    let cancelled = false;
    void loadCashbackCardRulesSettings().then((loaded) => {
      if (cancelled) return;
      setRules(loaded);
      setInitialRules(loaded);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const dirty = useMemo(() => JSON.stringify(rules) !== JSON.stringify(initialRules), [rules, initialRules]);

  const handleReject = () => {
    setRules(initialRules);
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      await persistCashbackCardRulesSettings(rules);
      setInitialRules(rules);
    } finally {
      setSaving(false);
    }
  };

  const parseDecimal = (value: string): number => Number(value.replace(',', '.'));

  const toggleSection = (section: 'unibanco' | 'cetelem' | 'universo') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="animate-fade-up space-y-3 rounded-xl border bg-card p-4" style={{ animationDelay: '180ms' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('settingsPage.cashbackRulesTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('settingsPage.cashbackRulesDescription')}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? t('settingsPage.collapseGeneralSettings') : t('settingsPage.expandGeneralSettings')}
            title={expanded ? t('settingsPage.collapseGeneralSettings') : t('settingsPage.expandGeneralSettings')}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleReject}
            disabled={!dirty || saving || loading}
            aria-label={t('common.cancel')}
            title={t('common.cancel')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { void handleSave(); }}
            disabled={!dirty || saving || loading}
            aria-label={saving ? t('common.saving') : t('common.save')}
            title={saving ? t('common.saving') : t('common.save')}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!expanded ? null : loading ? (
        <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border p-3 space-y-3">
            <button
              type="button"
              onClick={() => toggleSection('unibanco')}
              className="flex w-full items-center justify-between text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('settingsPage.cashbackRulesUnibanco')}</p>
              {expandedSections.unibanco ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {expandedSections.unibanco ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesCardName')}</Label>
                <Input
                  value={rules.unibanco.cardName}
                  onChange={(e) => setRules((prev) => ({ ...prev, unibanco: { ...prev.unibanco, cardName: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesStatementDay')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={rules.unibanco.statementDay}
                  onChange={(e) => setRules((prev) => ({ ...prev, unibanco: { ...prev.unibanco, statementDay: Math.max(1, Math.min(31, Number(e.target.value) || 1)) } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesAnnualCap')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rules.unibanco.annualCashbackCap}
                  onChange={(e) => setRules((prev) => ({ ...prev, unibanco: { ...prev.unibanco, annualCashbackCap: Math.max(0, parseDecimal(e.target.value) || 0) } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesTopTierCap')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rules.unibanco.topTierSpendCap}
                  onChange={(e) => setRules((prev) => ({ ...prev, unibanco: { ...prev.unibanco, topTierSpendCap: Math.max(0, parseDecimal(e.target.value) || 0) } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesCampaignStart')}</Label>
                <Input
                  type="date"
                  value={rules.unibanco.campaignStart}
                  onChange={(e) => setRules((prev) => ({ ...prev, unibanco: { ...prev.unibanco, campaignStart: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesCampaignMonths')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={120}
                  value={rules.unibanco.campaignMonths}
                  onChange={(e) => setRules((prev) => ({ ...prev, unibanco: { ...prev.unibanco, campaignMonths: Math.max(1, Math.min(120, Number(e.target.value) || 1)) } }))}
                />
              </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <button
              type="button"
              onClick={() => toggleSection('cetelem')}
              className="flex w-full items-center justify-between text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('settingsPage.cashbackRulesCetelem')}</p>
              {expandedSections.cetelem ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {expandedSections.cetelem ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesCardName')}</Label>
                <Input
                  value={rules.cetelem.cardName}
                  onChange={(e) => setRules((prev) => ({ ...prev, cetelem: { ...prev.cetelem, cardName: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesStatementDay')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={rules.cetelem.statementDay}
                  onChange={(e) => setRules((prev) => ({ ...prev, cetelem: { ...prev.cetelem, statementDay: Math.max(1, Math.min(31, Number(e.target.value) || 1)) } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesRatePercent')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={(rules.cetelem.cashbackRate * 100).toFixed(2).replace(/\.00$/, '')}
                  onChange={(e) => {
                    const percent = Math.max(0, Math.min(100, parseDecimal(e.target.value) || 0));
                    setRules((prev) => ({ ...prev, cetelem: { ...prev.cetelem, cashbackRate: percent / 100 } }));
                  }}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesMonthlyCap')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rules.cetelem.monthlyCashbackCap}
                  onChange={(e) => setRules((prev) => ({ ...prev, cetelem: { ...prev.cetelem, monthlyCashbackCap: Math.max(0, parseDecimal(e.target.value) || 0) } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesAnnualCap')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rules.cetelem.annualCashbackCap}
                  onChange={(e) => setRules((prev) => ({ ...prev, cetelem: { ...prev.cetelem, annualCashbackCap: Math.max(0, parseDecimal(e.target.value) || 0) } }))}
                />
              </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <button
              type="button"
              onClick={() => toggleSection('universo')}
              className="flex w-full items-center justify-between text-left"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('settingsPage.cashbackRulesUniverso')}</p>
              {expandedSections.universo ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {expandedSections.universo ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesSourceName')}</Label>
                <Input
                  value={rules.universo.sourceName}
                  onChange={(e) => setRules((prev) => ({ ...prev, universo: { ...prev.universo, sourceName: e.target.value } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesStatementDay')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={rules.universo.statementDay}
                  onChange={(e) => setRules((prev) => ({ ...prev, universo: { ...prev.universo, statementDay: Math.max(1, Math.min(31, Number(e.target.value) || 1)) } }))}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesRatePercent')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={(rules.universo.cashbackRate * 100).toFixed(2).replace(/\.00$/, '')}
                  onChange={(e) => {
                    const percent = Math.max(0, Math.min(100, parseDecimal(e.target.value) || 0));
                    setRules((prev) => ({ ...prev, universo: { ...prev.universo, cashbackRate: percent / 100 } }));
                  }}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">{t('settingsPage.cashbackRulesCycleCap')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={rules.universo.cycleCashbackCap}
                  onChange={(e) => setRules((prev) => ({ ...prev, universo: { ...prev.universo, cycleCashbackCap: Math.max(0, parseDecimal(e.target.value) || 0) } }))}
                />
              </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function CashbackSourcesCard({
  sources,
  onAdd,
  onRemove,
}: {
  sources: string[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [newSource, setNewSource] = useState('');
  const [draftSources, setDraftSources] = useState<string[]>(sources);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDraftSources(sources);
  }, [sources]);

  const dirty = useMemo(() => {
    if (draftSources.length !== sources.length) return true;
    return draftSources.some((source, index) => source !== sources[index]);
  }, [draftSources, sources]);

  const handleAdd = () => {
    const value = newSource.trim();
    if (!value) return;
    if (draftSources.some((source) => source.toLowerCase() === value.toLowerCase())) {
      setNewSource('');
      return;
    }
    setDraftSources((prev) => [...prev, value]);
    setNewSource('');
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const toRemove = sources.filter((source) => !draftSources.includes(source));
      const toAdd = draftSources.filter((source) => !sources.includes(source));

      for (const source of toRemove) {
        await onRemove(source);
      }
      for (const source of toAdd) {
        await onAdd(source);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReject = () => {
    setDraftSources(sources);
    setNewSource('');
  };

  return (
    <div className="animate-fade-up space-y-3 rounded-xl border bg-card p-4" style={{ animationDelay: '200ms' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Coins className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('settingsPage.rewardWalletSourcesTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('settingsPage.rewardWalletSourcesDescription')}</p>
        </div>
      </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? t('settingsPage.collapseGeneralSettings') : t('settingsPage.expandGeneralSettings')}
            title={expanded ? t('settingsPage.collapseGeneralSettings') : t('settingsPage.expandGeneralSettings')}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleReject}
            disabled={!dirty || saving}
            aria-label={t('common.cancel')}
            title={t('common.cancel')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { void handleSave(); }}
            disabled={!dirty || saving}
            aria-label={saving ? t('common.saving') : t('common.save')}
            title={saving ? t('common.saving') : t('common.save')}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded ? (
      <>
      <div className="flex gap-2">
        <Input
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          placeholder={t('settingsPage.rewardWalletSourcesPlaceholder')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          className="h-9 flex-1"
        />
        <Button onClick={handleAdd} size="sm" variant="outline" className="h-9 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {draftSources.map((source) => (
          <li key={source} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
            <span className="text-[15px] leading-5">{source}</span>
            <button
              type="button"
              onClick={async () => {
                if (!await confirm({ title: t('settingsPage.rewardWalletSourcesConfirmRemove', { source }), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') })) {
                  return;
                }
                setDraftSources((prev) => prev.filter((item) => item !== source));
              }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={t('settingsPage.rewardWalletSourcesRemoveAria', { source })}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
        {draftSources.length === 0 ? (
          <li className="rounded-lg border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
            {t('settingsPage.rewardWalletSourcesEmpty')}
          </li>
        ) : null}
      </ul>
      </>
      ) : null}
      {confirmDialog}
    </div>
  );
}

function CashbackCardsCard({
  cards,
  onAdd,
  onRemove,
}: {
  cards: string[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [newCard, setNewCard] = useState('');
  const [draftCards, setDraftCards] = useState<string[]>(cards);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDraftCards(cards);
  }, [cards]);

  const dirty = useMemo(() => {
    if (draftCards.length !== cards.length) return true;
    return draftCards.some((card, index) => card !== cards[index]);
  }, [draftCards, cards]);

  const handleAdd = () => {
    const value = newCard.trim();
    if (!value) return;
    if (draftCards.some((card) => card.toLowerCase() === value.toLowerCase())) {
      setNewCard('');
      return;
    }
    setDraftCards((prev) => [...prev, value]);
    setNewCard('');
  };

  const handleSave = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const toRemove = cards.filter((card) => !draftCards.includes(card));
      const toAdd = draftCards.filter((card) => !cards.includes(card));

      for (const card of toRemove) {
        await onRemove(card);
      }
      for (const card of toAdd) {
        await onAdd(card);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReject = () => {
    setDraftCards(cards);
    setNewCard('');
  };

  return (
    <div className="animate-fade-up space-y-3 rounded-xl border bg-card p-4" style={{ animationDelay: '220ms' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Coins className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('settingsPage.rewardWalletCardsTitle')}</h2>
          <p className="text-xs text-muted-foreground">{t('settingsPage.rewardWalletCardsDescription')}</p>
        </div>
      </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? t('settingsPage.collapseGeneralSettings') : t('settingsPage.expandGeneralSettings')}
            title={expanded ? t('settingsPage.collapseGeneralSettings') : t('settingsPage.expandGeneralSettings')}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={handleReject}
            disabled={!dirty || saving}
            aria-label={t('common.cancel')}
            title={t('common.cancel')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { void handleSave(); }}
            disabled={!dirty || saving}
            aria-label={saving ? t('common.saving') : t('common.save')}
            title={saving ? t('common.saving') : t('common.save')}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded ? (
      <>
      <div className="flex gap-2">
        <Input
          value={newCard}
          onChange={(e) => setNewCard(e.target.value)}
          placeholder={t('settingsPage.rewardWalletCardsPlaceholder')}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
          className="h-9 flex-1"
        />
        <Button onClick={handleAdd} size="sm" variant="outline" className="h-9 px-3">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
        {draftCards.map((card) => (
          <li key={card} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
            <span className="text-[15px] leading-5">{card}</span>
            <button
              type="button"
              onClick={async () => {
                if (!await confirm({ title: t('settingsPage.rewardWalletCardsConfirmRemove', { card }), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel') })) {
                  return;
                }
                setDraftCards((prev) => prev.filter((item) => item !== card));
              }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={t('settingsPage.rewardWalletCardsRemoveAria', { card })}
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
        {draftCards.length === 0 ? (
          <li className="rounded-lg border border-dashed px-3 py-3 text-center text-sm text-muted-foreground">
            {t('settingsPage.rewardWalletCardsEmpty')}
          </li>
        ) : null}
      </ul>
      </>
      ) : null}
      {confirmDialog}
    </div>
  );
}

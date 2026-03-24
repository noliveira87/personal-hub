import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const STORAGE_KEYS = {
  BOT_TOKEN: 'd12-telegram-bot-token',
  CHAT_ID: 'd12-telegram-chat-id',
  ALERTS_WARRANTIES: 'd12-alerts-warranties',
  ALERTS_CONTRACTS: 'd12-alerts-contracts',
  ALERTS_PORTFOLIO: 'd12-alerts-portfolio',
  WARRANTIES_DAYS: 'd12-warranties-alert-days',
} as const;

const LEGACY_STORAGE_KEYS = {
  BOT_TOKEN: 'telegramBotToken',
  CHAT_ID: 'telegramChatId',
} as const;

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface AlertSettings {
  warrantiesEnabled: boolean;
  contractsEnabled: boolean;
  portfolioEnabled: boolean;
  warrantyAlertDays: number; // days before expiry to alert
}

export type SettingsPersistenceMode = 'local' | 'database';

interface SettingsStore {
  mode: SettingsPersistenceMode;
  loadTelegramConfig: () => Promise<TelegramConfig>;
  saveTelegramConfig: (config: TelegramConfig) => Promise<void>;
  loadAlertSettings: () => Promise<AlertSettings>;
  saveAlertSettings: (settings: AlertSettings) => Promise<void>;
}

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  warrantiesEnabled: true,
  contractsEnabled: true,
  portfolioEnabled: false,
  warrantyAlertDays: 30,
};

const SETTINGS_TABLE = 'app_settings';
const GLOBAL_SETTINGS_ID = 'global';

type AppSettingsRow = {
  id: string;
  telegram_bot_token: string | null;
  telegram_chat_id: string | null;
  warranties_enabled: boolean | null;
  contracts_enabled: boolean | null;
  portfolio_enabled: boolean | null;
  warranty_alert_days: number | null;
  updated_at: string;
};

let legacyMigrated = false;

function migrateLegacyTelegramKeys(): void {
  if (legacyMigrated) return;

  const legacyBotToken = localStorage.getItem(LEGACY_STORAGE_KEYS.BOT_TOKEN);
  const legacyChatId = localStorage.getItem(LEGACY_STORAGE_KEYS.CHAT_ID);
  const currentBotToken = localStorage.getItem(STORAGE_KEYS.BOT_TOKEN);
  const currentChatId = localStorage.getItem(STORAGE_KEYS.CHAT_ID);

  if (legacyBotToken && !currentBotToken) {
    localStorage.setItem(STORAGE_KEYS.BOT_TOKEN, legacyBotToken);
  }

  if (legacyChatId && !currentChatId) {
    localStorage.setItem(STORAGE_KEYS.CHAT_ID, legacyChatId);
  }

  if (legacyBotToken || legacyChatId) {
    localStorage.removeItem(LEGACY_STORAGE_KEYS.BOT_TOKEN);
    localStorage.removeItem(LEGACY_STORAGE_KEYS.CHAT_ID);
  }

  legacyMigrated = true;
}

function readTelegramConfigFromLocalStorage(): TelegramConfig {
  migrateLegacyTelegramKeys();

  return {
    botToken: localStorage.getItem(STORAGE_KEYS.BOT_TOKEN) ?? '',
    chatId: localStorage.getItem(STORAGE_KEYS.CHAT_ID) ?? '',
  };
}

function writeTelegramConfigToLocalStorage(config: TelegramConfig): void {
  localStorage.setItem(STORAGE_KEYS.BOT_TOKEN, config.botToken.trim());
  localStorage.setItem(STORAGE_KEYS.CHAT_ID, config.chatId.trim());
  localStorage.removeItem(LEGACY_STORAGE_KEYS.BOT_TOKEN);
  localStorage.removeItem(LEGACY_STORAGE_KEYS.CHAT_ID);
}

function readAlertSettingsFromLocalStorage(): AlertSettings {
  return {
    warrantiesEnabled: localStorage.getItem(STORAGE_KEYS.ALERTS_WARRANTIES) !== 'false',
    contractsEnabled: localStorage.getItem(STORAGE_KEYS.ALERTS_CONTRACTS) !== 'false',
    portfolioEnabled: localStorage.getItem(STORAGE_KEYS.ALERTS_PORTFOLIO) === 'true',
    warrantyAlertDays: Number(localStorage.getItem(STORAGE_KEYS.WARRANTIES_DAYS) ?? DEFAULT_ALERT_SETTINGS.warrantyAlertDays),
  };
}

function writeAlertSettingsToLocalStorage(settings: AlertSettings): void {
  localStorage.setItem(STORAGE_KEYS.ALERTS_WARRANTIES, String(settings.warrantiesEnabled));
  localStorage.setItem(STORAGE_KEYS.ALERTS_CONTRACTS, String(settings.contractsEnabled));
  localStorage.setItem(STORAGE_KEYS.ALERTS_PORTFOLIO, String(settings.portfolioEnabled));
  localStorage.setItem(STORAGE_KEYS.WARRANTIES_DAYS, String(settings.warrantyAlertDays));
}

function mapRowToTelegramConfig(row: AppSettingsRow | null): TelegramConfig {
  if (!row) {
    return {
      botToken: '',
      chatId: '',
    };
  }

  return {
    botToken: row.telegram_bot_token ?? '',
    chatId: row.telegram_chat_id ?? '',
  };
}

function normalizeWarrantyAlertDays(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_ALERT_SETTINGS.warrantyAlertDays;
  return Math.max(1, Math.floor(Number(value)));
}

function mapRowToAlertSettings(row: AppSettingsRow | null): AlertSettings {
  if (!row) {
    return DEFAULT_ALERT_SETTINGS;
  }

  return {
    warrantiesEnabled: row.warranties_enabled ?? DEFAULT_ALERT_SETTINGS.warrantiesEnabled,
    contractsEnabled: row.contracts_enabled ?? DEFAULT_ALERT_SETTINGS.contractsEnabled,
    portfolioEnabled: row.portfolio_enabled ?? DEFAULT_ALERT_SETTINGS.portfolioEnabled,
    warrantyAlertDays: normalizeWarrantyAlertDays(row.warranty_alert_days),
  };
}

async function loadSettingsRowFromDatabase(): Promise<AppSettingsRow | null> {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('id, telegram_bot_token, telegram_chat_id, warranties_enabled, contracts_enabled, portfolio_enabled, warranty_alert_days, updated_at')
    .eq('id', GLOBAL_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as AppSettingsRow | null) ?? null;
}

async function upsertSettingsRowToDatabase(partial: Partial<AppSettingsRow>): Promise<void> {
  const payload: Record<string, unknown> = {
    id: GLOBAL_SETTINGS_ID,
    updated_at: new Date().toISOString(),
  };

  if (partial.telegram_bot_token !== undefined) payload.telegram_bot_token = partial.telegram_bot_token;
  if (partial.telegram_chat_id !== undefined) payload.telegram_chat_id = partial.telegram_chat_id;
  if (partial.warranties_enabled !== undefined) payload.warranties_enabled = partial.warranties_enabled;
  if (partial.contracts_enabled !== undefined) payload.contracts_enabled = partial.contracts_enabled;
  if (partial.portfolio_enabled !== undefined) payload.portfolio_enabled = partial.portfolio_enabled;
  if (partial.warranty_alert_days !== undefined) payload.warranty_alert_days = partial.warranty_alert_days;

  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}

const localSettingsStore: SettingsStore = {
  mode: 'local',
  async loadTelegramConfig() {
    return readTelegramConfigFromLocalStorage();
  },
  async saveTelegramConfig(config) {
    writeTelegramConfigToLocalStorage(config);
  },
  async loadAlertSettings() {
    return readAlertSettingsFromLocalStorage();
  },
  async saveAlertSettings(settings) {
    writeAlertSettingsToLocalStorage(settings);
  },
};

const databaseSettingsStore: SettingsStore = {
  mode: 'database',
  async loadTelegramConfig() {
    const localTelegram = readTelegramConfigFromLocalStorage();

    try {
      const row = await loadSettingsRowFromDatabase();

      if (!row) {
        await upsertSettingsRowToDatabase({
          telegram_bot_token: localTelegram.botToken,
          telegram_chat_id: localTelegram.chatId,
        });

        return localTelegram;
      }

      const telegramConfig = mapRowToTelegramConfig(row);
      writeTelegramConfigToLocalStorage(telegramConfig);
      return telegramConfig;
    } catch (error) {
      console.error('Failed to load Telegram settings from database, using local fallback:', error);
      return localTelegram;
    }
  },
  async saveTelegramConfig(config) {
    const normalizedConfig: TelegramConfig = {
      botToken: config.botToken.trim(),
      chatId: config.chatId.trim(),
    };

    writeTelegramConfigToLocalStorage(normalizedConfig);

    try {
      await upsertSettingsRowToDatabase({
        telegram_bot_token: normalizedConfig.botToken,
        telegram_chat_id: normalizedConfig.chatId,
      });
    } catch (error) {
      console.error('Failed to persist Telegram settings to database, kept local fallback:', error);
    }
  },
  async loadAlertSettings() {
    const localAlerts = readAlertSettingsFromLocalStorage();

    try {
      const row = await loadSettingsRowFromDatabase();

      if (!row) {
        await upsertSettingsRowToDatabase({
          warranties_enabled: localAlerts.warrantiesEnabled,
          contracts_enabled: localAlerts.contractsEnabled,
          portfolio_enabled: localAlerts.portfolioEnabled,
          warranty_alert_days: localAlerts.warrantyAlertDays,
        });

        return localAlerts;
      }

      const alertSettings = mapRowToAlertSettings(row);
      writeAlertSettingsToLocalStorage(alertSettings);
      return alertSettings;
    } catch (error) {
      console.error('Failed to load alert settings from database, using local fallback:', error);
      return localAlerts;
    }
  },
  async saveAlertSettings(settings) {
    const normalizedSettings: AlertSettings = {
      warrantiesEnabled: settings.warrantiesEnabled,
      contractsEnabled: settings.contractsEnabled,
      portfolioEnabled: settings.portfolioEnabled,
      warrantyAlertDays: normalizeWarrantyAlertDays(settings.warrantyAlertDays),
    };

    writeAlertSettingsToLocalStorage(normalizedSettings);

    try {
      await upsertSettingsRowToDatabase({
        warranties_enabled: normalizedSettings.warrantiesEnabled,
        contracts_enabled: normalizedSettings.contractsEnabled,
        portfolio_enabled: normalizedSettings.portfolioEnabled,
        warranty_alert_days: normalizedSettings.warrantyAlertDays,
      });
    } catch (error) {
      console.error('Failed to persist alert settings to database, kept local fallback:', error);
    }
  },
};

// Future-ready hook point: swap this store for a Supabase-backed implementation
// once a user-scoped settings table exists.
const settingsStore: SettingsStore = isSupabaseConfigured ? databaseSettingsStore : localSettingsStore;

export function getSettingsPersistenceMode(): SettingsPersistenceMode {
  return settingsStore.mode;
}

export async function loadTelegramConfig(): Promise<TelegramConfig> {
  return settingsStore.loadTelegramConfig();
}

export async function persistTelegramConfig(config: TelegramConfig): Promise<void> {
  await settingsStore.saveTelegramConfig(config);
}

export async function loadAlertSettings(): Promise<AlertSettings> {
  return settingsStore.loadAlertSettings();
}

export async function persistAlertSettings(settings: AlertSettings): Promise<void> {
  await settingsStore.saveAlertSettings(settings);
}

export function getTelegramConfig(): TelegramConfig {
  return readTelegramConfigFromLocalStorage();
}

export function saveTelegramConfig(config: TelegramConfig): void {
  writeTelegramConfigToLocalStorage(config);
}

export function getAlertSettings(): AlertSettings {
  return readAlertSettingsFromLocalStorage();
}

export function saveAlertSettings(settings: AlertSettings): void {
  writeAlertSettingsToLocalStorage(settings);
}

export function isTelegramConfigured(): boolean {
  const { botToken, chatId } = getTelegramConfig();
  return Boolean(botToken.trim() && chatId.trim());
}

export async function sendTelegramMessage(text: string): Promise<void> {
  const { botToken, chatId } = getTelegramConfig();
  if (!botToken.trim() || !chatId.trim()) {
    throw new Error('Telegram not configured. Go to Settings to set up your bot.');
  }

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  const result = await response.json() as { ok: boolean; description?: string };
  if (!response.ok || !result.ok) {
    throw new Error(result.description ?? 'Failed to send message');
  }
}

export async function sendTestMessage(): Promise<void> {
  const text = `🧪 <b>D12 Hub — Test Notification</b>\n\n✅ Telegram integration is working!\n<i>${new Date().toLocaleString()}</i>`;
  await sendTelegramMessage(text);
}

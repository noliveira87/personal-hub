const STORAGE_KEYS = {
  BOT_TOKEN: 'd12-telegram-bot-token',
  CHAT_ID: 'd12-telegram-chat-id',
  ALERTS_WARRANTIES: 'd12-alerts-warranties',
  ALERTS_CONTRACTS: 'd12-alerts-contracts',
  ALERTS_PORTFOLIO: 'd12-alerts-portfolio',
  WARRANTIES_DAYS: 'd12-warranties-alert-days',
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

export function getTelegramConfig(): TelegramConfig {
  return {
    botToken: localStorage.getItem(STORAGE_KEYS.BOT_TOKEN) ?? '',
    chatId: localStorage.getItem(STORAGE_KEYS.CHAT_ID) ?? '',
  };
}

export function saveTelegramConfig(config: TelegramConfig): void {
  localStorage.setItem(STORAGE_KEYS.BOT_TOKEN, config.botToken);
  localStorage.setItem(STORAGE_KEYS.CHAT_ID, config.chatId);
}

export function getAlertSettings(): AlertSettings {
  return {
    warrantiesEnabled: localStorage.getItem(STORAGE_KEYS.ALERTS_WARRANTIES) !== 'false',
    contractsEnabled: localStorage.getItem(STORAGE_KEYS.ALERTS_CONTRACTS) !== 'false',
    portfolioEnabled: localStorage.getItem(STORAGE_KEYS.ALERTS_PORTFOLIO) === 'true',
    warrantyAlertDays: Number(localStorage.getItem(STORAGE_KEYS.WARRANTIES_DAYS) ?? 30),
  };
}

export function saveAlertSettings(settings: AlertSettings): void {
  localStorage.setItem(STORAGE_KEYS.ALERTS_WARRANTIES, String(settings.warrantiesEnabled));
  localStorage.setItem(STORAGE_KEYS.ALERTS_CONTRACTS, String(settings.contractsEnabled));
  localStorage.setItem(STORAGE_KEYS.ALERTS_PORTFOLIO, String(settings.portfolioEnabled));
  localStorage.setItem(STORAGE_KEYS.WARRANTIES_DAYS, String(settings.warrantyAlertDays));
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

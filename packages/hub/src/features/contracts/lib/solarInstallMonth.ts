const GLOBAL_SOLAR_INSTALL_MONTH_KEY = 'contracts:solar-install-month';
const CONTRACT_SOLAR_INSTALL_MONTH_PREFIX = 'contracts:kwh:solar-install-month:';

function safeGet(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore localStorage failures.
  }
}

export function getSolarInstallMonthForContract(contractId: string): string {
  return safeGet(`${CONTRACT_SOLAR_INSTALL_MONTH_PREFIX}${contractId}`);
}

export function setSolarInstallMonthForContract(contractId: string, monthKey: string): void {
  safeSet(`${CONTRACT_SOLAR_INSTALL_MONTH_PREFIX}${contractId}`, monthKey);
  safeSet(GLOBAL_SOLAR_INSTALL_MONTH_KEY, monthKey);
}

export function getGlobalSolarInstallMonth(): string {
  return safeGet(GLOBAL_SOLAR_INSTALL_MONTH_KEY);
}

export function setGlobalSolarInstallMonth(monthKey: string): void {
  safeSet(GLOBAL_SOLAR_INSTALL_MONTH_KEY, monthKey);
}

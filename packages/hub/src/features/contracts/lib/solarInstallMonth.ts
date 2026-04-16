const GLOBAL_SOLAR_INSTALL_MONTH_KEY = 'contracts:solar-install-month';
const CONTRACT_SOLAR_INSTALL_MONTH_PREFIX = 'contracts:kwh:solar-install-month:';
const GLOBAL_ENERGY_MILESTONES_KEY = 'contracts:energy-milestones';
const CONTRACT_ENERGY_MILESTONES_PREFIX = 'contracts:kwh:energy-milestones:';

export type EnergyMilestoneType = 'solar' | 'solar-expansion' | 'battery' | 'other';

export interface EnergyMilestone {
  id: string;
  monthKey: string;
  type: EnergyMilestoneType;
}

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

function safeGetMilestones(key: string): EnergyMilestone[] {
  const raw = safeGet(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as EnergyMilestone[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `${item.monthKey ?? 'unknown'}-${Math.random().toString(36).slice(2, 8)}`,
        monthKey: typeof item.monthKey === 'string' ? item.monthKey : '',
        type: item.type === 'solar' || item.type === 'solar-expansion' || item.type === 'battery' || item.type === 'other'
          ? item.type
          : 'other',
      }))
      .filter((item) => /^\d{4}-\d{2}$/.test(item.monthKey))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  } catch {
    return [];
  }
}

function safeSetMilestones(key: string, milestones: EnergyMilestone[]): void {
  try {
    if (milestones.length === 0) {
      localStorage.removeItem(key);
      return;
    }

    const normalized = milestones
      .filter((item) => /^\d{4}-\d{2}$/.test(item.monthKey))
      .map((item) => ({
        id: item.id,
        monthKey: item.monthKey,
        type: item.type,
      }))
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    localStorage.setItem(key, JSON.stringify(normalized));
  } catch {
    // Ignore localStorage failures.
  }
}

function toLegacySolarMonth(milestones: EnergyMilestone[]): string {
  const primarySolar = milestones.find((item) => item.type === 'solar' || item.type === 'solar-expansion');
  return primarySolar?.monthKey ?? milestones[0]?.monthKey ?? '';
}

export function getEnergyMilestonesForContract(contractId: string): EnergyMilestone[] {
  return safeGetMilestones(`${CONTRACT_ENERGY_MILESTONES_PREFIX}${contractId}`);
}

export function setEnergyMilestonesForContract(contractId: string, milestones: EnergyMilestone[]): void {
  safeSetMilestones(`${CONTRACT_ENERGY_MILESTONES_PREFIX}${contractId}`, milestones);
  safeSetMilestones(GLOBAL_ENERGY_MILESTONES_KEY, milestones);

  const legacyMonth = toLegacySolarMonth(milestones);
  safeSet(`${CONTRACT_SOLAR_INSTALL_MONTH_PREFIX}${contractId}`, legacyMonth);
  safeSet(GLOBAL_SOLAR_INSTALL_MONTH_KEY, legacyMonth);
}

export function getGlobalEnergyMilestones(): EnergyMilestone[] {
  return safeGetMilestones(GLOBAL_ENERGY_MILESTONES_KEY);
}

export function setGlobalEnergyMilestones(milestones: EnergyMilestone[]): void {
  safeSetMilestones(GLOBAL_ENERGY_MILESTONES_KEY, milestones);
  safeSet(GLOBAL_SOLAR_INSTALL_MONTH_KEY, toLegacySolarMonth(milestones));
}

export function getSolarInstallMonthForContract(contractId: string): string {
  const milestones = getEnergyMilestonesForContract(contractId);
  if (milestones.length > 0) return toLegacySolarMonth(milestones);
  return safeGet(`${CONTRACT_SOLAR_INSTALL_MONTH_PREFIX}${contractId}`);
}

export function setSolarInstallMonthForContract(contractId: string, monthKey: string): void {
  safeSet(`${CONTRACT_SOLAR_INSTALL_MONTH_PREFIX}${contractId}`, monthKey);
  safeSet(GLOBAL_SOLAR_INSTALL_MONTH_KEY, monthKey);

  if (monthKey) {
    setEnergyMilestonesForContract(contractId, [{ id: `solar-${monthKey}`, monthKey, type: 'solar' }]);
  } else {
    setEnergyMilestonesForContract(contractId, []);
  }
}

export function getGlobalSolarInstallMonth(): string {
  const milestones = getGlobalEnergyMilestones();
  if (milestones.length > 0) return toLegacySolarMonth(milestones);
  return safeGet(GLOBAL_SOLAR_INSTALL_MONTH_KEY);
}

export function setGlobalSolarInstallMonth(monthKey: string): void {
  safeSet(GLOBAL_SOLAR_INSTALL_MONTH_KEY, monthKey);
}

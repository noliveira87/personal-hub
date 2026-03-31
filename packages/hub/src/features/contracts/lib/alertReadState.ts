import { Contract } from '@/features/contracts/types/contract';

const STORAGE_KEY = 'd12-contract-alerts-read-state';

type ReadState = Record<string, string>;

function readState(): ReadState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as ReadState;
  } catch {
    return {};
  }
}

function writeState(state: ReadState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hasAnyAlert(contract: Contract): boolean {
  return contract.alerts.length > 0;
}

function getAlertFingerprint(contract: Contract): string {
  return JSON.stringify(
    contract.alerts.map((alert) => ({
      kind: alert.kind,
      daysBefore: alert.daysBefore,
      specificDate: alert.specificDate,
      reason: alert.reason,
      enabled: alert.enabled,
      telegramEnabled: alert.telegramEnabled,
    })),
  );
}

export function hasUnreadContractAlerts(contract: Contract): boolean {
  if (!hasAnyAlert(contract)) {
    return false;
  }

  const state = readState();
  const currentFingerprint = getAlertFingerprint(contract);
  return state[contract.id] !== currentFingerprint;
}

export function markContractAlertsAsRead(contract: Contract): void {
  if (!hasAnyAlert(contract)) {
    return;
  }

  const state = readState();
  state[contract.id] = getAlertFingerprint(contract);
  writeState(state);
}

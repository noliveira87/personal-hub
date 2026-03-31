import { Contract } from '@/features/contracts/types/contract';
import { format, isValid, parseISO, subDays } from 'date-fns';

const STORAGE_KEY = 'd12-contract-alerts-read-signatures';

export interface OccurredAppAlert {
  signature: string;
  contractId: string;
  contractName: string;
  provider: string;
  triggerDate: Date;
  triggerLabel: string;
  reason: string | null;
}

type ReadSignatureState = string[];

function readState(): ReadSignatureState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

function writeState(state: ReadSignatureState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeDaysBefore(value: number): number {
  if (!Number.isFinite(value)) return 30;
  return Math.max(1, Math.floor(value));
}

function isContractEligible(contract: Contract): boolean {
  return contract.status === 'active' || contract.status === 'pending-cancellation';
}

function getTriggerDate(contract: Contract, alertIndex: number): Date | null {
  const alert = contract.alerts[alertIndex];
  if (!alert || !alert.enabled) return null;

  if (alert.kind === 'specific-date') {
    if (!alert.specificDate) return null;
    const parsed = parseISO(alert.specificDate);
    return isValid(parsed) ? parsed : null;
  }

  if (!contract.endDate) return null;
  const expiryDate = parseISO(contract.endDate);
  if (!isValid(expiryDate)) return null;
  return subDays(expiryDate, normalizeDaysBefore(alert.daysBefore));
}

function getAlertSignature(contractId: string, alertIndex: number, triggerDate: Date): string {
  return `${contractId}:${alertIndex}:${format(triggerDate, 'yyyy-MM-dd')}`;
}

function getOccurredAppAlertsForContract(contract: Contract, today: Date): OccurredAppAlert[] {
  if (!isContractEligible(contract)) return [];

  const occurred: OccurredAppAlert[] = [];

  contract.alerts.forEach((alert, index) => {
    if (!alert.enabled) return;

    const triggerDate = getTriggerDate(contract, index);
    if (!triggerDate) return;

    if (triggerDate > today) return;

    occurred.push({
      signature: getAlertSignature(contract.id, index, triggerDate),
      contractId: contract.id,
      contractName: contract.name,
      provider: contract.provider,
      triggerDate,
      triggerLabel: alert.kind === 'specific-date'
        ? format(triggerDate, 'MMM d, yyyy')
        : `${normalizeDaysBefore(alert.daysBefore)} days before expiry`,
      reason: alert.reason?.trim() || null,
    });
  });

  return occurred;
}

export function getUnreadOccurredAppAlerts(contracts: Contract[]): OccurredAppAlert[] {
  const readSignatures = new Set(readState());
  const today = new Date();

  return contracts
    .flatMap(contract => getOccurredAppAlertsForContract(contract, today))
    .filter(alert => !readSignatures.has(alert.signature))
    .sort((a, b) => b.triggerDate.getTime() - a.triggerDate.getTime());
}

export function hasUnreadContractAlerts(contract: Contract): boolean {
  const readSignatures = new Set(readState());
  const today = new Date();
  return getOccurredAppAlertsForContract(contract, today).some(alert => !readSignatures.has(alert.signature));
}

export function markOccurredAppAlertsAsRead(contracts: Contract[]): void {
  const existing = readState();
  const allSignatures = new Set(existing);
  const today = new Date();

  contracts
    .flatMap(contract => getOccurredAppAlertsForContract(contract, today))
    .forEach(alert => allSignatures.add(alert.signature));

  writeState(Array.from(allSignatures));
}

export function markContractAlertsAsRead(contract: Contract): void {
  const existing = readState();
  const signatures = new Set(existing);
  const today = new Date();

  getOccurredAppAlertsForContract(contract, today).forEach(alert => signatures.add(alert.signature));

  writeState(Array.from(signatures));
}

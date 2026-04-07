import { Contract } from '@/features/contracts/types/contract';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { format, isValid, parseISO, subDays } from 'date-fns';

const STORAGE_KEY = 'd12-contract-alerts-read-signatures';
const TEST_ALERTS_STORAGE_KEY = 'd12-contract-test-app-alerts';
const SETTINGS_TABLE = 'app_settings';
const GLOBAL_SETTINGS_ID = 'global';
const CHANGE_EVENT = 'd12-contract-alert-read-state-changed';

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

type StoredTestAppAlert = {
  signature: string;
  contractId: string;
  contractName: string;
  provider: string;
  triggerDate: string;
  triggerLabel: string;
  reason: string | null;
};

type ContractAlertReadSettingsRow = {
  id: string;
  contract_alerts_read_signatures: unknown;
};

let cachedState: ReadSignatureState | null = null;
let cachedTestAlerts: StoredTestAppAlert[] | null = null;
let hydrationPromise: Promise<void> | null = null;

function emitChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function normalizeState(value: unknown): ReadSignatureState {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function readState(): ReadSignatureState {
  if (cachedState) return cachedState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedState = [];
      return cachedState;
    }
    const parsed = JSON.parse(raw) as unknown;
    cachedState = normalizeState(parsed);
    return cachedState;
  } catch {
    cachedState = [];
    return cachedState;
  }
}

function writeState(state: ReadSignatureState): void {
  cachedState = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeTestAlerts(value: unknown): StoredTestAppAlert[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is StoredTestAppAlert => {
    if (!item || typeof item !== 'object') return false;

    const candidate = item as Record<string, unknown>;
    return typeof candidate.signature === 'string'
      && typeof candidate.contractId === 'string'
      && typeof candidate.contractName === 'string'
      && typeof candidate.provider === 'string'
      && typeof candidate.triggerDate === 'string'
      && typeof candidate.triggerLabel === 'string'
      && (typeof candidate.reason === 'string' || candidate.reason === null || candidate.reason === undefined);
  }).map(item => ({
    ...item,
    reason: item.reason ?? null,
  }));
}

function readTestAlerts(): StoredTestAppAlert[] {
  if (cachedTestAlerts) return cachedTestAlerts;

  try {
    const raw = localStorage.getItem(TEST_ALERTS_STORAGE_KEY);
    if (!raw) {
      cachedTestAlerts = [];
      return cachedTestAlerts;
    }

    const parsed = JSON.parse(raw) as unknown;
    cachedTestAlerts = normalizeTestAlerts(parsed);
    return cachedTestAlerts;
  } catch {
    cachedTestAlerts = [];
    return cachedTestAlerts;
  }
}

function writeTestAlerts(alerts: StoredTestAppAlert[]): void {
  cachedTestAlerts = alerts;
  localStorage.setItem(TEST_ALERTS_STORAGE_KEY, JSON.stringify(alerts));
}

async function loadStateFromDatabase(): Promise<ReadSignatureState> {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('id, contract_alerts_read_signatures')
    .eq('id', GLOBAL_SETTINGS_ID)
    .maybeSingle();

  if (error) throw error;
  const row = (data as ContractAlertReadSettingsRow | null) ?? null;
  return normalizeState(row?.contract_alerts_read_signatures);
}

async function persistStateToDatabase(state: ReadSignatureState): Promise<void> {
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert(
      {
        id: GLOBAL_SETTINGS_ID,
        contract_alerts_read_signatures: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  if (error) throw error;
}

export async function hydrateContractAlertReadState(): Promise<void> {
  readState();

  if (!isSupabaseConfigured) return;
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const databaseState = await loadStateFromDatabase();
      const mergedState = Array.from(new Set([...readState(), ...databaseState]));
      const currentSerialized = JSON.stringify(readState());
      const mergedSerialized = JSON.stringify(mergedState);

      if (currentSerialized !== mergedSerialized) {
        writeState(mergedState);
        emitChange();
      }

      const databaseSerialized = JSON.stringify(databaseState);
      if (databaseSerialized !== mergedSerialized) {
        await persistStateToDatabase(mergedState);
      }
    } catch (error) {
      console.error('Failed to hydrate contract alert read state from database, using local fallback:', error);
    }
  })();

  return hydrationPromise;
}

export function subscribeContractAlertReadState(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handler = () => onChange();
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

function persistAndNotify(state: ReadSignatureState): void {
  writeState(state);
  emitChange();

  if (!isSupabaseConfigured) return;

  void persistStateToDatabase(state).catch((error) => {
    console.error('Failed to persist contract alert read state to database, kept local fallback:', error);
  });
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

function getStoredTestAppAlerts(): OccurredAppAlert[] {
  return readTestAlerts()
    .map((alert) => {
      const triggerDate = new Date(alert.triggerDate);
      if (Number.isNaN(triggerDate.getTime())) return null;

      return {
        signature: alert.signature,
        contractId: alert.contractId,
        contractName: alert.contractName,
        provider: alert.provider,
        triggerDate,
        triggerLabel: alert.triggerLabel,
        reason: alert.reason,
      } satisfies OccurredAppAlert;
    })
    .filter((alert): alert is OccurredAppAlert => alert !== null);
}

function getAllOccurredAppAlerts(contracts: Contract[], today: Date): OccurredAppAlert[] {
  const alerts = [
    ...contracts.flatMap(contract => getOccurredAppAlertsForContract(contract, today)),
    ...getStoredTestAppAlerts(),
  ];

  const deduped = new Map<string, OccurredAppAlert>();
  alerts.forEach((alert) => deduped.set(alert.signature, alert));
  return Array.from(deduped.values());
}

export function getUnreadOccurredAppAlerts(contracts: Contract[]): OccurredAppAlert[] {
  void hydrateContractAlertReadState();
  const readSignatures = new Set(readState());
  const today = new Date();

  return getAllOccurredAppAlerts(contracts, today)
    .filter(alert => !readSignatures.has(alert.signature))
    .sort((a, b) => b.triggerDate.getTime() - a.triggerDate.getTime());
}

export function hasUnreadContractAlerts(contract: Contract): boolean {
  void hydrateContractAlertReadState();
  const readSignatures = new Set(readState());
  const today = new Date();
  return getOccurredAppAlertsForContract(contract, today).some(alert => !readSignatures.has(alert.signature));
}

export function markOccurredAppAlertsAsRead(contracts: Contract[]): void {
  const existing = readState();
  const allSignatures = new Set(existing);
  const today = new Date();

  getAllOccurredAppAlerts(contracts, today)
    .forEach(alert => allSignatures.add(alert.signature));

  persistAndNotify(Array.from(allSignatures));
}

export function markAppAlertAsRead(signature: string): void {
  const signatures = new Set(readState());
  signatures.add(signature);
  persistAndNotify(Array.from(signatures));
}

export function isTestAppAlertSignature(signature: string): boolean {
  return signature.startsWith('test:');
}

export function markContractAlertsAsRead(contract: Contract): void {
  const existing = readState();
  const signatures = new Set(existing);
  const today = new Date();

  getOccurredAppAlertsForContract(contract, today).forEach(alert => signatures.add(alert.signature));

  persistAndNotify(Array.from(signatures));
}

export function addTestAppAlert(alert: Omit<OccurredAppAlert, 'signature'>): string {
  const signature = `test:${alert.contractId}:${Date.now()}`;
  const alerts = readTestAlerts();
  const nextAlerts = [
    {
      signature,
      contractId: alert.contractId,
      contractName: alert.contractName,
      provider: alert.provider,
      triggerDate: alert.triggerDate.toISOString(),
      triggerLabel: alert.triggerLabel,
      reason: alert.reason,
    },
    ...alerts,
  ].slice(0, 30);

  writeTestAlerts(nextAlerts);
  emitChange();
  return signature;
}

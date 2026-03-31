import { useEffect, useMemo, useState } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getDaysUntilExpiry, getUrgencyLevel } from '@/features/contracts/lib/contractUtils';
import { CATEGORY_ICONS } from '@/features/contracts/types/contract';
import { differenceInCalendarDays, format, isValid, parseISO, subDays } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Bell, BellRing, FileText, Loader, Pencil, Plus, Send } from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';
import { sendTelegramMessage } from '@/lib/telegram';
import { toast } from '@/components/ui/sonner';

type EditableAlertKind = 'days-before' | 'specific-date';

export default function AlertsPage() {
  const { contracts, updateContract } = useContracts();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [editingTarget, setEditingTarget] = useState<{ contractId: string; alertIndex: number } | null>(null);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [alertKind, setAlertKind] = useState<EditableAlertKind>('specific-date');
  const [daysBefore, setDaysBefore] = useState(30);
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [appEnabled, setAppEnabled] = useState(true);
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  useEffect(() => {
    const preselectedContractId = searchParams.get('contractId');
    if (!preselectedContractId) return;

    const exists = contracts.some(contract => contract.id === preselectedContractId);
    if (exists) {
      setSelectedContractId(preselectedContractId);
      setShowCreateForm(true);
    }
  }, [contracts, searchParams]);

  const resetCreateForm = () => {
    setSelectedContractId('');
    setAlertKind('specific-date');
    setDaysBefore(30);
    setSpecificDate(new Date().toISOString().split('T')[0]);
    setMessage('');
    setAppEnabled(true);
    setTelegramEnabled(false);
    setEditingTarget(null);
  };

  const startEditingAlert = (contractId: string, alertIndex: number) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const alert = contract.alerts[alertIndex];
    if (!alert) return;

    setEditingTarget({ contractId, alertIndex });
    setSelectedContractId(contractId);
    setAlertKind(alert.kind);
    setDaysBefore(alert.daysBefore);
    setSpecificDate(alert.specificDate ?? new Date().toISOString().split('T')[0]);
    setMessage(alert.reason ?? '');
    setAppEnabled(alert.enabled);
    setTelegramEnabled(alert.telegramEnabled);
    setShowCreateForm(true);
  };

  const handleCreateCustomAlert = async () => {
    if (!selectedContractId) {
      toast.error('Select a contract first.');
      return;
    }

    if (alertKind === 'specific-date' && !specificDate) {
      toast.error('Choose a date for the alert.');
      return;
    }

    if (alertKind === 'specific-date' && !message.trim()) {
      toast.error('Write a specific message for this alert.');
      return;
    }

    if (alertKind === 'days-before' && (!Number.isFinite(daysBefore) || daysBefore < 1)) {
      toast.error('Choose a valid number of days before.');
      return;
    }

    if (!appEnabled && !telegramEnabled) {
      toast.error('Enable at least one channel: App or Telegram.');
      return;
    }

    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) {
      toast.error('Selected contract was not found.');
      return;
    }

    if (telegramEnabled && !contract.telegramAlertEnabled) {
      toast.error('Enable Telegram notifications on the contract before using Telegram for this alert.');
      return;
    }

    const alertPayload = {
      kind: alertKind,
      daysBefore: alertKind === 'days-before' ? Math.floor(daysBefore) : 30,
      specificDate: alertKind === 'specific-date' ? specificDate : null,
      reason: message.trim() || null,
      enabled: appEnabled,
      telegramEnabled,
    };

    const nextAlerts = editingTarget && editingTarget.contractId === contract.id
      ? contract.alerts.map((alert, index) => index === editingTarget.alertIndex ? alertPayload : alert)
      : [...contract.alerts, alertPayload];

    try {
      setSaving(true);
      await updateContract({
        ...contract,
        alerts: nextAlerts,
      });
      toast.success(editingTarget ? 'Alert updated successfully.' : 'Custom alert created successfully.');
      resetCreateForm();
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create custom alert:', error);
      const errMessage = error instanceof Error ? error.message : 'Failed to create custom alert.';
      toast.error(errMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTestCustomAlert = async () => {
    if (!selectedContractId) {
      toast.error('Select a contract first.');
      return;
    }

    if (alertKind === 'specific-date' && !specificDate) {
      toast.error('Choose a date for the alert.');
      return;
    }

    if (alertKind === 'specific-date' && !message.trim()) {
      toast.error('Write a specific message for this alert.');
      return;
    }

    if (alertKind === 'days-before' && (!Number.isFinite(daysBefore) || daysBefore < 1)) {
      toast.error('Choose a valid number of days before.');
      return;
    }

    if (!appEnabled && !telegramEnabled) {
      toast.error('Enable at least one channel: App or Telegram.');
      return;
    }

    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) {
      toast.error('Selected contract was not found.');
      return;
    }

    if (telegramEnabled && !contract.telegramAlertEnabled) {
      toast.error('Enable Telegram notifications on the contract before using Telegram for this alert.');
      return;
    }

    const triggerText = alertKind === 'specific-date'
      ? `Date: ${specificDate}`
      : `${Math.floor(daysBefore)} days before expiry`;

    const preview = `Alert test for ${contract.name}\n${triggerText}${message.trim() ? `\nMessage: ${message.trim()}` : ''}`;

    try {
      setTesting(true);

      if (appEnabled) {
        toast('App test preview', {
          description: preview,
        });
      }

      if (telegramEnabled) {
        const text = `🧪 <b>D12 Contracts — Custom Alert Test</b>\n\nContract: <b>${contract.name}</b>\nProvider: ${contract.provider}\nTrigger: ${triggerText}${message.trim() ? `\nMessage: ${message.trim()}` : ''}`;
        await sendTelegramMessage(text);
      }

      toast.success('Test alert sent successfully.');
    } catch (error) {
      console.error('Failed to test custom alert:', error);
      const errMessage = error instanceof Error ? error.message : 'Failed to test custom alert.';
      toast.error(errMessage);
    } finally {
      setTesting(false);
    }
  };

  const alerts = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active' || c.status === 'pending-cancellation');
    const today = new Date();
    const items: {
      contract: typeof active[0];
      daysLeft: number;
      alertDay: number;
      triggerLabel: string;
      reason: string | null;
      alertIndex: number;
      triggerDate: Date;
      daysUntilTrigger: number;
    }[] = [];

    active.forEach(c => {
      const daysLeft = getDaysUntilExpiry(c);
      c.alerts.forEach((alert, alertIndex) => {
        if (!alert.enabled) {
          return;
        }

        if (alert.kind === 'specific-date') {
          if (!alert.specificDate) {
            return;
          }

          const targetDate = parseISO(alert.specificDate);
          if (!isValid(targetDate)) {
            return;
          }

          const dateDiff = differenceInCalendarDays(targetDate, today);
          if (dateDiff < 0) return;

          const triggerLabel = dateDiff === 0
            ? `Today (${format(targetDate, 'MMM d, yyyy')})`
            : format(targetDate, 'MMM d, yyyy');

          items.push({
            contract: c,
            daysLeft,
            alertDay: 0,
            triggerLabel,
            reason: alert.reason,
            alertIndex,
            triggerDate: targetDate,
            daysUntilTrigger: dateDiff,
          });

          return;
        }

        if (!c.endDate) return;
        const expiryDate = parseISO(c.endDate);
        if (!isValid(expiryDate)) return;

        const targetDate = subDays(expiryDate, alert.daysBefore);
        const dateDiff = differenceInCalendarDays(targetDate, today);
        if (dateDiff < 0) {
          return;
        }

        if (daysLeft >= 0) {
          items.push({
            contract: c,
            daysLeft,
            alertDay: alert.daysBefore,
            triggerLabel: `${alert.daysBefore} days before (${format(targetDate, 'MMM d, yyyy')})`,
            reason: alert.reason,
            alertIndex,
            triggerDate: targetDate,
            daysUntilTrigger: dateDiff,
          });
        }
      });
      // Also show contracts expiring within 30 days even without explicit alerts
      if (daysLeft >= 0 && daysLeft <= 30 && c.alerts.length === 0) {
        if (!c.endDate) return;
        const targetDate = parseISO(c.endDate);
        if (!isValid(targetDate)) return;
        const dateDiff = differenceInCalendarDays(targetDate, today);
        items.push({
          contract: c,
          daysLeft,
          alertDay: 0,
          triggerLabel: 'Upcoming expiry',
          reason: null,
          alertIndex: -1,
          triggerDate: targetDate,
          daysUntilTrigger: dateDiff,
        });
      }
    });

    return items.sort((a, b) => a.daysUntilTrigger - b.daysUntilTrigger);
  }, [contracts]);

  const dueNowCount = alerts.filter(item => item.daysUntilTrigger === 0).length;

  return (
    <div className="space-y-6 pt-16">
      <AppSectionHeader title="D12 Contracts" icon={FileText} />

      <div className="animate-fade-up">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
          <button
            type="button"
            onClick={() => {
              if (editingTarget) {
                resetCreateForm();
              }
              setShowCreateForm(prev => !prev);
            }}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border bg-card hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" />
            {editingTarget ? 'Cancel edit' : 'New Custom Alert'}
          </button>
        </div>
        <p className="text-muted-foreground text-sm mt-1">{alerts.length} scheduled · {dueNowCount} due today</p>
      </div>

      {showCreateForm && (
        <div className="bg-card rounded-xl p-4 border space-y-3 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-sm font-semibold text-foreground">{editingTarget ? 'Edit Alert' : 'Create Custom Alert'}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Contract</label>
              <select
                value={selectedContractId}
                onChange={e => setSelectedContractId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
                disabled={saving || Boolean(editingTarget)}
              >
                <option value="">Select contract</option>
                {contracts
                  .filter(contract => contract.status === 'active' || contract.status === 'pending-cancellation')
                  .map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {CATEGORY_ICONS[contract.category]} {contract.name} ({contract.provider})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Trigger type</label>
              <select
                value={alertKind}
                onChange={e => setAlertKind(e.target.value as EditableAlertKind)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
                disabled={saving}
              >
                <option value="specific-date">Specific date</option>
                <option value="days-before">Days before expiry</option>
              </select>
            </div>
          </div>
          {alertKind === 'specific-date' ? (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Date</label>
              <input
                type="date"
                value={specificDate}
                onChange={e => setSpecificDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
                disabled={saving}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Days before expiry</label>
              <input
                type="number"
                min="1"
                value={daysBefore}
                onChange={e => setDaysBefore(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
                disabled={saving}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Specific message</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-card text-sm min-h-[88px]"
              placeholder="Write the custom alert message"
              disabled={saving}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={appEnabled} onChange={e => setAppEnabled(e.target.checked)} disabled={saving} />
              App
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={telegramEnabled} onChange={e => setTelegramEnabled(e.target.checked)} disabled={saving} />
              Telegram
            </label>
            <button
              type="button"
              onClick={handleTestCustomAlert}
              disabled={saving || testing}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted disabled:opacity-50"
            >
              {testing ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Test
            </button>
            <button
              type="button"
              onClick={handleCreateCustomAlert}
              disabled={saving || testing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {editingTarget ? 'Update Alert' : 'Save Alert'}
            </button>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="text-center py-16 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No alerts at the moment. All good! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((item, i) => {
            const urgency = getUrgencyLevel(item.daysUntilTrigger);
            return (
              <div
                key={`${item.contract.id}-${item.alertDay}-${i}`}
                className={cn(
                  'bg-card rounded-xl p-4 border flex items-center gap-4 animate-fade-up',
                  urgency === 'critical' && 'border-urgent/30',
                  urgency === 'warning' && 'border-warning/30',
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                  urgency === 'critical' && 'bg-urgent/10',
                  urgency === 'warning' && 'bg-warning/10',
                  urgency === 'soon' && 'bg-warning/10',
                  urgency === 'normal' && 'bg-muted',
                )}>
                  <BellRing className={cn(
                    'w-4 h-4',
                    urgency === 'critical' && 'text-urgent',
                    urgency === 'warning' && 'text-warning',
                    urgency === 'soon' && 'text-warning',
                    urgency === 'normal' && 'text-muted-foreground',
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {CATEGORY_ICONS[item.contract.category]} {item.contract.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.contract.provider} · Expires {item.contract.endDate ? format(parseISO(item.contract.endDate), 'MMM d, yyyy') : 'No date'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Trigger: {item.triggerLabel}
                    {item.reason ? ` · ${item.reason}` : ''}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    'text-sm font-bold tabular-nums',
                    urgency === 'critical' && 'text-urgent',
                    urgency === 'warning' && 'text-warning',
                    urgency === 'normal' && 'text-foreground',
                  )}>
                    {item.daysUntilTrigger}d
                  </p>
                  <p className="text-xs text-muted-foreground">until alert</p>
                  <div className="mt-2 flex justify-end gap-2">
                    {item.alertIndex >= 0 && (
                      <button
                        type="button"
                        onClick={() => startEditingAlert(item.contract.id, item.alertIndex)}
                        className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/contracts/${item.contract.id}`)}
                      className="rounded border px-2 py-1 text-xs hover:bg-muted"
                    >
                      Contract
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

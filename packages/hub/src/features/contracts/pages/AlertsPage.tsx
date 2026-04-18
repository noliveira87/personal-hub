import { useEffect, useMemo, useState } from 'react';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { getDaysUntilExpiry, getDisplayContractStatus, getUrgencyLevel } from '@/features/contracts/lib/contractUtils';
import { getContractCategoryIcon } from '@/features/contracts/types/contract';
import { differenceInCalendarDays, format, isValid, parseISO, subDays } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Bell, BellRing, FileText, Loader, Pencil, Plus, Send, Trash2 } from 'lucide-react';
import AppSectionHeader from '@/components/AppSectionHeader';
import { sendTelegramMessage } from '@/lib/telegram';
import { toast } from '@/components/ui/sonner';
import { useI18n } from '@/i18n/I18nProvider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  addTestAppAlert,
  markAppAlertAsRead,
  markContractAlertsAsRead,
  markOccurredAppAlertsAsRead,
  getUnreadOccurredAppAlerts,
  isTestAppAlertSignature,
  subscribeContractAlertReadState,
} from '@/features/contracts/lib/alertReadState';

type EditableAlertKind = 'days-before' | 'specific-date';

export default function AlertsPage() {
  const { contracts, updateContract } = useContracts();
  const { t } = useI18n();
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
  const [readStateVersion, setReadStateVersion] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<{ contractId: string; alertIndex: number } | null>(null);

  const isContractActionable = (contract: { status: 'active' | 'pending-cancellation' | 'expired' | 'archived'; endDate: string | null }) => {
    const status = getDisplayContractStatus(contract);
    return status === 'active' || status === 'pending-cancellation';
  };

  useEffect(() => subscribeContractAlertReadState(() => setReadStateVersion((prev) => prev + 1)), []);

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
      toast.error(t('contracts.alerts.validation.selectContractFirst'));
      return;
    }

    if (alertKind === 'specific-date' && !specificDate) {
      toast.error(t('contracts.alerts.validation.chooseDate'));
      return;
    }

    if (alertKind === 'specific-date' && !message.trim()) {
      toast.error(t('contracts.alerts.validation.writeSpecificMessage'));
      return;
    }

    if (alertKind === 'days-before' && (!Number.isFinite(daysBefore) || daysBefore < 1)) {
      toast.error(t('contracts.alerts.validation.validDaysBefore'));
      return;
    }

    if (!appEnabled && !telegramEnabled) {
      toast.error(t('contracts.alerts.validation.enableOneChannel'));
      return;
    }

    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) {
      toast.error(t('contracts.alerts.validation.selectedContractNotFound'));
      return;
    }

    if (telegramEnabled && !contract.telegramAlertEnabled) {
      toast.error(t('contracts.alerts.validation.enableContractTelegramFirst'));
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
      toast.success(editingTarget ? t('contracts.alerts.toast.updated') : t('contracts.alerts.toast.created'));
      resetCreateForm();
      setShowCreateForm(false);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : t('contracts.alerts.toast.createFailed');
      toast.error(errMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomAlert = async (contractId: string, alertIndex: number) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      toast.error(t('contracts.alerts.toast.contractNotFound'));
      return;
    }

    const targetAlert = contract.alerts[alertIndex];
    if (!targetAlert) {
      toast.error(t('contracts.alerts.toast.alertNotFound'));
      return;
    }

    try {
      setSaving(true);
      const nextAlerts = contract.alerts.filter((_, index) => index !== alertIndex);
      await updateContract({
        ...contract,
        alerts: nextAlerts,
      });

      if (editingTarget?.contractId === contractId && editingTarget.alertIndex === alertIndex) {
        resetCreateForm();
        setShowCreateForm(false);
      }

      toast.success(t('contracts.alerts.toast.deleted'));
    } catch (error) {
      console.error('Failed to delete custom alert:', error);
      const errMessage = error instanceof Error ? error.message : t('contracts.alerts.toast.deleteFailed');
      toast.error(errMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTestCustomAlert = async () => {
    if (!selectedContractId) {
      toast.error(t('contracts.alerts.validation.selectContractFirst'));
      return;
    }

    if (alertKind === 'specific-date' && !specificDate) {
      toast.error(t('contracts.alerts.validation.chooseDate'));
      return;
    }

    if (alertKind === 'specific-date' && !message.trim()) {
      toast.error(t('contracts.alerts.validation.writeSpecificMessage'));
      return;
    }

    if (alertKind === 'days-before' && (!Number.isFinite(daysBefore) || daysBefore < 1)) {
      toast.error(t('contracts.alerts.validation.validDaysBefore'));
      return;
    }

    if (!appEnabled && !telegramEnabled) {
      toast.error(t('contracts.alerts.validation.enableOneChannel'));
      return;
    }

    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) {
      toast.error(t('contracts.alerts.validation.selectedContractNotFound'));
      return;
    }

    if (telegramEnabled && !contract.telegramAlertEnabled) {
      toast.error(t('contracts.alerts.validation.enableContractTelegramFirst'));
      return;
    }

    const triggerText = alertKind === 'specific-date'
      ? t('contracts.alerts.triggerTextDate', { date: specificDate })
      : t('contracts.alerts.triggerTextDaysBefore', { days: Math.floor(daysBefore) });

    const preview = `${t('contracts.alerts.previewTitle', { contract: contract.name })}\n${triggerText}${message.trim() ? `\n${t('contracts.alerts.previewMessagePrefix', { message: message.trim() })}` : ''}`;

    try {
      setTesting(true);

      if (appEnabled) {
        addTestAppAlert({
          contractId: contract.id,
          contractName: contract.name,
          provider: contract.provider,
          triggerDate: new Date(),
          triggerLabel: t('contracts.alerts.testAlertLabel'),
          reason: message.trim() || preview,
        });
        toast(t('contracts.alerts.appTestPreviewTitle'), {
          description: preview,
        });
      }

      if (telegramEnabled) {
        const text = `🧪 <b>${t('contracts.alerts.telegramTitle')}</b>\n\n${t('contracts.alerts.telegramContractLabel')}: <b>${contract.name}</b>\n${t('contracts.alerts.telegramProviderLabel')}: ${contract.provider}\n${t('contracts.alerts.telegramTriggerLabel')}: ${triggerText}${message.trim() ? `\n${t('contracts.alerts.telegramMessageLabel')}: ${message.trim()}` : ''}`;
        await sendTelegramMessage(text);
      }

      toast.success(t('contracts.alerts.toast.testSent'));
    } catch (error) {
      console.error('Failed to test custom alert:', error);
      const errMessage = error instanceof Error ? error.message : t('contracts.alerts.toast.testFailed');
      toast.error(errMessage);
    } finally {
      setTesting(false);
    }
  };

  const alerts = useMemo(() => {
    const active = contracts.filter((contract) => isContractActionable(contract));
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
        if (!alert.enabled && !alert.telegramEnabled) {
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

          const triggerLabel = dateDiff === 0
            ? t('contracts.alerts.todayWithDate', { date: format(targetDate, 'MMM d, yyyy') })
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

        if (daysLeft >= 0) {
          items.push({
            contract: c,
            daysLeft,
            alertDay: alert.daysBefore,
            triggerLabel: t('contracts.alerts.daysBeforeWithDate', {
              days: alert.daysBefore,
              date: format(targetDate, 'MMM d, yyyy'),
            }),
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
          triggerLabel: t('contracts.alerts.upcomingExpiry'),
          reason: null,
          alertIndex: -1,
          triggerDate: targetDate,
          daysUntilTrigger: dateDiff,
        });
      }
    });

    return items.sort((a, b) => {
      const aAbs = Math.abs(a.daysUntilTrigger);
      const bAbs = Math.abs(b.daysUntilTrigger);
      if (aAbs !== bAbs) return aAbs - bAbs;
      return a.daysUntilTrigger - b.daysUntilTrigger;
    });
  }, [contracts, t]);

  const dueNowCount = alerts.filter(item => item.daysUntilTrigger === 0).length;


  // Ocorridos (histórico)
  // Derivar todos os ocorridos a partir dos lidos + não lidos
  const unreadOccurredList = useMemo(
    () => getUnreadOccurredAppAlerts(contracts).filter(alert => !isTestAppAlertSignature(alert.signature)),
    [contracts, readStateVersion],
  );
  const unreadOccurred = useMemo(() => new Set(unreadOccurredList.map(a => a.signature)), [unreadOccurredList]);
  // Para todos os ocorridos, unir os não lidos + lidos
  const occurredAlerts = useMemo(() => {
    // Pega todos os não lidos
    const unread = unreadOccurredList;
    // Para os lidos, derivar a partir dos que já ocorreram mas não estão em unread
    const today = new Date();
    // Função auxiliar local (cópia da original do alertReadState)
    function getOccurredAppAlertsForContract(contract, today) {
      if (!contract || !isContractActionable(contract)) return [];
      const occurred = [];
      contract.alerts.forEach((alert, index) => {
        if (!alert.enabled && !alert.telegramEnabled) return;
        let triggerDate = null;
        if (alert.kind === 'specific-date') {
          if (!alert.specificDate) return;
          const parsed = parseISO(alert.specificDate);
          if (!isValid(parsed)) return;
          triggerDate = parsed;
        } else {
          if (!contract.endDate) return;
          const expiryDate = parseISO(contract.endDate);
          if (!isValid(expiryDate)) return;
          triggerDate = subDays(expiryDate, alert.daysBefore);
        }
        if (!triggerDate || triggerDate > today) return;
        occurred.push({
          signature: `${contract.id}:${index}:${format(triggerDate, 'yyyy-MM-dd')}`,
          contractId: contract.id,
          contractName: contract.name,
          provider: contract.provider,
          triggerDate,
          triggerLabel: alert.kind === 'specific-date'
            ? format(triggerDate, 'MMM d, yyyy')
            : t('contracts.alerts.triggerLabelDaysBeforeExpiry', { days: alert.daysBefore }),
          reason: alert.reason?.trim() || null,
        });
      });
      return occurred;
    }
    const allOccurred = contracts
      .flatMap(contract => getOccurredAppAlertsForContract(contract, today))
      .filter(alert => !isTestAppAlertSignature(alert.signature));
    // Remover duplicados por signature
    const allMap = new Map();
    allOccurred.forEach(a => allMap.set(a.signature, a));
    // Garantir que os não lidos aparecem primeiro
    return Array.from(allMap.values()).sort((a, b) => b.triggerDate.getTime() - a.triggerDate.getTime());
  }, [contracts, unreadOccurredList, t]);

  // Handler para marcar todos como lidos
  const handleMarkAllOccurredAsRead = () => {
    markOccurredAppAlertsAsRead(contracts);
    toast.success(t('contracts.alerts.toast.markAllReadSuccess'));
  };

  return (
    <div className="space-y-6">
      <AppSectionHeader title="D12 Contracts" icon={FileText} />

      <div className="animate-fade-up">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">{t('contracts.alerts.title')}</h1>
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
            {editingTarget ? t('contracts.alerts.cancelEdit') : t('contracts.alerts.newCustomAlert')}
          </button>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {t('contracts.alerts.summaryScheduled', { count: alerts.length })} · {t('contracts.alerts.summaryDueToday', { count: dueNowCount })}
        </p>
      </div>

      {showCreateForm && (
        <div className="bg-card rounded-xl p-4 border space-y-3 animate-fade-up" style={{ animationDelay: '50ms' }}>
          <h2 className="text-sm font-semibold text-foreground">{editingTarget ? t('contracts.alerts.editAlert') : t('contracts.alerts.createCustomAlert')}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('contracts.alerts.form.contract')}</label>
              <select
                value={selectedContractId}
                onChange={e => setSelectedContractId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
                disabled={saving || Boolean(editingTarget)}
              >
                <option value="">{t('contracts.alerts.form.selectContract')}</option>
                {contracts
                  .filter((contract) => isContractActionable(contract))
                  .map(contract => (
                    <option key={contract.id} value={contract.id}>
                      {getContractCategoryIcon(contract.category, contract.type)} {contract.name} ({contract.provider})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('contracts.alerts.form.triggerType')}</label>
              <select
                value={alertKind}
                onChange={e => setAlertKind(e.target.value as EditableAlertKind)}
                className="w-full px-3 py-2 rounded-lg border bg-card text-sm"
                disabled={saving}
              >
                <option value="specific-date">{t('contracts.alerts.form.specificDate')}</option>
                <option value="days-before">{t('contracts.alerts.form.daysBeforeExpiry')}</option>
              </select>
            </div>
          </div>
          {alertKind === 'specific-date' ? (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t('contracts.alerts.form.date')}</label>
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
              <label className="text-xs text-muted-foreground block mb-1">{t('contracts.alerts.form.daysBeforeExpiry')}</label>
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
            <label className="text-xs text-muted-foreground block mb-1">{t('contracts.alerts.form.specificMessage')}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-card text-sm min-h-[88px]"
              placeholder={t('contracts.alerts.form.messagePlaceholder')}
              disabled={saving}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={appEnabled} onChange={e => setAppEnabled(e.target.checked)} disabled={saving} />
              {t('contracts.alerts.form.channelApp')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={telegramEnabled} onChange={e => setTelegramEnabled(e.target.checked)} disabled={saving} />
              {t('contracts.alerts.form.channelTelegram')}
            </label>
            <button
              type="button"
              onClick={handleTestCustomAlert}
              disabled={saving || testing}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted disabled:opacity-50"
            >
              {testing ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('contracts.alerts.form.test')}
            </button>
            <button
              type="button"
              onClick={handleCreateCustomAlert}
              disabled={saving || testing}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {editingTarget ? t('contracts.alerts.form.updateAlert') : t('contracts.alerts.form.saveAlert')}
            </button>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="text-center py-16 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <Bell className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t('contracts.alerts.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((item, i) => {
            const urgency = getUrgencyLevel(item.daysUntilTrigger);
            return (
              <div
                key={`${item.contract.id}-${item.alertDay}-${i}`}
                className={cn(
                  'bg-card rounded-xl p-4 border flex flex-col gap-3 animate-fade-up sm:flex-row sm:items-center sm:gap-4',
                  urgency === 'critical' && 'border-urgent/30',
                  urgency === 'warning' && 'border-warning/30',
                )}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="w-full flex items-start gap-3 sm:contents">
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

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground break-words">
                      {getContractCategoryIcon(item.contract.category, item.contract.type)} {item.contract.name}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      {item.contract.provider} · {t('contracts.alerts.expires')} {item.contract.endDate ? format(parseISO(item.contract.endDate), 'MMM d, yyyy') : t('contracts.alerts.noDate')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">
                      {t('contracts.alerts.triggerPrefix')}: {item.triggerLabel}
                      {item.reason ? ` · ${item.reason}` : ''}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 pl-1 sm:pl-0 sm:min-w-[68px]">
                    <p className={cn(
                      'text-2xl sm:text-sm font-bold tabular-nums leading-none',
                      item.daysUntilTrigger < 0 && 'text-muted-foreground',
                      item.daysUntilTrigger >= 0 && urgency === 'critical' && 'text-urgent',
                      item.daysUntilTrigger >= 0 && urgency === 'warning' && 'text-warning',
                      item.daysUntilTrigger >= 0 && urgency === 'normal' && 'text-foreground',
                    )}>
                      {item.daysUntilTrigger < 0 ? `${Math.abs(item.daysUntilTrigger)}d` : `${item.daysUntilTrigger}d`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 sm:mt-0">{item.daysUntilTrigger < 0 ? t('contracts.alerts.ago') : t('contracts.alerts.untilAlert')}</p>
                  </div>
                </div>

                <div className="w-full flex flex-wrap gap-2 sm:w-auto sm:justify-end">
                  {item.alertIndex >= 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditingAlert(item.contract.id, item.alertIndex)}
                        className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs hover:bg-muted"
                      >
                        <Pencil className="w-3 h-3" />
                        {t('contracts.alerts.editAction')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ contractId: item.contract.id, alertIndex: item.alertIndex })}
                        disabled={saving}
                        className="inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        {t('contracts.alerts.deleteAction')}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/contracts/${item.contract.id}`)}
                    className="rounded border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    {t('contracts.alerts.contractAction')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Seção de Alertas Ocorridos */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">{t('contracts.alerts.occurredTitle')}</h2>
          {occurredAlerts.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllOccurredAsRead}
              className="text-xs px-3 py-1 rounded border bg-card hover:bg-muted"
            >
              {t('contracts.alerts.markAllAsRead')}
            </button>
          )}
        </div>
        {occurredAlerts.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('contracts.alerts.occurredEmpty')}</p>
        ) : (
          <div className="space-y-2">
            {occurredAlerts.map(alert => (
              <div
                key={alert.signature}
                className={cn(
                  'bg-card rounded-lg border p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4',
                  unreadOccurred.has(alert.signature) ? 'border-warning/40' : 'border-muted',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground text-sm truncate">{alert.contractName}</span>
                    <span className="text-xs text-muted-foreground">{alert.provider}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {alert.triggerLabel} · {format(alert.triggerDate, 'dd/MM/yyyy')}
                    {alert.reason ? ` · ${alert.reason}` : ''}
                  </div>
                </div>
                <div className="w-full flex items-center justify-between sm:w-auto sm:flex-col sm:items-end sm:gap-1">
                  <span className={cn(
                    'text-xs',
                    unreadOccurred.has(alert.signature) ? 'text-warning font-semibold' : 'text-muted-foreground',
                  )}>
                    {unreadOccurred.has(alert.signature) ? t('contracts.alerts.unread') : t('contracts.alerts.read')}
                  </span>
                  {unreadOccurred.has(alert.signature) && (
                    <button
                      type="button"
                      className="text-xs underline text-warning"
                      onClick={() => {
                        if (alert.signature.startsWith('test:')) {
                          markAppAlertAsRead(alert.signature);
                        } else {
                          const contract = contracts.find(c => c.id === alert.contractId);
                          if (contract) {
                            markContractAlertsAsRead(contract);
                          }
                        }
                        toast.success(t('contracts.alerts.toast.markAsReadSuccess'));
                      }}
                    >
                      {t('contracts.alerts.markAsRead')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('contracts.alerts.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contracts.alerts.deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('contracts.alerts.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving || !deleteTarget}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async (event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                await handleDeleteCustomAlert(deleteTarget.contractId, deleteTarget.alertIndex);
                setDeleteTarget(null);
              }}
            >
              {saving ? t('contracts.alerts.deleteDialog.deleting') : t('contracts.alerts.deleteDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

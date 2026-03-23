import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContracts } from '@/features/contracts/context/ContractContext';
import {
  Contract, ContractCategory, ContractType, RenewalType, BillingFrequency, ContractStatus,
  CATEGORY_LABELS, TYPE_LABELS, RENEWAL_LABELS, BILLING_LABELS, STATUS_LABELS, AlertSetting,
} from '@/features/contracts/types/contract';
import { ArrowLeft, Plus, X } from 'lucide-react';

const defaultAlert = (): AlertSetting => ({ daysBefore: 30, enabled: true, telegramEnabled: false });

const emptyContract = (): Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> => ({
  name: '', category: 'other', provider: '', type: 'other',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
  renewalType: 'auto-renew', billingFrequency: 'monthly',
  price: 0, currency: 'EUR', notes: '', status: 'active',
  alerts: [defaultAlert()], telegramAlertEnabled: false, documentLinks: [],
});

export default function ContractForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addContract, updateContract, getContract } = useContracts();
  const isEdit = !!id;

  const [form, setForm] = useState(emptyContract());

  useEffect(() => {
    if (isEdit) {
      const existing = getContract(id!);
      if (existing) {
        const { id: _, createdAt, updatedAt, ...rest } = existing;
        setForm(rest);
      }
    }
  }, [id, isEdit, getContract]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    if (isEdit) {
      updateContract({ ...form, id: id!, createdAt: getContract(id!)!.createdAt, updatedAt: now });
    } else {
      addContract({ ...form, id: crypto.randomUUID(), createdAt: now, updatedAt: now });
    }
    navigate('/contracts');
  };

  const addAlert = () => set('alerts', [...form.alerts, defaultAlert()]);
  const removeAlert = (i: number) => set('alerts', form.alerts.filter((_, idx) => idx !== i));
  const updateAlert = (i: number, patch: Partial<AlertSetting>) =>
    set('alerts', form.alerts.map((a, idx) => idx === i ? { ...a, ...patch } : a));

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow';
  const labelClass = 'text-sm font-medium text-foreground mb-1.5 block';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-up">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-foreground animate-fade-up" style={{ animationDelay: '60ms' }}>
        {isEdit ? 'Edit Contract' : 'Add Contract'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
        {/* Basic info */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input className={inputClass} value={form.name} onChange={e => set('name', e.target.value)} required placeholder="e.g. Home Insurance" />
            </div>
            <div>
              <label className={labelClass}>Provider *</label>
              <input className={inputClass} value={form.provider} onChange={e => set('provider', e.target.value)} required placeholder="e.g. Allianz" />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <select className={inputClass} value={form.category} onChange={e => set('category', e.target.value as ContractCategory)}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select className={inputClass} value={form.type} onChange={e => set('type', e.target.value as ContractType)}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dates & billing */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Dates & Billing</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="date" className={inputClass} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>End / Renewal Date</label>
              <input type="date" className={inputClass} value={form.endDate} onChange={e => set('endDate', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Renewal Type</label>
              <select className={inputClass} value={form.renewalType} onChange={e => set('renewalType', e.target.value as RenewalType)}>
                {Object.entries(RENEWAL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Billing Frequency</label>
              <select className={inputClass} value={form.billingFrequency} onChange={e => set('billingFrequency', e.target.value as BillingFrequency)}>
                {Object.entries(BILLING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Price</label>
              <input type="number" step="0.01" min="0" className={inputClass} value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select className={inputClass} value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="CHF">CHF</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status & notes */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Status & Notes</h2>
          <div>
            <label className={labelClass}>Status</label>
            <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value as ContractStatus)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea className={inputClass + ' min-h-[80px] resize-y'} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." />
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-card rounded-xl p-6 border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Alerts</h2>
            <button type="button" onClick={addAlert} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" /> Add Alert
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={form.telegramAlertEnabled} onChange={e => set('telegramAlertEnabled', e.target.checked)} className="rounded" />
            <label className="text-sm text-foreground">Enable Telegram notifications</label>
          </div>
          {form.alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <input
                type="number"
                min="1"
                value={alert.daysBefore}
                onChange={e => updateAlert(i, { daysBefore: parseInt(e.target.value) || 1 })}
                className="w-20 px-2 py-1.5 rounded border bg-card text-sm text-center"
              />
              <span className="text-sm text-muted-foreground">days before</span>
              <label className="flex items-center gap-1.5 text-xs ml-auto">
                <input type="checkbox" checked={alert.enabled} onChange={e => updateAlert(i, { enabled: e.target.checked })} />
                App
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={alert.telegramEnabled} onChange={e => updateAlert(i, { telegramEnabled: e.target.checked })} />
                Telegram
              </label>
              <button type="button" onClick={() => removeAlert(i)} className="p-1 hover:bg-muted rounded active:scale-95">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors active:scale-[0.98] shadow-sm"
        >
          {isEdit ? 'Update Contract' : 'Add Contract'}
        </button>
      </form>
    </div>
  );
}

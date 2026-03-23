import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContracts } from '@/features/contracts/context/ContractContext';
import { StatusBadge } from '@/features/contracts/components/StatusBadge';
import { CategoryBadge } from '@/features/contracts/components/CategoryBadge';
import { getDaysUntilExpiry, formatCurrency, getUrgencyLevel } from '@/features/contracts/lib/contractUtils';
import { BILLING_LABELS, RENEWAL_LABELS, TYPE_LABELS, CATEGORY_ICONS } from '@/features/contracts/types/contract';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, Edit, Trash2, CalendarDays, Bell, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getContract, deleteContract, loading } = useContracts();
  const contract = getContract(id!);

  if (loading) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Loading contract...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Contract not found.</p>
        <Link to="/contracts/list" className="text-primary text-sm font-medium mt-2 inline-block hover:underline">← Back to contracts</Link>
      </div>
    );
  }

  const daysLeft = getDaysUntilExpiry(contract);
  const urgency = getUrgencyLevel(daysLeft);

  const handleDelete = () => {
    if (window.confirm('Delete this contract?')) {
      deleteContract(contract.id);
      navigate('/contracts');
    }
  };

  const infoRows = [
    { label: 'Provider', value: contract.provider },
    { label: 'Type', value: TYPE_LABELS[contract.type] },
    { label: 'Billing', value: BILLING_LABELS[contract.billingFrequency] },
    { label: 'Renewal', value: RENEWAL_LABELS[contract.renewalType] },
    { label: 'Start Date', value: format(parseISO(contract.startDate), 'MMM d, yyyy') },
    { label: 'End Date', value: format(parseISO(contract.endDate), 'MMM d, yyyy') },
    { label: 'Currency', value: contract.currency },
    { label: 'Status', value: null },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-up">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-3xl">{CATEGORY_ICONS[contract.category]}</span>
            <div>
              <h1 className="text-xl font-bold text-foreground">{contract.name}</h1>
              <p className="text-muted-foreground text-sm">{contract.provider}</p>
              <div className="flex items-center gap-2 mt-2">
                <CategoryBadge category={contract.category} />
                <StatusBadge status={contract.status} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={`/contracts/list/edit/${contract.id}`} className="p-2 rounded-lg border hover:bg-muted transition-colors active:scale-95">
              <Edit className="w-4 h-4" />
            </Link>
            <button onClick={handleDelete} className="p-2 rounded-lg border hover:bg-destructive/10 text-destructive transition-colors active:scale-95">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Price & expiry */}
        <div className="mt-6 flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(contract.price, contract.currency)}
              <span className="text-sm font-normal text-muted-foreground ml-1">/ {BILLING_LABELS[contract.billingFrequency].toLowerCase()}</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Expires in</p>
            <p className={cn(
              'text-2xl font-bold tabular-nums',
              urgency === 'critical' && 'text-urgent',
              urgency === 'warning' && 'text-warning',
            )}>
              {daysLeft <= 0 ? 'Expired' : `${daysLeft} days`}
            </p>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '140ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4">Contract Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {infoRows.map(row => (
            <div key={row.label}>
              <p className="text-xs text-muted-foreground">{row.label}</p>
              {row.label === 'Status' ? <StatusBadge status={contract.status} /> : (
                <p className="text-sm font-medium text-foreground mt-0.5">{row.value}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {contract.notes && (
        <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '200ms' }}>
          <h2 className="text-sm font-semibold text-foreground mb-2">Notes</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{contract.notes}</p>
        </div>
      )}

      {/* Alerts */}
      <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '260ms' }}>
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4" /> Alert Settings
        </h2>
        {contract.alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts configured.</p>
        ) : (
          <div className="space-y-2">
            {contract.alerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm text-foreground">{alert.daysBefore} days before</span>
                <div className="flex gap-3 text-xs">
                  <span className={alert.enabled ? 'text-success' : 'text-muted-foreground'}>
                    {alert.enabled ? '✓ App' : '✗ App'}
                  </span>
                  <span className={alert.telegramEnabled ? 'text-success' : 'text-muted-foreground'}>
                    {alert.telegramEnabled ? '✓ Telegram' : '✗ Telegram'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {contract.telegramAlertEnabled && (
          <p className="text-xs text-primary mt-3">📱 Telegram notifications enabled</p>
        )}
      </div>

      {/* Documents */}
      {contract.documentLinks.length > 0 && (
        <div className="bg-card rounded-xl p-6 border animate-fade-up" style={{ animationDelay: '320ms' }}>
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documents
          </h2>
          <div className="space-y-2">
            {contract.documentLinks.map((doc, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
                <FileText className="w-3 h-3" /> {doc}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

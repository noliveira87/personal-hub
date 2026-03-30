import { useState } from 'react';
import { Plus, X, Trash2, Edit } from 'lucide-react';
import { usePriceHistory } from '@/hooks/use-price-history';
import { formatCurrency } from '@/features/contracts/lib/contractUtils';
import { PriceHistory } from '@/features/contracts/types/contract';

interface PriceHistoryModalProps {
  contractId: string;
  contractName: string;
  currentPrice: number;
  currency: string;
  onClose: () => void;
}

export function PriceHistoryModal({
  contractId,
  contractName,
  currentPrice,
  currency,
  onClose,
}: PriceHistoryModalProps) {
  const { history, loading, error, addEntry, deleteEntry, updateEntry } = usePriceHistory(contractId);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    price: currentPrice,
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        // Update existing entry
        await updateEntry(editingId, formData.price, currency, formData.date, formData.notes || undefined);
      } else {
        // Add new entry
        await addEntry(formData.price, currency, formData.date, formData.notes || undefined);
      }
      setFormData({
        price: currentPrice,
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error('Error saving price entry:', err);
      alert('Failed to save price entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEntry = (entry: PriceHistory) => {
    setEditingId(entry.id);
    setFormData({
      price: entry.price,
      date: entry.date,
      notes: entry.notes || '',
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      price: currentPrice,
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowForm(false);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Remove this price entry?')) return;
    try {
      await deleteEntry(entryId);
    } catch (err) {
      console.error('Error deleting price entry:', err);
      alert('Failed to delete price entry. Please try again.');
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card rounded-xl border max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
        <div className="sticky top-0 bg-card border-b p-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{contractName}</h2>
            <p className="text-xs text-muted-foreground mt-1">Current: {formatCurrency(currentPrice, currency)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Form */}
          {showForm && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3 border">
              <h3 className="text-sm font-semibold text-foreground">
                {editingId ? 'Edit Price Entry' : 'Add Price Entry'}
              </h3>
              <form onSubmit={handleAddEntry} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className={inputClass}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className={inputClass}
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground mb-1 block">Notes (optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g., price increase due to inflation"
                    className={inputClass}
                    disabled={submitting}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={submitting}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingId ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History list */}
          {loading ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Loading price history...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-sm text-destructive">Error: {error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No price history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-foreground">
                        {formatCurrency(entry.price, entry.currency)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditEntry(entry)}
                      className="p-1.5 hover:bg-primary/10 rounded transition-colors"
                    >
                      <Edit className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Toggle form button */}
          <div className="flex justify-center">
            <button
              onClick={() => setShowForm(!showForm)}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {showForm ? 'Hide Form' : 'Add Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

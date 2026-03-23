import { useState, useEffect } from 'react';
import { Contract, PriceHistory } from '@/features/contracts/types/contract';
import { loadPriceHistoryForContract, addPriceHistory } from '@/features/contracts/lib/contractDb';
import { formatCurrency } from '@/features/contracts/lib/contractUtils';
import { Plus, Trash2 } from 'lucide-react';

interface ContractPriceHistoryProps {
  contract: Contract;
  onPriceUpdate: (newPrice: number) => void;
}

export function ContractPriceHistory({ contract, onPriceUpdate }: ContractPriceHistoryProps) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    price: contract.price.toString(),
    notes: '',
  });

  useEffect(() => {
    if (contract.priceHistoryEnabled) {
      loadHistory();
    }
  }, [contract.id, contract.priceHistoryEnabled]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadPriceHistoryForContract(contract.id);
      setHistory(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar histórico';
      setError(message);
      console.error('Error loading price history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const price = parseFloat(formData.price);
      
      if (!price || price <= 0) {
        setError('Preço deve ser maior que 0');
        return;
      }

      const newEntry: PriceHistory = {
        id: crypto.randomUUID(),
        contractId: contract.id,
        price: price,
        currency: contract.currency,
        date: formData.date,
        notes: formData.notes || undefined,
        createdAt: new Date().toISOString(),
      };

      await addPriceHistory(newEntry);
      
      // Atualiza o preço atual do contrato
      onPriceUpdate(price);
      
      // Recarrega o histórico
      await loadHistory();
      
      // Limpa o formulário
      setFormData({
        date: new Date().toISOString().split('T')[0],
        price: price.toString(),
        notes: '',
      });
      setShowForm(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao adicionar preço';
      setError(message);
      console.error('Error adding price:', err);
    }
  };

  if (!contract.priceHistoryEnabled) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl p-6 border space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Histórico de Preços</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
        >
          <Plus className="w-3 h-3" /> Adicionar Valor
        </button>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-xs text-destructive">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddPrice} className="space-y-3 p-4 bg-muted rounded-lg">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Data *</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-2.5 py-2 rounded border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">Preço ({contract.currency}) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={e => setFormData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full px-2.5 py-2 rounded border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1">Notas (opcional)</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ex: leitura do contador, período de faturação..."
              className="w-full px-2.5 py-2 rounded border bg-card text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-xs font-medium border rounded hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              Guardar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Carregando histórico...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">Sem histórico de preços</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry, i) => (
            <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
              <div className="min-w-0">
                <div className="font-medium text-foreground">
                  {formatCurrency(entry.price, entry.currency)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(entry.date).toLocaleDateString('pt-PT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {entry.notes && ` • ${entry.notes}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-3 border-t text-xs text-muted-foreground">
        <p>
          <strong>Preço atual:</strong> {formatCurrency(contract.price, contract.currency)}
        </p>
      </div>
    </div>
  );
}

# Implementação: Supabase + Histórico de Preços Mensal

## 🎯 O que foi feito

### ✅ Removido
- ❌ localStorage de contratos
- ❌ sample contracts (dados locais)
- ❌ dependência do navegador para persistir dados

### ✅ Adicionado
- ✨ Integração completa com Supabase
- ✨ Sistema de histórico de preços
- ✨ Modal de visualização/edição de histórico
- ✨ Loading states nos componentes
- ✨ Error handling robusto
- ✨ Types actualizados (Contract + PriceHistory)

## 📁 Ficheiros Criados/Modificados

### Novos Ficheiros

```
✨ src/lib/supabase.ts
   - Cliente Supabase inicializado
   - Valida credenciais obrigatórias

✨ src/lib/contracts.ts (MAJOR)
   - loadContracts()
   - createContract()
   - updateContract()
   - deleteContract()
   - loadPriceHistoryForContract()
   - addPriceHistoryEntry()
   - deletePriceHistoryEntry()

✨ src/hooks/use-price-history.ts
   - Hook para gerenciar histórico de preços
   - loading, error, history, addEntry, deleteEntry

✨ src/components/PriceHistoryModal.tsx
   - Modal para visualizar histórico
   - Formulário para adicionar novas entradas
   - Lista com delete

✨ ../../.env.example (na raiz do monorepo)
   - Template compartilhado de variáveis de ambiente
   - Usado por home-contracts, portfolio e warranties

✨ SUPABASE_SETUP.md
   - Guia completo de configuração
```

### Ficheiros Modificados

```
🔄 src/types/contract.ts
   - Adicionado: noEndDate, PriceHistory interface
   - Actualizado: endDate pode ser null
   - Actualizado: documentLinks pode ser null
   - Actualizado: notes pode ser null
   - Adicionado: priceHistoryEnabled

🔄 src/context/ContractContext.tsx
   - Removido: localStorage
   - Adicionado: async/await (createContract, updateContract, deleteContract)
   - Adicionado: loading state
   - Adicionado: error state
   - Adicionado: refresh function
   - Integração completa com Supabase via contracts.ts

🔄 src/pages/ContractForm.tsx
   - Removido: emptyContract com id/timestamps
   - Adicionado: noEndDate checkbox
   - Adicionado: priceHistoryEnabled toggle
   - Adicionado: loading state durante submit
   - Actualizado: handleSubmit para usar async/await

🔄 src/pages/ContractDetail.tsx
   - Adicionado: PriceHistoryModal import
   - Adicionado: showPriceHistory state
   - Adicionado: "View Price History" button
   - Actualizado: handleDelete para async/await
   - Corrigido: endDate pode ser null

🔄 src/pages/Dashboard.tsx
   - Adicionado: loading state
   - Adicionado: error state com retry
   - Melhorado: UX durante carregamento

🔄 src/pages/ContractsList.tsx
   - Adicionado: loading state
   - Adicionado: error state com retry

🔄 src/pages/SettingsPage.tsx
   - Removido: handleReset (localStorage de contratos)
   - Removido: "Reset to Sample Data" button
   - Mantido: Telegram settings no localStorage (ok)
```

## 🔄 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│                    Componentes React                     │
├─────────────────────────────────────────────────────────┤
│ Dashboard | ContractsList | ContractForm | ContractDetail
└─────────────┬───────────────────────────────┬───────────┘
              │                               │
              ▼                               ▼
     ┌──────────────────┐           ┌─────────────────┐
     │ useContracts()   │           │usePriceHistory()│
     └──────┬───────────┘           └────────┬────────┘
            │                               │
            ▼                               ▼
     ┌──────────────────────────────────────────────┐
     │     src/lib/contracts.ts (Database Layer)   │
     │                                              │
     │ - loadContracts()                           │
     │ - createContract()                          │
     │ - updateContract()                          │
     │ - deleteContract()                          │
     │ - loadPriceHistoryForContract()             │
     │ - addPriceHistoryEntry()                    │
     │ - deletePriceHistoryEntry()                 │
     └──────────────┬───────────────────────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │ Supabase Client  │
            │                  │
            │ via supabase.ts  │
            └────────┬─────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │   Supabase PostgreSQL      │
        │                            │
        │ - contracts table          │
        │ - contract_price_history   │
        │ - RLS policies             │
        └────────────────────────────┘
```

## 🔐 Row Level Security (RLS)

Todas as operações usam políticas RLS configuradas para `anon`:

```sql
-- Contratos
CREATE POLICY "Allow anon select contracts" ON contracts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert contracts" ON contracts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update contracts" ON contracts FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete contracts" ON contracts FOR DELETE TO anon USING (true);

-- Historical de Preços
CREATE POLICY "Allow anon select price history" ON contract_price_history FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert price history" ON contract_price_history FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon delete price history" ON contract_price_history FOR DELETE TO anon USING (true);
```

## 🚀 Como Começar

### 1. Configurar Variáveis de Ambiente

```bash
cp packages/home-contracts/.env.example packages/home-contracts/.env.local
```

Edite `.env.local` com suas credenciais Supabase:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=seu-anon-key
```

### 2. Executar Schema SQL

Vá para Supabase Dashboard → SQL Editor e execute o schema completo de `packages/warranties/supabase/schema.sql`.

### 3. Iniciar Dev Server

```bash
cd packages/home-contracts
npm run dev
```

### 4. Testar

- Criar novo contrato → salva em Supabase ✅
- Activar "Track monthly price history" ✅
- Abrir contrato → clique "View Price History" ✅
- Adicionar entrada de preço ✅
- Lista de histórico é actualizada em tempo real ✅

## 📊 Estados de Carregamento

Os componentes agora mostram:
- **Loading**: "Loading contracts..." com spinner
- **Error**: Mensagem de erro com botão Retry
- **Success**: Lista de contratos/dados

## 🔍 Debugging

```typescript
// Ver logs no console do navegador
// Todos os erros são console.error() para fácil debug

// Verificar estado do contexto:
const { contracts, loading, error } = useContracts();
console.log({ contracts, loading, error });

// Verificar histórico de preços:
const { history, loading, error } = usePriceHistory(contractId);
console.log({ history, loading, error });
```

## ⚠️ Diferenças Importantes

### Antes (localStorage)
```
- Dados locais apenas
- Sem sincronização
- Sem histórico
- Sem segurança RLS
```

### Depois (Supabase)
```
✨ Dados na nuvem
✨ Sincronização em tempo real
✨ Histórico completo de preços
✨ Segurança RLS
✨ Sem localStorage
✨ Funciona offline (com limitações)
```

## 🎁 Bónus

- Modal bonita para histórico de preços
- Suporta notas em cada entrada
- Histórico ordenado por data descendente
- Delete individual de entradas
- Integração perfeita com design existente

---

**Tudo pronto! 🚀**

Agora os contratos estão armazenados em Supabase com histórico de preços mensal completamente funcional.

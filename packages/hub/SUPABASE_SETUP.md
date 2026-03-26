# Home Contracts - Supabase Integration

Este projeto foi completamente atualizado para usar **Supabase** como backend, eliminando completamente a dependência de localStorage.

## Características

✅ **Contratos armazenados em Supabase**  
✅ **Sistema de histórico de preços mensal**  
✅ **Sem localStorage - dados apenas no servidor**  
✅ **Real-time sync com banco de dados**  
✅ **Row Level Security configurado**  

## Configuração Necessária

### 1. Variáveis de Ambiente (Shared entre todos os componentes)

Crie um arquivo `.env.local` na **raiz do monorepo** (not in `packages/home-contracts/`):

```bash
# Na raiz do projeto
cd /path/to/personal-hub
cp .env.example .env.local
```

Edite `.env.local`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=seu-anon-key-aqui
```

**Como obter:**
1. Aceda ao [Supabase Dashboard](https://app.supabase.com)
2. Seleccione o seu projeto
3. Vá para **Settings → API**
4. Copie o **Project URL** e a **anon (public) key**

**Nota:** Este .env.local é partilhado pelos 3 componentes:
- `packages/home-contracts/`
- `packages/portfolio/`
- `packages/warranties/`

### 2. Schema do Banco de Dados

O schema já foi criado em `packages/warranties/supabase/schema.sql`. **Você precisa executar este script no seu banco de dados Supabase:**

1. No Supabase Dashboard, vá para **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo completo do arquivo `schema.sql`
4. Clique em **Run**

Alternativamente, você pode copiar o script diretamente para o Supabase usando:
1. **Database → Migrations** (se disponível na sua versão)
2. Ou executar linha por linha no **SQL Editor**

### 3. Estrutura de Dados

Os contratos são armazenados em da seguinte forma:

```sql
-- Tabela de contratos
CREATE TABLE contracts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  provider TEXT NOT NULL,
  type TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  no_end_date BOOLEAN DEFAULT false,
  renewal_type TEXT NOT NULL,
  billing_frequency TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL,
  currency TEXT not null default 'EUR',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  alerts JSONB DEFAULT '[]'::jsonb,
  telegram_alert_enabled BOOLEAN DEFAULT false,
  document_links TEXT[],
  price_history_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de histórico de preços
CREATE TABLE contract_price_history (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  price NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  date TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Como Usar

### Adicionar um Novo Contrato

1. Clique em "Add Contract"
2. Preencha os detalhes do contrato
3. **Ative "Track monthly price history"** se quiser rastrear mudanças de preço
4. Clique em "Add Contract"

Os dados são salvos automaticamente no Supabase.

### Rastrear Histórico de Preços

1. Abra o detalhe de um contrato
2. Se "Track monthly price history" estiver ativado, verá um botão **"View Price History"**
3. Clique para abrir a modal de histórico
4. Adicione novas entradas de preço com a data e notas opcionais

### Remover Dados Locais

As configurações agora usam um modo híbrido:
- **Primário:** tabela `app_settings` no Supabase (global para a família)
- **Fallback:** localStorage no navegador (se a tabela não existir ou houver erro)

## Settings Globais (Family Mode)

Para persistir Settings na base de dados, execute também:

1. Abra **SQL Editor** no Supabase
2. Crie uma nova query
3. Execute o conteúdo de:

`packages/hub/supabase/settings.sql`

Isso cria:
- tabela `public.app_settings` (singleton com `id = 'global'`)
- políticas RLS para o modo A (family/shared, sem login)
- linha inicial default

## Ledger de Rewards / Surveys do Portfolio

Para que cashback, surveys e crypto cashback contem para a evolução mensal do portfolio, executa também:

1. Abra **SQL Editor** no Supabase
2. Crie uma nova query
3. Execute o conteúdo de:

`packages/hub/supabase/portfolio_earnings.sql`

Isto cria:
- tabela `public.portfolio_earnings`
- suporte para `cashback`, `survey` e `crypto_cashback`
- políticas RLS para leitura/escrita com a anon key atual

## Persistência da ordem dos cards de investimento

Para manter a ordem de cards de `Short-term` e `Long-term` entre sessões/dispositivos, executa também:

1. Abra **SQL Editor** no Supabase
2. Crie uma nova query
3. Execute o conteúdo de:

`packages/hub/supabase/portfolio_card_order.sql`

Isto cria:
- tabela `public.portfolio_card_order`
- persistência da ordem por categoria (`short-term`, `long-term`)
- políticas RLS para leitura/escrita com a anon key atual

### Campos persistidos em `app_settings`

- Telegram: `telegram_bot_token`, `telegram_chat_id`
- Alertas: `warranties_enabled`, `contracts_enabled`, `portfolio_enabled`, `warranty_alert_days`

> Nota: no modo atual (A), qualquer cliente com `anon key` pode ler/escrever essa configuração global. Quando quiseres multi-user com auth, trocamos para políticas por utilizador.

## Alertas automáticos de Warranty (sem abrir a app)

Se quiseres garantir envio de Telegram mesmo quando ninguém abre a página, ativa o job server-side no Supabase:

1. Abre **SQL Editor** no Supabase
2. Cria uma nova query
3. Executa o ficheiro:

`packages/hub/supabase/warranty_alerts_cron.sql`

Isto cria:
- função `public.send_warranty_expiry_alerts()`
- agendamento diário via `pg_cron` (09:15 UTC)
- envio direto para Telegram via `pg_net`

Comportamento atual dos alertas de Warranty:
- envia **1 vez** quando faltam exatamente `warranty_alert_days` dias para expirar
- não envia diariamente dentro da janela

### Como validar que está a funcionar

1. Em **Settings**, guarda `Bot Token` e `Chat ID` válidos
2. Em **Warranty settings**, ativa alerts e define `Alert lead time`
3. No **SQL Editor**, executa manualmente:

```sql
select public.send_warranty_expiry_alerts();
```

4. Confirma receção da mensagem no Telegram
5. Verifica se o cron está registado:

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'warranty-expiry-alerts';
```

> Nota: o horário do cron está em UTC. Se quiseres horário local, ajusta a expressão cron no ficheiro SQL.

Todos os contratos e histórico de preços são armazenados exclusivamente no Supabase.

## Mensagens de Erro Comum

### "Supabase credentials not configured"
- Verifique se `.env.local` existe
- Confirme que `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão preenchidos corretamente
- Reinicie o servidor de desenvolvimento

### "Failed to load contracts"
- Verifique a conexão com a internet
- Confirme que o Supabase está funcionando (teste no dashboard)
- Verifique os logs da consola do navegador para mais detalhes

### "Row Level Security policy denied"
- Certifique-se de que executou todo o schema SQL
- As políticas RLS devem estar configuradas como `to anon`
- Tente desabilitar RLS temporariamente para debug (não recomendado em produção)

## Estrutura de Ficheiros Novos

```
src/
├── lib/
│   ├── supabase.ts          # Cliente Supabase
│   ├── contracts.ts         # Funções de acesso à base de dados
│
├── hooks/
│   └── use-price-history.ts # Hook para gerenciar histórico de preços
│
└── components/
    └── PriceHistoryModal.tsx # Modal para visualizar/adicionar histórico
```

## Tipos de Dados (TypeScript)

```typescript
interface Contract {
  id: string;
  name: string;
  category: ContractCategory;
  provider: string;
  type: ContractType;
  startDate: string;          // ISO date
  endDate: string | null;     // ISO date
  noEndDate: boolean;
  renewalType: RenewalType;
  billingFrequency: BillingFrequency;
  price: number;
  currency: string;           // 'EUR', 'USD', etc
  notes: string | null;
  status: ContractStatus;
  alerts: AlertSetting[];
  telegramAlertEnabled: boolean;
  documentLinks: string[] | null;
  priceHistoryEnabled: boolean;
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
}

interface PriceHistory {
  id: string;
  contractId: string;
  price: number;
  currency: string;
  date: string;               // ISO date
  notes: string | null;
  createdAt: string;          // ISO timestamp
}
```

## Segurança

- **Row Level Security**: Todas as queries passam por políticas RLS
- **Anon Key**: Usada apenas para operações públicas
- **Sem Credenciais no Código**: As chaves estão em variáveis de ambiente
- **Histórico de Preços**: Protegido por RLS e foreign keys

## Migração de Dados Antigos

Se tinha dados em localStorage antes desta atualização:

1. **Backup manual**: Abra o DevTools → Application → localStorage
2. **Copie os dados** do contrato anterior
3. **Recrie manualmente** no novo formulário, ou
4. **Use um script de importação** (a ser implementado se necessário)

## Próximas Melhorias

- [ ] Gráfico de evolução de preços
- [ ] Exportar histórico em CSV/PDF
- [ ] Automação de atualização de preços
- [ ] Backup/restore de dados
- [ ] Multi-user support com autenticação

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs no DevTools (F12 → Console)
2. Verifique o estado do Supabase no dashboard
3. Confirme a configuração de `.env.local`

---

**Última atualização:** Março 2026

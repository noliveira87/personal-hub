# ✅ Checklist - Primeiros Passos

## Setup (5 minutos)

- [ ] **Copiar .env.example para .env.local (na raiz do monorepo)**
  ```bash
  cd personal-hub  # raiz do projeto
  cp .env.example .env.local
  ```

- [ ] **Adicionar credenciais Supabase**
  - Abir `.env.local` na **raiz** (not in `packages/home-contracts/`)
  - Ir para [Supabase Dashboard](https://app.supabase.com)
  - Settings → API → Copiar URL e Anon Key
  - Colar no `.env.local`

- [ ] **Executar schema SQL**
  - Copiar todo o conteúdo de `../../warranties/supabase/schema.sql`
  - Ir para Supabase Dashboard → SQL Editor
  - Novo Query → Colar → Run

- [ ] **Reiniciar servidor de desenvolvimento**
  - Parar servidor atual (Ctrl+C)
  - Rodar `npm run dev` de novo

## Testes (10 minutos)

- [ ] **Criar primeiro contrato**
  - Ir para "Add Contract"
  - Preencher formulário
  - Ativar "Track monthly price history" (importante!)
  - Clique "Add Contract"

- [ ] **Verificar no Supabase**
  - Dashboard → Table Editor
  - Selecciona "contracts"
  - Deve ver a linha do contrato criado

- [ ] **Adicionar histórico de preço**
  - Abrir detalhe do contrato
  - Clique "View Price History"
  - Clique "Add Entry"
  - Adicione uma entrada com preço e data
  - Clique "Save"

- [ ] **Verificar histórico no Supabase**
  - Dashboard → Table Editor
  - Selecciona "contract_price_history"
  - Deve ver entrada com contract_id correto

## Validação Final

- [ ] Sem localStorage para contratos
- [ ] Sem errors na consola do browser
- [ ] Sem errors na consola do servidor
- [ ] Dados persistem após F5 (refresh)
- [ ] Modal de preço history funciona
- [ ] Delete de contrato funciona
- [ ] Update de contrato funciona

## Troubleshooting

### ❌ "Supabase credentials not configured"
- **Solução**: Verificar se `.env.local` existe na **raiz do projeto** (não em `packages/home-contracts/`)
- **Verificar**: `cat ../../.env.local` deve mostrar as credenciais
- Ler [ENV_SETUP.md](../../../ENV_SETUP.md) para troubleshooting detalhado

### ❌ "Failed to connect to Supabase"
- **Solução**: Verificar URL e Anon Key no `.env.local`
- **Verificar**: Copiar exatamente do Supabase Dashboard (sem espaços)

### ❌ "Row level security policy denied"
- **Solução**: Executar novamente o schema SQL
- **Verificar**: Supabase Dashboard → Authentication → Policies

### ❌ "Cannot read property 'contractId' of undefined"
- **Solução**: Aguardar que dados carreguem (loading state)
- **Verificar**: Consola do browser para erros específicos

## Próximas Funcionalidades (Opcional)

- [ ] Gráfico de evolução de preço (Chart.js)
- [ ] Exportar histórico em CSV
- [ ] Comparar preços entre períodos
- [ ] Notificação de aumento de preço
- [ ] Sincronização em tempo real com Realtime do Supabase
- [ ] Suporte para múltiplos usuários

## Ficheiros Importantes

- `src/lib/supabase.ts` - Cliente Supabase
- `src/lib/contracts.ts` - Funções de BD
- `src/context/ContractContext.tsx` - Contexto das contratos
- `src/hooks/use-price-history.ts` - Hook do histórico
- `src/components/PriceHistoryModal.tsx` - Modal de histórico

## Comandos Úteis

```bash
# Ver logs do Supabase em tempo real
supabase status

# Verificar variáveis de ambiente
cat .env.local

# Ver erros no browser
# Abrir DevTools (F12) → Console → Application → Local Storage (deve estar vazio!)

# Testar conexão Supabase
curl https://seu-projeto.supabase.co/rest/v1/ -H "Authorization: Bearer seu-anon-key"
```

## Documentação Adicional

- [../../../ENV_SETUP.md](../../../ENV_SETUP.md) - Guia completo de setup de variáveis de ambiente (shared entre todos os packages)
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Guia de configuração Supabase
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Detalhes técnicos
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

**Status**: ✅ Implementação Completa  
**Data**: Março 2026  
**Próximo passo**: Contactar suporte se houver dúvidas

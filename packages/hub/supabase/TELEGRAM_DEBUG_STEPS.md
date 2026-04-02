# Debug Telegram Alertas - Passos Sequenciais

**Objetivo:** Identificar por que as mensagens Telegram não estão a ser entregues via pg_cron (mas funcionam em teste manual).

**Data:** 2 Abril 2026  
**Status Atual:** Cron job executa com sucesso (status=succeeded) mas mensagens não chegam

---

## 🔍 Passo 1: Verificar Credentials

**Objetivo:** Confirmar que `telegram_bot_token` e `telegram_chat_id` estão preenchidos.

Executar em SQL Editor do Supabase:

```sql
select
  id,
  contracts_enabled,
  telegram_bot_token,
  telegram_chat_id,
  (telegram_bot_token is not null and telegram_bot_token <> '') as has_token,
  (telegram_chat_id is not null and telegram_chat_id <> '') as has_chat_id
from public.app_settings
where id = 'global';
```

**O que procurar:**
- ✅ `has_token` = true
- ✅ `has_chat_id` = true
- ✅ Os valores não devem estar vazios ou NULL

**Se tudo OK:** Continue para Passo 2  
**Se falhar:** Volte a Settings e preencha as credenciais Telegram

---

## 🎯 Passo 2: Verificar Alertas Ativos para Hoje

**Objetivo:** Confirmar que existem alertas com `specific-date` = hoje que devem ser enviados.

```sql
with expanded as (
  select
    c.id as contract_id,
    c.name as contract_name,
    c.provider,
    a.alert,
    a.alert_index
  from public.contracts c
  cross join lateral jsonb_array_elements(coalesce(c.alerts, '[]'::jsonb)) with ordinality as a(alert, alert_index)
  where c.status in ('active', 'pending-cancellation')
    and coalesce(c.telegram_alert_enabled, false) = true
),
normalized as (
  select
    e.contract_id,
    e.contract_name,
    e.provider,
    e.alert_index,
    coalesce(e.alert->>'kind', 'days-before') as kind,
    case
      when coalesce(e.alert->>'specificDate', '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then (e.alert->>'specificDate')::date
      else null
    end as trigger_date,
    coalesce((e.alert->>'telegramEnabled')::boolean, false) as telegram_enabled,
    coalesce(nullif(e.alert->>'reason', ''), '') as reason,
    e.alert as full_alert_json
  from expanded e
)
select
  n.contract_id,
  n.contract_name,
  n.provider,
  n.alert_index,
  n.kind,
  n.trigger_date,
  n.telegram_enabled,
  n.reason,
  current_date,
  (n.trigger_date = current_date) as should_trigger_today,
  n.full_alert_json
from normalized n
where n.kind = 'specific-date'
order by n.contract_name, n.alert_index;
```

**O que procurar:**
- ✅ Pelo menos 1 linha com `kind` = 'specific-date'
- ✅ `trigger_date` = hoje (2026-04-02)
- ✅ `should_trigger_today` = true
- ✅ `telegram_enabled` = true

**Se tudo OK:** Continue para Passo 3  
**Se não houver alertas:** Crie um alerta de teste em Contratos com data de hoje e telegram ativado

---

## 📋 Passo 3: Verificar Deduplicação

**Objetivo:** Confirmar se o alerta já foi marcado como "enviado" hoje (o que bloquearia reenvio).

```sql
select
  jsonb_array_elements(contracts_alerts_sent -> to_char(current_date, 'YYYY-MM-DD'))::text as sent_signature
from public.app_settings
where id = 'global'
  and contracts_alerts_sent ? to_char(current_date, 'YYYY-MM-DD');
```

**O que procurar:**
- ❌ **Nenhuma linha** = Nada foi enviado ainda (BOM! Continue)
- ✅ **Com linhas** = Alertas já foram enviados hoje (se for o esperado, tudo OK)

**Formato esperado de signature:**
```
"contractId:alertIndex:YYYY-MM-DD"
```

Exemplo: `"5e7a2c3d-1234-5678-abcd-ef0123456789:0:2026-04-02"`

---

## 🚀 Passo 4: Teste Direto da API Telegram

**Objetivo:** Confirmar que a API Telegram está acessível e as credenciais são válidas.

```sql
do $$
declare
  v_response json;
  v_token text;
  v_chat_id text;
begin
  -- Get credentials
  select telegram_bot_token, telegram_chat_id into v_token, v_chat_id
  from public.app_settings
  where id = 'global';
  
  raise notice 'Token exists: %, Chat ID exists: %', 
    (v_token is not null), 
    (v_chat_id is not null);
  
  -- Test Telegram API call
  if v_token is not null and v_chat_id is not null then
    select content::json into v_response
    from http_post(
      'https://api.telegram.org/bot' || v_token || '/sendMessage',
      json_build_object(
        'chat_id', v_chat_id,
        'text', '🔍 Test message from cron debug: ' || now()::text
      )::text,
      'application/json'
    );
    
    raise notice 'Telegram response: %', v_response;
    
    if (v_response->>'ok')::boolean then
      raise notice '✅ Telegram API call succeeded!';
    else
      raise notice '❌ Telegram API returned error: %', v_response->>'description';
    end if;
  else
    raise notice '❌ Missing Telegram credentials';
  end if;
end $$;
```

**O que procurar:**
- ✅ Mensagem no chat Telegram (com timestamp de agora)
- ✅ Mensagem de notice: `✅ Telegram API call succeeded!`

**Se receber mensagem:**
- Credentials estão OK ✅
- API está acessível ✅
- Continue para Passo 5

**Se NÃO receber mensagem ou error:**
- ❌ Bot token inválido/expirado
- ❌ Chat ID errado
- ❌ Bot não tem permissões no chat
- **Ação:** Volte a Settings, verifique/regenere o token, reinicie o bot

---

## 🔬 Passo 5: Inspecionar Lógica da Função

**Objetivo:** Ver exatamente o código da função para identificar filtros ou condições que possam bloquear o envio.

```sql
select prosrc
from pg_proc
where proname = 'send_contract_scheduled_alerts';
```

**O que procurar:**
- Qualquer `WHERE` clause que filtre alertas
- Condições tipo `if ... then raise` ou `return without executing`
- Verificações de deduplicação
- Validações de credenciais

**Potenciais problemas:**
1. Função verifica `contracts_enabled` = true? Se sim, confirme no Passo 1
2. Função valida `telegram_bot_token` antes de chamar API?
3. Existe lógica que previne envio quando chamada via cron?

---

## 🔄 Passo 6: Limpar Deduplicação e Retest Manual

**Objetivo:** Resetar o estado de "enviado" para hoje e reenviar manualmente.

**Parte 1: Limpar deduplicação**

```sql
update public.app_settings
set contracts_alerts_sent = contracts_alerts_sent - to_char(current_date, 'YYYY-MM-DD'),
    updated_at = now()
where id = 'global';
```

**Resultado esperado:**
```
UPDATE 1
```

**Parte 2: Retest manual da função**

```sql
select public.send_contract_scheduled_alerts();
```

**Parte 3: Verificar se foi enviado**

```sql
select coalesce(contracts_alerts_sent -> to_char(current_date, 'YYYY-MM-DD'), '[]'::jsonb) as sent_today
from public.app_settings
where id = 'global';
```

**O que procurar:**
- ✅ Array não vazio com signatures (ex: `["contractId:0:2026-04-02"]`)
- ✅ Mensagem no Telegram

**Se não receber:**
- Função pode estar falhando silenciosamente
- Passe para Passo 5 para inspecionar código

---

## 📊 Resultado Final

Após completar todos os passos:

| Passo | Status | Significa |
|-------|--------|-----------|
| 1: Credentials | ✅ | Bot token e chat ID preenchidos |
| 2: Alertas hoje | ✅ | Existem alertas para enviar |
| 3: Deduplicação | ✅ | Não foram enviados ainda |
| 4: API Telegram | ✅ | Credenciais válidas e API acessível |
| 5: Função lógica | ✅ | Sem filtros bloqueantes |
| 6: Manual retest | ✅ | Mensagem chega ao Telegram |

**Se TODOS os passos passarem:**
- ✅ O problema está específico ao pg_cron
- ✅ Cron job consegue executar função, mas algo diferente acontece no contexto de cron
- **Próximo:** Adicionar logging à função ou verificar variáveis de ambiente

**Se ALGUM passo falhar:**
- Identifique qual e aplique a ação corretiva indicada
- Retorne ao passo que falhou após correção

---

## 🛠️ Ações Corretivas Rápidas

### Se Passo 1 falhar (sem credentials):
```sql
update public.app_settings
set telegram_bot_token = '[seu_bot_token]',
    telegram_chat_id = '[seu_chat_id]',
    updated_at = now()
where id = 'global';
```

### Se Passo 3 habitual (muita deduplicação):
```sql
update public.app_settings
set contracts_alerts_sent = '{}'::jsonb,
    updated_at = now()
where id = 'global';
```

### Se Passo 4 falhar com "Invalid credentials":
- Regere novo token em Telegram BotFather
- Confirme que está no chat correto (use `/start` com o bot)
- Atualize credentials em Database

---

## 📝 Notas

- **Cron job:** Atualmente em `* * * * *` (test mode = cada minuto)
- **Produção:** Será `0 9 * * *` (09:00 UTC = 10:00 Portugal)
- **Warranty alerts:** Usa mesma pattern; se isto funcionar, warranty também funcionará

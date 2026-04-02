# Warranty Telegram Alerts Setup

## 1. Configurar Credenciais

**Na app**: Settings > Telegram Configuration
- **Bot Token**: De BotFather (`/newbot`)
- **Chat ID**: De `@userinfobot`

Ou via SQL:
```sql
update public.app_settings
set 
  telegram_bot_token = 'seu_bot_token',
  telegram_chat_id = 'seu_chat_id'
where id = 'global';
```

## 2. Executar Setup Script

1. Supabase > SQL Editor
2. Copiar conteúdo de `warranty_alerts_cron_fixed.sql`
3. Executar (Cmd+Enter)

## 3. Verificar Instalação

```sql
-- Deve listar "warranty-expiry-alerts-job" com schedule "15 9 * * *"
select jobname, schedule from cron.job;
```

## 4. Teste Manual

```sql
select public.send_warranty_expiry_alerts();
```

Deve enviar alertas para Telegram.

## 5. Personalizar Schedule

Por defeito: **09:15 UTC diariamente**

Para mudar:
```sql
select cron.schedule(
  'warranty-expiry-alerts-job',
  '30 8 * * *',  -- Format: minute hour day month weekday
  'select public.send_warranty_expiry_alerts();'
);
```

## 6. Troubleshooting

| Problema | Solução |
|----------|---------|
| Cron job não aparece | Verifica if setup SQL ran without errors |
| Sem mensagens no Telegram | Verifica bot token/chat ID em Settings |
| Permissões | `grant execute on function public.send_warranty_expiry_alerts() to service_role;` |

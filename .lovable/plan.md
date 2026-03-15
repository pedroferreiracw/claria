

## Analise: Integracao com Kommo para Automacao de Avaliacoes de SDRs

### E possivel fazer tudo por aqui?

**Sim, e possivel** construir a integracao diretamente no Lovable usando Edge Functions do Supabase, sem precisar do n8n. A Kommo oferece uma API REST completa com OAuth 2.0 que permite:

- Listar conversas/talks (`GET /api/v4/talks`)
- Obter historico de mensagens de um chat (`GET amojo.kommo.com/v2/origin/custom/{scope_id}/chats/{conversation_id}/history`)
- Listar leads e contatos associados
- Obter dados de usuarios (SDRs) da conta

### Pre-requisitos

Para integrar com a Kommo, voce precisara:

1. **Criar uma integracao privada na Kommo** (Configuracoes > Integracoes > Criar integracao)
2. Obter: `client_id`, `client_secret`, `redirect_uri`, e o `authorization code` inicial
3. Trocar o code por `access_token` e `refresh_token` (OAuth 2.0)
4. Informar o `subdomain` da sua conta Kommo (ex: `suaempresa.kommo.com`)

### Arquitetura Proposta

```text
Kommo API (OAuth 2.0)
       |
       v
Edge Function: sync-kommo
       |
       v
Supabase Tables:
  kommo_config        (tokens, subdomain, status)
  kommo_conversations (conversas importadas)
  kommo_messages      (mensagens de cada conversa)
       |
       v
Nova Pagina: "Kommo" ou aba em Avaliacoes
  - Lista de conversas sincronizadas
  - Visualizacao da conversa completa
  - Botao "Analisar com IA" (reutiliza analyze-prospection)
  - Metricas: tempo de resposta, volume, resultado
```

### Etapas de Implementacao

**Etapa 1 - Configuracao e Armazenamento de Credenciais**
- Criar tabela `kommo_config` (subdomain, access_token, refresh_token, expires_at, scope_id)
- Adicionar secrets no Supabase: `KOMMO_CLIENT_ID`, `KOMMO_CLIENT_SECRET`
- Criar tela de configuracao na pagina Settings para conectar a Kommo

**Etapa 2 - Edge Function de Sincronizacao**
- Criar `supabase/functions/sync-kommo/index.ts`
- Implementar refresh automatico de tokens OAuth
- Buscar conversas do time de Pre-vendas via `/api/v4/talks`
- Buscar historico de mensagens de cada conversa
- Correlacionar SDRs da Kommo com os SDRs locais pelo nome
- Salvar em tabelas `kommo_conversations` e `kommo_messages`

**Etapa 3 - Tabelas de Dados**
- `kommo_conversations`: id, kommo_id, sdr_id, lead_name, lead_phone, status, started_at, finished_at, messages_count, synced_at
- `kommo_messages`: id, conversation_id, sender_type (sdr/lead), content, sent_at, response_time_seconds

**Etapa 4 - Pagina de Conversas Kommo**
- Nova pagina `/kommo` ou nova aba em Integracoes
- Lista de conversas com filtros (SDR, periodo, status)
- Visualizacao completa da conversa em formato chat
- Metricas automaticas por conversa:
  - Tempo medio de resposta do SDR
  - Quantidade de mensagens trocadas
  - Duracao total da conversa

**Etapa 5 - Analise Automatizada com IA**
- Botao "Analisar com IA" em cada conversa
- Concatena as mensagens em texto formatado e envia para `analyze-prospection` (ja existente)
- Salva resultado como uma avaliacao vinculada ao SDR
- Possibilidade de analise em lote (selecionar varias conversas)

**Etapa 6 - Metricas e Insights Avancados**
- Dashboard de tempo de resposta por SDR (media, p90, tendencia)
- Correlacao entre tempo de resposta e resultado da prospecao
- Identificacao automatica de objecoes mais frequentes
- Alertas para conversas sem resposta ha X horas
- Comparativo de performance entre SDRs baseado nas conversas reais

### Sobre usar n8n vs fazer direto aqui

| Aspecto | Direto no Lovable | Via n8n |
|---------|-------------------|---------|
| Complexidade | Media - Edge Functions | Media - Workflow visual |
| Manutencao | Tudo em um lugar | Dois sistemas para manter |
| Custo | Incluso no Supabase | Requer instancia n8n |
| Sincronizacao agendada | pg_cron + Edge Function | Nativo do n8n |
| Flexibilidade | Total controle no codigo | Visual mas limitado |

**Recomendacao**: Fazer direto aqui. A API da Kommo e bem documentada, e ja temos toda a infraestrutura de analise IA pronta. Adicionar n8n como intermediario so adiciona complexidade sem beneficio real neste caso.

### Ordem sugerida de implementacao

1. Configurar credenciais e tabelas (base)
2. Edge Function de sync (conexao real)
3. Pagina de conversas (visualizacao)
4. Analise IA individual (valor imediato)
5. Analise em lote + metricas avancadas (escala)




# Central de Inteligencia Comercial - Plano Definitivo

## Problemas Atuais

1. **sync-kommo busca apenas 1 pagina de 50 talks** sem paginacao -- por isso so veio 1 conversa
2. **Sem filtro de data** -- nao filtra por marco/2026
3. **Mensagens com upsert quebrado** -- `onConflict: 'conversation_id'` nao e unique por mensagem, so por conversa
4. **Tudo manual** -- precisa clicar Sincronizar e Analisar um por um
5. **Sem persistencia da analise IA** -- resultado nao e salvo na conversa

## Arquitetura Proposta

```text
pg_cron (a cada 30min)
    |
    v
sync-kommo (paginado, todas conversas do mes)
    |
    v
kommo_conversations + kommo_messages
    |
    v
auto-analyze-kommo (analisa conversas nao analisadas em lote)
    |
    v
kommo_analyses (resultado salvo) + evaluations (vinculado ao SDR)
    |
    v
Dashboard de Inteligencia Comercial (tempo real, sem cliques)
```

## Etapas de Implementacao

### Etapa 1 - Corrigir sync-kommo

- Paginacao completa: iterar todas as paginas ate nao ter mais resultados
- Filtro por data: `filter[created_at][from]` para buscar apenas conversas de marco/2026+
- Buscar usuarios da Kommo via `/api/v4/users` para mapear SDRs automaticamente
- Limite de 250 por pagina (maximo da API)

### Etapa 2 - Corrigir armazenamento de mensagens

- Adicionar coluna `kommo_message_id` (text, unique) na tabela `kommo_messages`
- Usar `onConflict: 'kommo_message_id'` no upsert para evitar duplicatas reais
- Migration SQL para adicionar a coluna e o indice unique

### Etapa 3 - Criar tabela kommo_analyses

Nova tabela para persistir resultados da analise IA por conversa:
- `id`, `conversation_id` (FK), `sdr_id`, `evaluation_id` (FK opcional para evaluations)
- `scores` (jsonb), `ai_feedback` (jsonb), `objections` (jsonb)
- `result` (prosseguiu/recusou/perdeu_interesse)
- `final_score`, `analyzed_at`

### Etapa 4 - Edge Function auto-analyze-kommo

Nova funcao que:
1. Busca conversas sem `ai_analysis_id` que tenham >= 5 mensagens
2. Para cada conversa, monta o texto formatado das mensagens
3. Chama a Lovable AI Gateway (reutiliza o prompt do analyze-prospection)
4. Salva resultado em `kommo_analyses`
5. Cria registro em `evaluations` vinculado ao SDR
6. Atualiza `kommo_conversations.ai_analysis_id`
7. Processa em lotes de 5 conversas por execucao (rate limit)

### Etapa 5 - Automacao com pg_cron

Dois jobs agendados:
1. **sync-kommo** a cada 30 minutos -- importa conversas novas
2. **auto-analyze-kommo** a cada 30 minutos (defasado 15min) -- analisa as novas

### Etapa 6 - Dashboard de Inteligencia Comercial

Transformar a pagina `/kommo` em uma central com 3 abas:

**Aba 1 - Visao Geral (Dashboard)**
- Cards: total conversas, analisadas, score medio, tempo resposta medio
- Grafico de evolucao de scores por SDR ao longo do tempo
- Ranking de SDRs por score medio das conversas
- Objecoes mais frequentes (agregado de todas as analises)
- Correlacao tempo de resposta vs resultado

**Aba 2 - Conversas**
- Lista existente com filtros (ja implementada)
- Badge de status da analise (pendente/analisada/em andamento)
- Visualizacao dos scores e feedback quando analisada

**Aba 3 - Relatorios por SDR**
- Selecionar SDR e ver todas as metricas agregadas
- Pontos fortes e fracos mais recorrentes
- Evolucao de cada criterio (abertura, rapport, SPIN, etc)
- Alertas automaticos (SDR com score caindo, tempo de resposta alto)

## Secao Tecnica

**Correcoes no sync-kommo:**
- Loop `while(hasMore)` com incremento de pagina
- `filter[created_at][from]` = timestamp unix do inicio do mes
- Fetch `/api/v4/users` uma vez para criar mapa de user_id -> nome

**auto-analyze-kommo:**
- Usa SUPABASE_SERVICE_ROLE_KEY (sem auth de usuario)
- Reutiliza exatamente o mesmo prompt e tool call do analyze-prospection
- Rate limiting: max 5 analises por execucao, delay de 2s entre cada

**pg_cron jobs:**
- Executados via SQL insert (net.http_post) chamando as Edge Functions
- Nao requer migration, sera inserido via insert tool


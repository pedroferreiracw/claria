
Objetivo: tornar a extração de mensagens do Kommo confiável e definitiva, com base no que a documentação oficial realmente exige.

1) Diagnóstico consolidado (com base no código + docs)
- O link da UI (`/chats/.../leads/detail/...`) não é endpoint público de API para histórico.
- No código atual (`sync-kommo`), existem 3 problemas críticos:
  1. Endpoint incorreto para chats de contato: está usando `/api/v4/contacts/{id}/chats`, mas o oficial é `GET /api/v4/contacts/chats?contact_id=...`.
  2. `talk_id` está sendo usado como `conversation_id` no Amojo; na doc, `conversation_id` é o ID do chat (chat_id) obtido via webhook/criação/chat mapping.
  3. Assinatura HMAC incompleta: falta `Content-MD5` (até em GET), e o string-to-sign não está montado no formato esperado da doc.
- A doc de histórico (`/v2/origin/custom/{scope_id}/chats/{conversation_id}/history`) exige:
  - `Date` RFC2822
  - `Content-type: application/json`
  - `Content-MD5` (GET com body vazio => md5 de string vazia)
  - `X-Signature` HMAC-SHA1 sobre string canônica
  - segredo de canal de chat (channel secret) e `scope_id` do canal conectado.

2) Ponto decisivo para “funcionar de vez”
Para histórico via Amojo funcionar de forma suportada, precisamos de credenciais de Chat API (canal), não apenas token CRM:
- `channel_id`
- `channel_secret` (segredo do canal)
- `scope_id` vindo do `connect channel`
Se vocês usam apenas o canal oficial WhatsApp da própria Kommo sem um canal de Chat API próprio conectado, o histórico via Amojo pode não ser autorizável com o segredo de integração privada.

3) Plano de implementação (execução)
Fase A — Correção imediata no backend de sync
- Refatorar `sync-kommo` para pipeline oficial:
  - Leads/contatos via CRM (`/api/v4/leads`, `/api/v4/talks`).
  - Mapear `chat_id` com `GET /api/v4/contacts/chats?contact_id=...`.
  - Buscar histórico via Amojo com `conversation_id = chat_id`.
- Implementar assinatura canônica correta (com `Content-MD5` em GET) e headers obrigatórios.
- Salvar telemetria por conversa: `message_source`, `fetch_status`, `fetch_error`, `last_fetch_attempt_at`.

Fase B — Validação determinística (sem tentativa cega)
- Criar modo `diagnose` objetivo que retorna por conversa:
  - endpoint chamado
  - status HTTP
  - erro normalizado (`invalid_signature`, `forbidden_channel`, `no_chat_mapping`, etc.)
- Ajustar retorno do sync para não mascarar sucesso: diferenciar `leads_synced` de `messages_synced` no toast/UI.

Fase C — Ajustes de configuração/UI
- Expandir Configurações Kommo para armazenar explicitamente:
  - `channel_id` (se houver)
  - `channel_secret`
  - `scope_id` (auto e manual override)
- Mostrar checklist de saúde da integração (token CRM OK, chat mapping OK, Amojo auth OK).

Fase D — Segurança e higiene (obrigatório)
- Remover migrações com token hardcoded e substituir por fluxo de atualização segura.
- Rotacionar token/chaves expostas anteriormente.
- Evitar qualquer novo secret em migration SQL versionada.

4) Critério de “pronto” (definitivo)
- Sync retorna:
  - conversas sincronizadas > 0
  - mensagens sincronizadas > 0
  - `kommo_messages` populada com conteúdo real
- 3 execuções seguidas sem marcar lote em `messages_count = -1` por erro estrutural.
- Diagnóstico final sem `invalid_signature` nem `forbidden_channel`.

5) Risco realista e plano de contingência
- Se após assinatura correta + endpoint correto persistir `403 forbidden_channel`, isso confirma bloqueio por ausência de credenciais de Chat API de canal (não de escopo “checkbox” da integração privada).
- Contingência definitiva: ingestão das mensagens pela origem Meta (webhook oficial) e correlação no CRM por telefone/chat_id, mantendo Kommo para contexto comercial.

Detalhes técnicos (resumo)
```text
Fluxo alvo:

CRM token (Bearer)
  -> GET /api/v4/leads
  -> GET /api/v4/contacts/chats?contact_id=XXX   => chat_id
  -> GET /api/v4/talks/{id}                      => contexto da conversa

Amojo (HMAC-SHA1)
  -> GET /v2/origin/custom/{scope_id}/chats/{chat_id}/history?offset=0&limit=50
     Headers:
       Date: RFC2822
       Content-Type: application/json
       Content-MD5: md5("") para GET sem body
       X-Signature: HMAC-SHA1(method + "\n" + md5 + "\n" + contentType + "\n" + date + "\n" + path)
```

Com isso, o próximo passo de implementação fica objetivo: corrigir endpoint + assinatura + origem do `chat_id`, e validar imediatamente se as credenciais atuais são suficientes ou se falta credencial de canal Chat API.

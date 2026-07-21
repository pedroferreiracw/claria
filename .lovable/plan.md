## Objetivo

Adicionar uma camada de evidências navegáveis à análise de prospecção — sem tocar em critérios, pesos, ou notas. A IA passará a estruturar a conversa em uma linha do tempo de eventos (Abertura, Rapport, Descoberta, Objeções, Fechamento, etc.), e todo insight (evento, ponto forte, ponto de melhoria, objeção) apontará para o trecho literal da conversa que o originou. No frontend, clicar em qualquer evidência abre a aba Conversa e destaca o trecho.

## Escopo backend (`supabase/functions/analyze-prospection/index.ts`)

1. **Novo passo do prompt**: antes de avaliar, a IA deve normalizar a conversa em turnos cronológicos numerados (`turn_index`, `speaker`, `text`, `charStart`/`charEnd` no texto original quando disponível). Esse array será retornado como `conversationTimeline`.

2. **Novo campo `journeyMap`** (array de eventos), com schema por evento:
   - `stage` (enum: `abertura | apresentacao | rapport | descoberta | levantamento_necessidades | apresentacao_solucao | objecoes | tratamento_objecoes | negociacao | fechamento | proximo_passo | compromisso_assumido | encerramento`)
   - `position` (`inicio | meio | fim`)
   - `turnRefs` (índices dos turnos)
   - `quote` (trecho literal)
   - `charStart` / `charEnd`
   - `participants` (array)
   - `explanation` (justificativa da classificação)

3. **Enriquecer `aiFeedback`**:
   - `pontosFortes` e `pontosFracos` passam de `string[]` para objetos `{ titulo, quote, stage, turnRef, charStart, charEnd, justificativa }`.
   - `analiseObjecoes[]` ganha `stage`, `position`, `turnRefObjection`, `turnRefResponse`, `charStartObjection/End`, `charStartResponse/End`, `justificativaTecnica` (mantém `objection`, `wasEffective`, `melhorContorno`, `respostaIdeal`).

4. **`objections[]`** já tem offsets e quotes — adicionar `stage` e `position` para consistência com o mapa.

5. Regras no `systemPrompt`: quotes devem ser literais (sem parafrasear); `charStart/End` obrigatórios quando a entrada for texto; para áudio/PDF sem offsets, retornar apenas `turnRef` e `quote`. Manter forçamento de function calling.

6. Nada muda em `scores`, pesos ou `calculateFinalScore`.

## Escopo tipos (`src/types/index.ts`)

- Adicionar `ConversationTurn`, `JourneyStage` (enum), `JourneyEvent`, `FeedbackItem` (o antigo string[] vira `FeedbackItem[]`), estender `Objection` com `stage`/`position`, estender `AIFeedback.analiseObjecoes` com os novos campos.
- Manter compatibilidade retroativa: parser lê tanto `string` quanto `FeedbackItem` para não quebrar avaliações já salvas em `evaluations.ai_feedback` (JSON).

## Escopo frontend

### Novo componente `src/components/evaluations/ConversationMap.tsx`
- Timeline horizontal/vertical com chips por etapa, ícone e badge de posição.
- Cada chip clicável emite `onSelectEvidence({ turnRef, charStart, charEnd, quote })`.

### Novo componente `src/components/evaluations/ConversationViewer.tsx`
- Renderiza `conversationTimeline` como lista de bolhas (SDR/Cliente).
- Aceita `highlight` (turnRef ou range de char) e faz scroll + destaque animado (`bg-primary/20` pulsando 1.5s).
- Fallback: se não houver timeline (avaliações antigas), renderiza o `conversationText` cru com destaque por char offset.

### `src/pages/Evaluations.tsx`
- Nas abas de preview (após análise) e no drawer de avaliação salva:
  - Nova aba **"Mapa da Conversa"** (primeira) com `ConversationMap`.
  - Aba **"Conversa"** existente passa a usar `ConversationViewer`.
  - Abas Pontos Fortes / Pontos a Melhorar / Objeções: cada item vira card com quote + badge da etapa + botão "Ver na conversa" que:
    1. troca `activeTab` para `"conversa"`;
    2. seta `highlightTarget` no `ConversationViewer`.
- Estado local `highlightTarget` compartilhado entre as abas via `useState`.

### `CloserFeedbackPanel` e fluxo de closer
- Fora do escopo desta iteração (o pedido é da análise de prospecção SDR). Se aplicável no futuro, replicamos.

## Dados persistidos
- `evaluations.ai_feedback` já é `Json` → aceita o novo formato sem migração.
- `conversationTimeline` e `journeyMap` serão salvos dentro de `ai_feedback` (subcampos), evitando alterar o schema. Não há migração de banco.

## Compatibilidade
- Parser tolerante: se `pontosFortes[i]` for string, converte para `{ titulo: str }` sem quote/stage; UI mostra normalmente e omite o botão "Ver na conversa".
- Avaliações antigas continuam funcionando sem regressão visual.

## Fora de escopo
- Critérios, pesos, cálculo da nota final.
- Prompts de closer, dashboards, gamificação, PDI.
- Migrações de banco.

## Detalhes técnicos

```text
Backend flow:
  input(text|audio|pdf)
    → Gemini system prompt: (1) build timeline (2) tag stages (3) evaluate
    → functionDeclaration expanded (journeyMap, conversationTimeline,
      pontosFortes/Fracos como objetos, analiseObjecoes/objections com stage)
    → response JSON

Frontend flow:
  AIAnalysisResult → EvaluationsPage state
    ├─ ConversationMap (chips por stage) ──click──▶ setHighlight(turnRef|range)
    ├─ Feedback cards ─────────────────────click──▶ setHighlight + setTab('conversa')
    └─ ConversationViewer(highlight) → scrollIntoView + pulse
```

Arquivos alterados:
- `supabase/functions/analyze-prospection/index.ts` (prompt + schema)
- `src/types/index.ts` (novos tipos, compat)
- `src/hooks/useAIAnalysis.ts` (tipagem do retorno)
- `src/pages/Evaluations.tsx` (nova aba, cards com botão "Ver na conversa")
- Novos: `src/components/evaluations/ConversationMap.tsx`, `ConversationViewer.tsx`

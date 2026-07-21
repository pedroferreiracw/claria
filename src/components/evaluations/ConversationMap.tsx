import { JourneyEvent, JourneyStage, JourneyPosition, journeyStageLabels } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MapPin, MousePointerClick } from 'lucide-react';
import { HighlightTarget } from './ConversationViewer';

const positionLabels: Record<JourneyPosition, string> = {
  inicio: 'Início',
  meio: 'Meio',
  fim: 'Fim',
};

const stageColors: Record<JourneyStage, string> = {
  abertura: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  apresentacao: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
  rapport: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
  descoberta: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
  levantamento_necessidades: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
  apresentacao_solucao: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
  objecoes: 'bg-red-500/10 text-red-500 border-red-500/30',
  tratamento_objecoes: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
  negociacao: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  fechamento: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  proximo_passo: 'bg-green-500/10 text-green-500 border-green-500/30',
  compromisso_assumido: 'bg-lime-500/10 text-lime-500 border-lime-500/30',
  encerramento: 'bg-slate-500/10 text-slate-500 border-slate-500/30',
};

interface Props {
  events?: JourneyEvent[];
  onSelectEvidence: (target: HighlightTarget) => void;
}

export function ConversationMap({ events, onSelectEvidence }: Props) {
  if (!events || events.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum evento identificado na conversa. Avaliações antigas podem não conter o mapa.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Mapa da Conversa
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Clique em qualquer etapa para ver o trecho exato na aba Conversa.
        </p>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l border-border pl-6 space-y-4">
          {events.map((ev, idx) => (
            <li key={idx} className="relative">
              <span
                className={cn(
                  'absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 bg-background',
                  stageColors[ev.stage]?.split(' ')[2] ?? 'border-primary/50'
                )}
              />
              <button
                type="button"
                onClick={() =>
                  onSelectEvidence({
                    turnRef: ev.turnRefs?.[0],
                    charStart: ev.charStart,
                    charEnd: ev.charEnd,
                    quote: ev.quote,
                    key: Date.now(),
                  })
                }
                className="w-full text-left group rounded-lg border p-3 transition-colors hover:bg-accent/40 hover:border-primary/40"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn('text-xs', stageColors[ev.stage])}>
                    {journeyStageLabels[ev.stage] ?? ev.stage}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {positionLabels[ev.position] ?? ev.position}
                  </Badge>
                  {ev.participants && ev.participants.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {ev.participants.join(' · ')}
                    </span>
                  )}
                  <MousePointerClick className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {ev.quote && (
                  <p className="text-sm italic text-foreground/90 border-l-2 border-primary/40 pl-2 mb-1">
                    "{ev.quote}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{ev.explanation}</p>
              </button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

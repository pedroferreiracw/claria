import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Trash2, FileWarning, CheckCircle, XCircle, AlertTriangle, Phone, MessageCircle } from 'lucide-react';
import { SDR, Evaluation, Scores, getScoreColor, getScoreBgColor } from '@/types';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SCORE_LABELS: Record<keyof Scores, string> = {
  abertura: 'Abertura',
  rapport: 'Rapport',
  bant: 'BANT',
  dores: 'Dores',
  geracaoValor: 'Valor',
  conducaoAgendamento: 'Agendamento',
  gatilhoCompromisso: 'Compromisso',
  contornoObjecoes: 'Objeções',
  comunicacaoOratoria: 'Comunicação',
};

interface SDREvaluationCardProps {
  evaluation: Evaluation;
  sdr?: SDR;
  onView: () => void;
  onDelete: () => void;
  onCreatePDI: () => void;
  variant?: 'grid' | 'list';
}

export function SDREvaluationCard({
  evaluation,
  sdr,
  onView,
  onDelete,
  onCreatePDI,
  variant = 'grid',
}: SDREvaluationCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'prosseguiu':
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Prosseguiu
          </Badge>
        );
      case 'recusou':
        return (
          <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Recusou
          </Badge>
        );
      case 'perdeu_interesse':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Perdeu Interesse
          </Badge>
        );
      default:
        return null;
    }
  };

  // Calculate strongest and weakest areas
  const scoreEntries = Object.entries(evaluation.scores) as [keyof Scores, number][];
  const sortedScores = [...scoreEntries].sort((a, b) => b[1] - a[1]);
  const strongest = sortedScores[0];
  const weakest = sortedScores[sortedScores.length - 1];

  if (variant === 'list') {
    return (
      <Card
        className="p-3 cursor-pointer hover:shadow-md transition-all"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onView}
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={sdr?.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-accent/40 to-primary/40 text-sm font-bold">
              {sdr ? getInitials(sdr.name) : '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{sdr?.name || 'Desconhecido'}</span>
              {getResultBadge(evaluation.result)}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {evaluation.type === 'Ligação' ? (
                <Phone className="h-3 w-3" />
              ) : (
                <MessageCircle className="h-3 w-3" />
              )}
              <span>{evaluation.type}</span>
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(evaluation.date), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>

          <div
            className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold',
              getScoreBgColor(evaluation.finalScore)
            )}
          >
            {evaluation.finalScore}
          </div>

          <div
            className={cn(
              'flex items-center gap-1 transition-opacity',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onView(); }}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={sdr?.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-accent/40 to-primary/40 text-sm font-bold">
              {sdr ? getInitials(sdr.name) : '?'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium line-clamp-1">{sdr?.name || 'Desconhecido'}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {evaluation.type === 'Ligação' ? (
                <Phone className="h-3 w-3" />
              ) : (
                <MessageCircle className="h-3 w-3" />
              )}
              <span>
                {format(new Date(evaluation.date), "dd 'de' MMM", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        <div
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold',
            getScoreBgColor(evaluation.finalScore)
          )}
        >
          {evaluation.finalScore}
        </div>
      </div>

      <div className="mb-3">{getResultBadge(evaluation.result)}</div>

      {/* Score preview */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
          <span className="text-muted-foreground">Forte: </span>
          <span className={cn('font-medium', getScoreColor(strongest[1]))}>
            {SCORE_LABELS[strongest[0]]} ({strongest[1]})
          </span>
        </div>
        <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
          <span className="text-muted-foreground">Fraco: </span>
          <span className={cn('font-medium', getScoreColor(weakest[1]))}>
            {SCORE_LABELS[weakest[0]]} ({weakest[1]})
          </span>
        </div>
      </div>

      {/* Objections count */}
      {evaluation.objections.length > 0 && (
        <p className="text-xs text-muted-foreground mb-3">
          {evaluation.objections.length} objeção(ões) identificada(s)
        </p>
      )}

      {/* Hover actions */}
      <div
        className={cn(
          'flex items-center gap-2 transition-all',
          isHovered ? 'opacity-100' : 'opacity-0'
        )}
      >
        <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onView(); }}>
          <Eye className="h-3 w-3 mr-1" />
          Ver
        </Button>
        {weakest[1] < 60 && (
          <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onCreatePDI(); }}>
            <FileWarning className="h-3 w-3 mr-1" />
            PDI
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}

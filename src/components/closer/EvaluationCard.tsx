import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Eye, Trash2, FileText, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { CloserEvaluation, CLOSER_SCORE_CATEGORIES, CLOSER_CATEGORY_LABELS } from '@/types/closer';
import { SDR } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface EvaluationCardProps {
  evaluation: CloserEvaluation;
  closer: SDR | undefined;
  onView: () => void;
  onDelete?: () => void;
  onCreatePDI?: () => void;
  variant?: 'grid' | 'list';
}

export function EvaluationCard({ 
  evaluation, 
  closer, 
  onView, 
  onDelete,
  onCreatePDI,
  variant = 'grid' 
}: EvaluationCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'fechou':
        return (
          <Badge className="bg-green-500/20 text-green-600 border-green-500/50 gap-1">
            <CheckCircle className="h-3 w-3" />
            Fechou
          </Badge>
        );
      case 'nao_fechou':
        return (
          <Badge className="bg-red-500/20 text-red-600 border-red-500/50 gap-1">
            <XCircle className="h-3 w-3" />
            Não Fechou
          </Badge>
        );
      case 'follow_up':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50 gap-1">
            <Clock className="h-3 w-3" />
            Follow-up
          </Badge>
        );
      default:
        return null;
    }
  };

  // Find strongest and weakest categories
  const categoryScores = Object.entries(CLOSER_SCORE_CATEGORIES).map(([category, keys]) => {
    const avg = Math.round(
      keys.reduce((sum, key) => sum + (evaluation.scores[key] || 0), 0) / keys.length
    );
    return { category, label: CLOSER_CATEGORY_LABELS[category], score: avg };
  });

  const strongest = categoryScores.reduce((a, b) => a.score > b.score ? a : b);
  const weakest = categoryScores.reduce((a, b) => a.score < b.score ? a : b);

  const hasWeakArea = weakest.score < 60;
  const objectionsCount = evaluation.objections?.length || 0;
  const unresolvedObjections = evaluation.objections?.filter(o => !o.wasEffective).length || 0;

  if (variant === 'list') {
    return (
      <Card 
        className="group cursor-pointer hover:border-primary/50 transition-all"
        onClick={onView}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={closer?.avatarUrl} />
              <AvatarFallback className="text-xs">
                {closer ? getInitials(closer.name) : '?'}
              </AvatarFallback>
            </Avatar>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{closer?.name || 'Desconhecido'}</p>
                {getResultBadge(evaluation.result)}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(evaluation.date, { addSuffix: true, locale: ptBR })}
              </p>
            </div>

            {/* Score */}
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg",
              getScoreBgColor(evaluation.finalScore),
              getScoreColor(evaluation.finalScore)
            )}>
              {evaluation.finalScore}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="h-4 w-4" />
              </Button>
              {onDelete && (
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200 overflow-hidden"
      onClick={onView}
    >
      <CardContent className="p-0">
        {/* Header with score */}
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-background shadow-md">
                <AvatarImage src={closer?.avatarUrl} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10">
                  {closer ? getInitials(closer.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold group-hover:text-primary transition-colors">
                  {closer?.name || 'Desconhecido'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(evaluation.date, { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
            
            {/* Score Circle */}
            <div className={cn(
              "h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl shadow-lg",
              getScoreBgColor(evaluation.finalScore),
              getScoreColor(evaluation.finalScore)
            )}>
              {evaluation.finalScore}
            </div>
          </div>

          {/* Result Badge */}
          <div className="flex items-center gap-2 mb-3">
            {getResultBadge(evaluation.result)}
            {hasWeakArea && (
              <Badge variant="outline" className="gap-1 text-orange-500 border-orange-500/50">
                <AlertTriangle className="h-3 w-3" />
                Área fraca
              </Badge>
            )}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-muted-foreground">Melhor:</span>
              <span className="font-medium truncate">{strongest.label}</span>
              <span className="font-bold text-green-600">{strongest.score}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-muted-foreground">Pior:</span>
              <span className="font-medium truncate">{weakest.label}</span>
              <span className="font-bold text-red-600">{weakest.score}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {objectionsCount > 0 && (
              <span className="flex items-center gap-1">
                💬 {objectionsCount} objeções
                {unresolvedObjections > 0 && (
                  <span className="text-red-500">({unresolvedObjections} não resolvidas)</span>
                )}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {hasWeakArea && onCreatePDI && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={(e) => { e.stopPropagation(); onCreatePDI(); }}
              >
                <FileText className="h-3 w-3 mr-1" />
                Criar PDI
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onView(); }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

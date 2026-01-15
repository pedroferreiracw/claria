import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ExternalLink, CheckCircle, XCircle, AlertTriangle, Phone, MessageCircle } from 'lucide-react';
import { SDR, Evaluation, Scores, getScoreColor, getScoreBgColor } from '@/types';
import { SDRRadarChart } from './SDRRadarChart';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SCORE_LABELS: Record<keyof Scores, string> = {
  abertura: 'Abertura',
  rapport: 'Rapport',
  spin: 'SPIN',
  bant: 'BANT',
  dores: 'Dores',
  geracaoValor: 'Valor',
  conducaoAgendamento: 'Agendamento',
  contornoObjecoes: 'Objeções',
};

interface SDRDetailDrawerProps {
  sdr: SDR | null;
  evaluations: Evaluation[];
  teamAverageScores?: Scores;
  open: boolean;
  onClose: () => void;
}

export function SDRDetailDrawer({
  sdr,
  evaluations,
  teamAverageScores,
  open,
  onClose,
}: SDRDetailDrawerProps) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!evaluations.length) {
      return {
        avgScore: 0,
        successRate: 0,
        successes: 0,
        refusals: 0,
        lostInterest: 0,
        strongAreas: [] as { key: string; label: string; score: number }[],
        weakAreas: [] as { key: string; label: string; score: number }[],
      };
    }

    const avgScore = Math.round(
      evaluations.reduce((sum, e) => sum + e.finalScore, 0) / evaluations.length
    );

    const successes = evaluations.filter(e => e.result === 'prosseguiu').length;
    const refusals = evaluations.filter(e => e.result === 'recusou').length;
    const lostInterest = evaluations.filter(e => e.result === 'perdeu_interesse').length;
    const successRate = Math.round((successes / evaluations.length) * 100);

    // Calculate average per category
    const categoryScores = (Object.keys(SCORE_LABELS) as Array<keyof Scores>).map((key) => {
      const avg = Math.round(
        evaluations.reduce((sum, e) => sum + (e.scores[key] || 0), 0) / evaluations.length
      );
      return { key, label: SCORE_LABELS[key], score: avg };
    });

    const sorted = [...categoryScores].sort((a, b) => b.score - a.score);
    const strongAreas = sorted.slice(0, 3);
    const weakAreas = sorted.slice(-3).reverse();

    return {
      avgScore,
      successRate,
      successes,
      refusals,
      lostInterest,
      strongAreas,
      weakAreas,
    };
  }, [evaluations]);

  const averageScores = useMemo(() => {
    if (!evaluations.length) return {} as Scores;

    const result: Partial<Scores> = {};
    (Object.keys(SCORE_LABELS) as Array<keyof Scores>).forEach((key) => {
      result[key] = Math.round(
        evaluations.reduce((sum, e) => sum + (e.scores[key] || 0), 0) / evaluations.length
      );
    });

    return result as Scores;
  }, [evaluations]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'prosseguiu':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'recusou':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'perdeu_interesse':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (!sdr) return null;

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={sdr.avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-accent/40 to-primary/40 text-lg font-bold">
                  {getInitials(sdr.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DrawerTitle className="text-xl">{sdr.name}</DrawerTitle>
                <p className="text-sm text-muted-foreground">
                  {sdr.role} • Squad {sdr.squad}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/evaluations?sdr=${sdr.id}`);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Avaliações
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stats Cards */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div
                      className={cn(
                        'mx-auto h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold mb-2',
                        getScoreBgColor(stats.avgScore)
                      )}
                    >
                      {stats.avgScore}
                    </div>
                    <p className="text-sm text-muted-foreground">Nota Média</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="mx-auto h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold mb-2 bg-green-500/20 text-green-500">
                      {stats.successRate}%
                    </div>
                    <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold">{evaluations.length}</p>
                    <p className="text-[10px] text-muted-foreground">Total</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-green-500">{stats.successes}</p>
                    <p className="text-[10px] text-muted-foreground">Prosseguiu</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-red-500">{stats.refusals}</p>
                    <p className="text-[10px] text-muted-foreground">Recusou</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-lg font-bold text-yellow-500">{stats.lostInterest}</p>
                    <p className="text-[10px] text-muted-foreground">Perdeu</p>
                  </CardContent>
                </Card>
              </div>

              {/* Strong & Weak Areas */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-green-500">Pontos Fortes</h4>
                    <div className="space-y-2">
                      {stats.strongAreas.map((area) => (
                        <div key={area.key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{area.label}</span>
                            <span className={cn('font-medium', getScoreColor(area.score))}>
                              {area.score}
                            </span>
                          </div>
                          <Progress value={area.score} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2 text-red-500">A Melhorar</h4>
                    <div className="space-y-2">
                      {stats.weakAreas.map((area) => (
                        <div key={area.key} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{area.label}</span>
                            <span className={cn('font-medium', getScoreColor(area.score))}>
                              {area.score}
                            </span>
                          </div>
                          <Progress value={area.score} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Radar Chart & Recent Evaluations */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-2">Performance por Categoria</h4>
                  <SDRRadarChart
                    scores={averageScores}
                    teamAverageScores={teamAverageScores}
                    showTeamAverage={!!teamAverageScores}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3">Últimas Avaliações</h4>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {evaluations.slice(0, 5).map((evaluation) => (
                      <div
                        key={evaluation.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-2">
                          {getResultIcon(evaluation.result)}
                          <div>
                            <div className="flex items-center gap-2 text-sm">
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
                        <Badge
                          className={cn(
                            'text-xs',
                            evaluation.finalScore >= 80
                              ? 'bg-green-500/20 text-green-500'
                              : evaluation.finalScore >= 60
                              ? 'bg-yellow-500/20 text-yellow-500'
                              : 'bg-red-500/20 text-red-500'
                          )}
                        >
                          {evaluation.finalScore}
                        </Badge>
                      </div>
                    ))}
                    {evaluations.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma avaliação encontrada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

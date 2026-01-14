import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, TrendingDown, Calendar, Target, Video, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';
import { SDR } from '@/types';
import { CloserEvaluation, CLOSER_SCORE_CATEGORIES, CLOSER_CATEGORY_LABELS } from '@/types/closer';
import { CloserRadarChart } from './CloserRadarChart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CloserDetailDrawerProps {
  closer: SDR | null;
  evaluations: CloserEvaluation[];
  teamAverageScores?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloserDetailDrawer({ 
  closer, 
  evaluations, 
  teamAverageScores,
  open, 
  onOpenChange 
}: CloserDetailDrawerProps) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!closer || evaluations.length === 0) {
      return { 
        avgScore: 0, 
        closingRate: 0, 
        totalEvals: 0, 
        successes: 0,
        failures: 0,
        followUps: 0,
        categoryAverages: [],
        strongAreas: [],
        weakAreas: [],
      };
    }

    const totalEvals = evaluations.length;
    const avgScore = Math.round(evaluations.reduce((sum, e) => sum + e.finalScore, 0) / totalEvals);
    const successes = evaluations.filter(e => e.result === 'fechou').length;
    const failures = evaluations.filter(e => e.result === 'nao_fechou').length;
    const followUps = evaluations.filter(e => e.result === 'follow_up').length;
    const closingRate = Math.round((successes / totalEvals) * 100);

    // Category averages
    const categoryAverages = Object.entries(CLOSER_SCORE_CATEGORIES).map(([category, keys]) => {
      const catAvg = Math.round(
        evaluations.reduce((sum, e) => {
          const catScore = keys.reduce((s, k) => s + (e.scores[k] || 0), 0) / keys.length;
          return sum + catScore;
        }, 0) / totalEvals
      );
      return { 
        category, 
        label: CLOSER_CATEGORY_LABELS[category], 
        score: catAvg 
      };
    });

    const sorted = [...categoryAverages].sort((a, b) => b.score - a.score);
    const strongAreas = sorted.slice(0, 2);
    const weakAreas = sorted.slice(-2).reverse();

    return { 
      avgScore, 
      closingRate, 
      totalEvals, 
      successes, 
      failures,
      followUps,
      categoryAverages, 
      strongAreas, 
      weakAreas 
    };
  }, [closer, evaluations]);

  // Build scores object for radar chart
  const averageScores = useMemo(() => {
    if (evaluations.length === 0) return null;
    
    const scoreKeys = Object.keys(evaluations[0].scores);
    const avgScores: any = {};
    
    scoreKeys.forEach(key => {
      avgScores[key] = Math.round(
        evaluations.reduce((sum, e) => sum + (e.scores[key as keyof typeof e.scores] || 0), 0) / evaluations.length
      );
    });
    
    return avgScores;
  }, [evaluations]);

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

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'fechou':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'nao_fechou':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (!closer) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/20 shadow-lg">
                <AvatarImage src={closer.avatarUrl} />
                <AvatarFallback className="text-lg font-bold bg-primary/10">
                  {getInitials(closer.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DrawerTitle className="text-2xl">{closer.name}</DrawerTitle>
                <DrawerDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">{closer.squad}</Badge>
                  <span>{closer.role}</span>
                </DrawerDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/closer-evaluations?closer=${closer.id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Avaliações
            </Button>
          </div>
        </DrawerHeader>

        <ScrollArea className="h-[calc(90vh-120px)] px-4 py-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className={cn("text-3xl font-bold", getScoreColor(stats.avgScore))}>
                    {stats.avgScore}
                  </p>
                  <p className="text-sm text-muted-foreground">Nota Média</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold text-primary">{stats.closingRate}%</p>
                  <p className="text-sm text-muted-foreground">Taxa Fechamento</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-3xl font-bold">{stats.totalEvals}</p>
                  <p className="text-sm text-muted-foreground">Avaliações</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-green-500 font-bold">{stats.successes}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-500 font-bold">{stats.failures}</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-yellow-500 font-bold">{stats.followUps}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">F / NF / FU</p>
                </CardContent>
              </Card>
            </div>

            {/* Radar Chart & Areas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {averageScores && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Desempenho por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CloserRadarChart 
                      scores={averageScores} 
                      teamAverageScores={teamAverageScores}
                      showTeamAverage={!!teamAverageScores}
                    />
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {/* Strong Areas */}
                <Card className="border-green-500/20 bg-green-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                      <TrendingUp className="h-4 w-4" />
                      Pontos Fortes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.strongAreas.map((area) => (
                      <div key={area.category} className="flex items-center justify-between">
                        <span className="text-sm">{area.label}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={area.score} className="w-20 h-2" />
                          <span className="text-sm font-bold text-green-600">{area.score}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Weak Areas */}
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                      <TrendingDown className="h-4 w-4" />
                      Pontos a Melhorar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.weakAreas.map((area) => (
                      <div key={area.category} className="flex items-center justify-between">
                        <span className="text-sm">{area.label}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={area.score} className="w-20 h-2" />
                          <span className="text-sm font-bold text-red-600">{area.score}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Recent Evaluations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Avaliações Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {evaluations.slice(0, 5).map((evaluation) => (
                    <div 
                      key={evaluation.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getResultIcon(evaluation.result)}
                        <div>
                          <p className="text-sm font-medium">
                            {format(evaluation.date, "dd 'de' MMMM", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {evaluation.result === 'fechou' ? 'Fechou' : 
                             evaluation.result === 'nao_fechou' ? 'Não fechou' : 'Follow-up'}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "text-lg font-bold",
                        getScoreColor(evaluation.finalScore)
                      )}>
                        {evaluation.finalScore}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RankingList } from '@/components/dashboard/RankingList';
import { Badge } from '@/components/ui/badge';
import { useGamification } from '@/hooks/useGamification';
import { useSDRs } from '@/hooks/useSDRs';
import { SDR } from '@/types';
import { Trophy, Award, Flame, Target, Star, Zap, TrendingUp, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  award: Award,
  flame: Flame,
  target: Target,
  star: Star,
  zap: Zap,
  'trending-up': TrendingUp,
  crown: Crown,
};

export default function GamificationPage() {
  const { badges, monthlyScores, sdrBadges, streaks, isLoading } = useGamification();
  const sdrsQuery = useSDRs();
  const sdrs: SDR[] = sdrsQuery.data || [];
  const sdrsLoading = sdrsQuery.isLoading;
  

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const currentMonthScores = monthlyScores
    .filter(s => s.month === currentMonth && s.year === currentYear)
    .sort((a, b) => b.total_points - a.total_points);

  const rankingItems = currentMonthScores.slice(0, 10).map((score, index) => {
    const sdr = sdrs.find(s => s.id === score.sdr_id);
    return {
      sdr: sdr || { id: score.sdr_id, name: 'SDR', squad: 'Águia' as const, role: 'SDR', createdAt: new Date() },
      score: score.total_points,
      position: index + 1,
    };
  });

  const sdrBadgeMap = sdrBadges.reduce((acc, sb) => {
    if (!acc[sb.sdr_id]) acc[sb.sdr_id] = [];
    const badge = badges.find(b => b.id === sb.badge_id);
    if (badge) acc[sb.sdr_id].push(badge);
    return acc;
  }, {} as Record<string, typeof badges>);

  const sdrStreakMap = streaks.reduce((acc, s) => {
    acc[s.sdr_id] = s;
    return acc;
  }, {} as Record<string, typeof streaks[0]>);

  if (isLoading || sdrsLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gamificação</h1>
          <p className="text-muted-foreground">Ranking, conquistas e sequências do time</p>
        </div>

        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="streaks" className="flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Streaks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-accent" />
                    Ranking Mensal
                  </CardTitle>
                  <CardDescription>
                    Classificação baseada em pontos acumulados em {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rankingItems.length > 0 ? (
                    <RankingList items={rankingItems} />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhum dado de ranking disponível para este mês
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas</CardTitle>
                  <CardDescription>Resumo do mês</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Pontos</p>
                      <p className="text-2xl font-bold">
                        {currentMonthScores.reduce((sum, s) => sum + s.total_points, 0)}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-accent" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm text-muted-foreground">Avaliações</p>
                      <p className="text-2xl font-bold">
                        {currentMonthScores.reduce((sum, s) => sum + s.evaluations_count, 0)}
                      </p>
                    </div>
                    <Target className="h-8 w-8 text-accent" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <div>
                      <p className="text-sm text-muted-foreground">Média Geral</p>
                      <p className="text-2xl font-bold">
                        {currentMonthScores.length > 0
                          ? (currentMonthScores.reduce((sum, s) => sum + s.average_score, 0) / currentMonthScores.length).toFixed(1)
                          : '0'}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="badges" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-accent" />
                    Badges Disponíveis
                  </CardTitle>
                  <CardDescription>Conquistas que podem ser desbloqueadas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {badges.map(badge => {
                      const IconComponent = iconMap[badge.icon] || Award;
                      return (
                        <div 
                          key={badge.id}
                          className="p-4 rounded-lg bg-secondary/50 border border-border/50 text-center hover:bg-secondary transition-colors"
                        >
                          <div 
                            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{ backgroundColor: badge.color + '30' }}
                          >
                            <IconComponent className="h-6 w-6" style={{ color: badge.color }} />
                          </div>
                          <p className="font-medium text-sm">{badge.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                          <Badge variant="outline" className="mt-2">
                            +{badge.points} pts
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {sdrs.map(sdr => {
                const sdrBadgesList = sdrBadgeMap[sdr.id] || [];
                return (
                  <Card key={sdr.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center">
                          <span className="text-sm font-semibold">{sdr.name.charAt(0)}</span>
                        </div>
                        <div>
                          <CardTitle className="text-base">{sdr.name}</CardTitle>
                          <CardDescription>{sdr.squad}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sdrBadgesList.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {sdrBadgesList.map(badge => {
                            const IconComponent = iconMap[badge.icon] || Award;
                            return (
                              <div
                                key={badge.id}
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                style={{ backgroundColor: badge.color + '20', color: badge.color }}
                              >
                                <IconComponent className="h-3 w-3" />
                                {badge.name}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Nenhum badge conquistado</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="streaks" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sdrs.map(sdr => {
                const streak = sdrStreakMap[sdr.id];
                return (
                  <Card key={sdr.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent/30 to-primary/30 flex items-center justify-center">
                          <span className="text-sm font-semibold">{sdr.name.charAt(0)}</span>
                        </div>
                        <div>
                          <CardTitle className="text-base">{sdr.name}</CardTitle>
                          <CardDescription>{sdr.squad}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Flame className={cn(
                            "h-5 w-5",
                            streak && streak.current_streak > 0 ? "text-orange-500" : "text-muted-foreground"
                          )} />
                          <span className="text-sm">Sequência Atual</span>
                        </div>
                        <span className="text-2xl font-bold">
                          {streak?.current_streak || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className="h-5 w-5 text-yellow-accent" />
                          <span className="text-sm">Maior Sequência</span>
                        </div>
                        <span className="text-xl font-semibold text-muted-foreground">
                          {streak?.longest_streak || 0}
                        </span>
                      </div>
                      {streak?.last_activity_date && (
                        <p className="text-xs text-muted-foreground">
                          Última atividade: {new Date(streak.last_activity_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

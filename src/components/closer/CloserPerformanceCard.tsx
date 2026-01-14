import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Video, Star } from 'lucide-react';
import { SDR } from '@/types';
import { CloserEvaluation } from '@/types/closer';
import { cn } from '@/lib/utils';

interface CloserPerformanceCardProps {
  closer: SDR;
  evaluations: CloserEvaluation[];
  rank: number;
  onClick: () => void;
}

export function CloserPerformanceCard({ 
  closer, 
  evaluations, 
  rank,
  onClick 
}: CloserPerformanceCardProps) {
  const stats = useMemo(() => {
    const totalEvals = evaluations.length;
    const avgScore = totalEvals > 0
      ? Math.round(evaluations.reduce((sum, e) => sum + e.finalScore, 0) / totalEvals)
      : 0;
    
    const successes = evaluations.filter(e => e.result === 'fechou').length;
    const closingRate = totalEvals > 0 ? Math.round((successes / totalEvals) * 100) : 0;
    
    // Calculate trend (compare last 3 vs previous 3)
    const sortedEvals = [...evaluations].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const recent = sortedEvals.slice(0, 3);
    const previous = sortedEvals.slice(3, 6);
    
    const recentAvg = recent.length > 0
      ? recent.reduce((sum, e) => sum + e.finalScore, 0) / recent.length
      : 0;
    const previousAvg = previous.length > 0
      ? previous.reduce((sum, e) => sum + e.finalScore, 0) / previous.length
      : recentAvg;
    
    const trend = recentAvg - previousAvg;
    
    // Last 5 scores for sparkline
    const sparklineData = sortedEvals.slice(0, 5).reverse().map(e => e.finalScore);
    
    return { totalEvals, avgScore, closingRate, trend, sparklineData, successes };
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

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 border-green-500/30';
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/50 gap-1">
            <Trophy className="h-3 w-3" />
            #1
          </Badge>
        );
      case 2:
        return (
          <Badge className="bg-slate-400/20 text-slate-500 border-slate-400/50 gap-1">
            <Star className="h-3 w-3" />
            #2
          </Badge>
        );
      case 3:
        return (
          <Badge className="bg-amber-600/20 text-amber-600 border-amber-600/50 gap-1">
            <Star className="h-3 w-3" />
            #3
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            #{rank}
          </Badge>
        );
    }
  };

  const TrendIcon = stats.trend > 2 ? TrendingUp : stats.trend < -2 ? TrendingDown : Minus;
  const trendColor = stats.trend > 2 ? 'text-green-500' : stats.trend < -2 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card 
      className="group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header: Avatar + Name + Rank */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-background shadow-md">
              <AvatarImage src={closer.avatarUrl} />
              <AvatarFallback className="text-sm font-semibold bg-primary/10">
                {getInitials(closer.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold group-hover:text-primary transition-colors">
                {closer.name}
              </h3>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {closer.squad}
                </Badge>
                <span className="text-xs text-muted-foreground">{closer.role}</span>
              </div>
            </div>
          </div>
          {getRankBadge(rank)}
        </div>

        {/* Score Display */}
        <div 
          className={cn(
            "rounded-xl p-4 mb-4 border-2",
            getScoreBgColor(stats.avgScore)
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Nota Média</p>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-3xl font-bold", getScoreColor(stats.avgScore))}>
                  {stats.avgScore}
                </span>
                <div className={cn("flex items-center gap-1 text-xs", trendColor)}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{stats.trend > 0 ? '+' : ''}{Math.round(stats.trend)}</span>
                </div>
              </div>
            </div>
            
            {/* Mini Sparkline */}
            {stats.sparklineData.length > 1 && (
              <div className="flex items-end gap-0.5 h-8">
                {stats.sparklineData.map((score, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-t bg-primary/60 transition-all"
                    style={{ 
                      height: `${Math.max(20, (score / 100) * 100)}%`,
                      opacity: 0.4 + (i * 0.15)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{stats.closingRate}%</p>
            <p className="text-[10px] text-muted-foreground">Fechamento</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Video className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{stats.totalEvals}</p>
            <p className="text-[10px] text-muted-foreground">Avaliações</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Trophy className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-lg font-bold">{stats.successes}</p>
            <p className="text-[10px] text-muted-foreground">Fechados</p>
          </div>
        </div>

        {/* Progress Bar (Closing Rate) */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-muted-foreground">Taxa de Fechamento</span>
            <span className="font-medium">{stats.closingRate}%</span>
          </div>
          <Progress value={stats.closingRate} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Minus, Trophy, Medal, Award, Phone, MessageCircle } from 'lucide-react';
import { SDR, Evaluation, getScoreColor, getScoreBgColor } from '@/types';
import { cn } from '@/lib/utils';
import { getSquadConfig } from '@/config/squads';

interface SDRPerformanceCardProps {
  sdr: SDR;
  evaluations: Evaluation[];
  rank: number;
  onClick: () => void;
}

export function SDRPerformanceCard({ sdr, evaluations, rank, onClick }: SDRPerformanceCardProps) {
  const stats = useMemo(() => {
    const total = evaluations.length;
    if (total === 0) {
      return {
        avgScore: 0,
        successRate: 0,
        trend: 0,
        sparkline: [],
        totalEvaluations: 0,
        successes: 0,
        callCount: 0,
        whatsappCount: 0,
      };
    }

    const avgScore = Math.round(
      evaluations.reduce((sum, e) => sum + e.finalScore, 0) / total
    );

    const successes = evaluations.filter(e => e.result === 'prosseguiu').length;
    const successRate = Math.round((successes / total) * 100);

    const callCount = evaluations.filter(e => e.type === 'Ligação').length;
    const whatsappCount = evaluations.filter(e => e.type === 'WhatsApp').length;

    // Calculate trend (last 5 vs previous 5)
    const sorted = [...evaluations].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const recent = sorted.slice(0, 5);
    const previous = sorted.slice(5, 10);

    let trend = 0;
    if (recent.length > 0 && previous.length > 0) {
      const recentAvg = recent.reduce((sum, e) => sum + e.finalScore, 0) / recent.length;
      const previousAvg = previous.reduce((sum, e) => sum + e.finalScore, 0) / previous.length;
      trend = Math.round(recentAvg - previousAvg);
    }

    // Sparkline data (last 5 evaluations)
    const sparkline = sorted.slice(0, 5).reverse().map(e => e.finalScore);

    return {
      avgScore,
      successRate,
      trend,
      sparkline,
      totalEvaluations: total,
      successes,
      callCount,
      whatsappCount,
    };
  }, [evaluations]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRankBadge = () => {
    if (rank === 1) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          <Trophy className="h-3 w-3 mr-1" />
          #1
        </Badge>
      );
    }
    if (rank === 2) {
      return (
        <Badge className="bg-slate-400/20 text-slate-300 border-slate-400/30">
          <Medal className="h-3 w-3 mr-1" />
          #2
        </Badge>
      );
    }
    if (rank === 3) {
      return (
        <Badge className="bg-amber-600/20 text-amber-500 border-amber-600/30">
          <Award className="h-3 w-3 mr-1" />
          #3
        </Badge>
      );
    }
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const TrendIcon = stats.trend > 0 ? TrendingUp : stats.trend < 0 ? TrendingDown : Minus;
  const trendColor = stats.trend > 0 ? 'text-green-500' : stats.trend < 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 glass-card"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={sdr.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-accent/40 to-primary/40 text-foreground font-bold">
              {getInitials(sdr.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold line-clamp-1">{sdr.name}</h3>
            <p className="text-xs text-muted-foreground">{sdr.role}</p>
            <Badge
              variant="outline"
              className={cn('mt-1 text-xs', getSquadConfig(sdr.squad).badge)}
            >
              {sdr.squad}
            </Badge>
          </div>
        </div>
        {getRankBadge()}
      </div>

      {/* Score and Trend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold',
              getScoreBgColor(stats.avgScore)
            )}
          >
            {stats.avgScore}
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Nota Média</span>
            <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span>{stats.trend > 0 ? '+' : ''}{stats.trend}</span>
            </div>
          </div>
        </div>

        {/* Sparkline */}
        {stats.sparkline.length > 1 && (
          <div className="flex items-end gap-0.5 h-8">
            {stats.sparkline.map((score, i) => (
              <div
                key={i}
                className={cn(
                  'w-1.5 rounded-t transition-all',
                  score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ height: `${Math.max(20, (score / 100) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold text-green-500">{stats.successRate}%</p>
          <p className="text-[10px] text-muted-foreground">Conversão</p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold">{stats.totalEvaluations}</p>
          <p className="text-[10px] text-muted-foreground">Avaliações</p>
        </div>
        <div className="p-2 rounded-lg bg-secondary/50">
          <p className="text-lg font-bold text-primary">{stats.successes}</p>
          <p className="text-[10px] text-muted-foreground">Prosseguiu</p>
        </div>
      </div>

      {/* Type breakdown */}
      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          <span>{stats.callCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          <span>{stats.whatsappCount}</span>
        </div>
      </div>
    </Card>
  );
}

import { useMemo } from 'react';
import { ScoreGauge } from './ScoreGauge';
import { ConversionRate } from './ConversionRate';
import { StatsRow } from './StatsRow';
import { ProgressChart } from './ProgressChart';
import { RankingList } from './RankingList';
import { ObjectionsList } from './ObjectionsList';
import { ObjectionsAnalysis } from './ObjectionsAnalysis';
import { CloserEvaluation, CLOSER_SCORE_LABELS, CLOSER_SCORE_CATEGORIES } from '@/types/closer';
import { SDR } from '@/types';
import { PhaseScoresTable } from './PhaseScoresTable';

interface CloserDashboardTabProps {
  closers: SDR[];
  evaluations: CloserEvaluation[];
  dateRange: { from: Date; to: Date };
  selectedCloser: string;
}

export function CloserDashboardTab({ 
  closers, 
  evaluations, 
  dateRange, 
  selectedCloser 
}: CloserDashboardTabProps) {
  // Filter evaluations based on selections
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const evalDate = new Date(e.date);
      const inDateRange = evalDate >= dateRange.from && evalDate <= dateRange.to;
      const matchesCloser = selectedCloser === 'all' || e.closerId === selectedCloser;
      return inDateRange && matchesCloser;
    });
  }, [evaluations, selectedCloser, dateRange]);

  // Calculate stats
  const totalEvaluations = filteredEvaluations.length;
  const averageScore = filteredEvaluations.length > 0
    ? Math.round(filteredEvaluations.reduce((sum, e) => sum + e.finalScore, 0) / filteredEvaluations.length)
    : 0;

  // Success/Failure counts for closers
  const successes = filteredEvaluations.filter(e => e.result === 'fechou').length;
  const failures = filteredEvaluations.filter(e => e.result === 'nao_fechou').length;
  const closingRate = totalEvaluations > 0 ? Math.round((successes / totalEvaluations) * 100) : 0;

  // Category averages for closers - grouped by category
  const categoryScores = useMemo(() => {
    if (filteredEvaluations.length === 0) return [];

    const categories = Object.entries(CLOSER_SCORE_CATEGORIES);
    
    return categories.map(([category, keys]) => {
      const scores = keys.map(key => {
        const avg = filteredEvaluations.reduce((sum, e) => {
          const score = e.scores[key as keyof typeof e.scores];
          return sum + (typeof score === 'number' ? score : 0);
        }, 0) / filteredEvaluations.length;
        return Math.round(avg);
      });
      const categoryAvg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      
      return {
        phase: category,
        score: categoryAvg,
        description: `Média de ${keys.length} critérios`
      };
    });
  }, [filteredEvaluations]);

  // Weekly progress
  const weeklyProgress = [
    { period: 'Sem 1', score: 68, conversion: 55 },
    { period: 'Sem 2', score: 72, conversion: 62 },
    { period: 'Sem 3', score: 75, conversion: 65 },
    { period: 'Sem 4', score: averageScore, conversion: closingRate },
  ];

  // Ranking
  const closerScores = closers.map(closer => {
    const closerEvals = filteredEvaluations.filter(e => e.closerId === closer.id);
    const avgScore = closerEvals.length > 0
      ? Math.round(closerEvals.reduce((sum, e) => sum + e.finalScore, 0) / closerEvals.length)
      : 0;
    return { sdr: closer, score: avgScore };
  }).sort((a, b) => b.score - a.score);

  const ranking = closerScores.map((item, index) => ({
    ...item,
    position: index + 1,
  }));

  // Objections data from evaluations
  const allObjections = filteredEvaluations.flatMap(e => 
    e.objections.map((obj, idx) => ({
      id: `${e.id}-${idx}`,
      date: new Date(e.date),
      sdrName: closers.find(c => c.id === e.closerId)?.name || 'Closer',
      objection: obj.description,
      response: obj.closerResponse || '',
      resolved: obj.wasEffective,
    }))
  );

  const resolvedObjections = allObjections.filter(o => o.resolved).length;
  const unresolvedObjections = allObjections.filter(o => !o.resolved).length;

  return (
    <div className="space-y-6">
      {/* Top Row - Score Gauge, Conversion, Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <div className="glass-card rounded-xl">
          <ScoreGauge score={averageScore} label="Média Closer" />
        </div>

        {/* Conversion Rate & Stats */}
        <div className="glass-card rounded-xl p-6 space-y-6 lg:col-span-2">
          <ConversionRate rate={closingRate} label="Taxa de Fechamento" />
          <StatsRow 
            successes={successes} 
            total={totalEvaluations} 
            failures={failures}
          />
        </div>
      </div>

      {/* Middle Row - Phase Scores & Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Scores */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Notas por Categoria</h3>
          <PhaseScoresTable data={categoryScores} />
        </div>

        {/* Weekly Progress */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Evolução Semanal</h3>
          <ProgressChart data={weeklyProgress} type="line" />
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-xs text-muted-foreground">Nota Média</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-accent" />
              <span className="text-xs text-muted-foreground">Taxa Fechamento</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Ranking & Objections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Ranking de Closers</h3>
          <RankingList items={ranking.slice(0, 5)} />
        </div>

        {/* Objections Analysis */}
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Análise de Objeções</h3>
          <ObjectionsAnalysis 
            resolved={resolvedObjections} 
            unresolved={unresolvedObjections} 
          />
        </div>
      </div>

      {/* Objections List */}
      {allObjections.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Objeções Recentes</h3>
          <ObjectionsList objections={allObjections} maxItems={5} />
        </div>
      )}
    </div>
  );
}

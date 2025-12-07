import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { ScoreBar } from '@/components/ui/score-badge';
import { ScoresChart } from '@/components/dashboard/ScoresChart';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { RankingList } from '@/components/dashboard/RankingList';
import { ObjectionsHeatmap } from '@/components/dashboard/ObjectionsHeatmap';
import { 
  ClipboardCheck, 
  Users, 
  TrendingUp, 
  Target,
  Sparkles
} from 'lucide-react';
import { Scores, calculateFinalScore } from '@/types';

export default function Dashboard() {
  const { sdrs, evaluations } = useApp();

  // Calculate stats
  const totalEvaluations = evaluations.length;
  const averageScore = evaluations.length > 0
    ? Math.round(evaluations.reduce((sum, e) => sum + e.finalScore, 0) / evaluations.length)
    : 0;

  // Calculate average by category
  const categoryAverages: Record<keyof Scores, number> = {
    abertura: 0,
    rapport: 0,
    spin: 0,
    bant: 0,
    dores: 0,
    geracaoValor: 0,
    conducaoAgendamento: 0,
    contornoObjecoes: 0,
  };

  if (evaluations.length > 0) {
    Object.keys(categoryAverages).forEach(key => {
      const k = key as keyof Scores;
      categoryAverages[k] = Math.round(
        evaluations.reduce((sum, e) => sum + e.scores[k], 0) / evaluations.length
      );
    });
  }

  const categoryLabels: Record<keyof Scores, string> = {
    abertura: 'Abertura',
    rapport: 'Rapport',
    spin: 'Investigação SPIN',
    bant: 'Investigação BANT',
    dores: 'Identificação de Dores',
    geracaoValor: 'Geração de Valor',
    conducaoAgendamento: 'Condução p/ Agendamento',
    contornoObjecoes: 'Contorno de Objeções',
  };

  // Chart data
  const scoresChartData = Object.entries(categoryAverages).map(([key, value]) => ({
    name: categoryLabels[key as keyof Scores],
    value,
  }));

  // Weekly progress mock
  const weeklyProgress = [
    { period: 'Sem 1', score: 68 },
    { period: 'Sem 2', score: 72 },
    { period: 'Sem 3', score: 75 },
    { period: 'Sem 4', score: averageScore },
  ];

  // Ranking
  const sdrScores = sdrs.map(sdr => {
    const sdrEvals = evaluations.filter(e => e.sdrId === sdr.id);
    const avgScore = sdrEvals.length > 0
      ? Math.round(sdrEvals.reduce((sum, e) => sum + e.finalScore, 0) / sdrEvals.length)
      : 0;
    return { sdr, score: avgScore };
  }).sort((a, b) => b.score - a.score);

  const ranking = sdrScores.map((item, index) => ({
    ...item,
    position: index + 1,
  }));

  // Objections data
  const objectionsData = [
    { objection: 'Já temos um sistema', count: 15, effectiveness: 73 },
    { objection: 'Está caro', count: 12, effectiveness: 65 },
    { objection: 'Não tenho tempo agora', count: 10, effectiveness: 45 },
    { objection: 'Preciso pensar', count: 8, effectiveness: 58 },
    { objection: 'Vou falar com meu sócio', count: 6, effectiveness: 70 },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do desempenho da equipe</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total de Avaliações"
            value={totalEvaluations}
            subtitle="este mês"
            icon={ClipboardCheck}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Nota Média Geral"
            value={averageScore}
            subtitle="de 100 pontos"
            icon={Target}
            trend={{ value: 5, isPositive: true }}
          />
          <StatCard
            title="SDRs Ativos"
            value={sdrs.length}
            subtitle="2 squads"
            icon={Users}
          />
          <StatCard
            title="Taxa de Sucesso"
            value="68%"
            subtitle="agendamentos"
            icon={TrendingUp}
            trend={{ value: 8, isPositive: true }}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Scores */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Notas por Categoria</h3>
            <ScoresChart data={scoresChartData} />
          </div>

          {/* Weekly Progress */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Evolução Semanal</h3>
            <ProgressChart data={weeklyProgress} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ranking */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Ranking de SDRs</h3>
            <RankingList items={ranking.slice(0, 5)} />
          </div>

          {/* Score Bars */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Detalhamento por Critério</h3>
            <div className="space-y-4">
              {Object.entries(categoryAverages).slice(0, 6).map(([key, value]) => (
                <ScoreBar
                  key={key}
                  label={categoryLabels[key as keyof Scores]}
                  score={value}
                />
              ))}
            </div>
          </div>

          {/* Objections Heatmap */}
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Principais Objeções</h3>
            <ObjectionsHeatmap data={objectionsData} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

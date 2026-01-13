import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ScoreGauge } from '@/components/dashboard/ScoreGauge';
import { ConversionRate } from '@/components/dashboard/ConversionRate';
import { StatsRow } from '@/components/dashboard/StatsRow';
import { PhaseScoresTable } from '@/components/dashboard/PhaseScoresTable';
import { ProgressChart } from '@/components/dashboard/ProgressChart';
import { RankingList } from '@/components/dashboard/RankingList';
import { ObjectionsList } from '@/components/dashboard/ObjectionsList';
import { ObjectionsAnalysis } from '@/components/dashboard/ObjectionsAnalysis';
import { BANTAnalysis } from '@/components/dashboard/BANTAnalysis';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { CloserDashboardTab } from '@/components/dashboard/CloserDashboardTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Scores } from '@/types';
import { subDays } from 'date-fns';
import { useCloserEvaluations } from '@/hooks/useCloserEvaluations';
import { useClosers } from '@/hooks/useClosers';

export default function Dashboard() {
  const { sdrs, evaluations } = useApp();
  const { data: closerEvaluations = [] } = useCloserEvaluations();
  const { data: closers = [] } = useClosers();
  
  // Filter states
  const [selectedSdr, setSelectedSdr] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  // Filter evaluations based on selections
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const evalDate = new Date(e.date);
      const inDateRange = evalDate >= dateRange.from && evalDate <= dateRange.to;
      const matchesSdr = selectedSdr === 'all' || e.sdrId === selectedSdr;
      return inDateRange && matchesSdr;
    });
  }, [evaluations, selectedSdr, dateRange]);

  // Calculate stats
  const totalEvaluations = filteredEvaluations.length;
  const averageScore = filteredEvaluations.length > 0
    ? Math.round(filteredEvaluations.reduce((sum, e) => sum + e.finalScore, 0) / filteredEvaluations.length)
    : 0;

  // Success/Failure counts
  const successes = filteredEvaluations.filter(e => e.result === 'prosseguiu').length;
  const failures = filteredEvaluations.filter(e => e.result === 'recusou' || e.result === 'perdeu_interesse').length;
  const conversionRate = totalEvaluations > 0 ? Math.round((successes / totalEvaluations) * 100) : 0;

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

  if (filteredEvaluations.length > 0) {
    Object.keys(categoryAverages).forEach(key => {
      const k = key as keyof Scores;
      categoryAverages[k] = Math.round(
        filteredEvaluations.reduce((sum, e) => sum + e.scores[k], 0) / filteredEvaluations.length
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

  const categoryDescriptions: Record<keyof Scores, string> = {
    abertura: 'Qualidade da abertura da conversa e apresentação inicial',
    rapport: 'Capacidade de criar conexão e empatia com o lead',
    spin: 'Uso correto das perguntas de Situação, Problema, Implicação e Necessidade',
    bant: 'Identificação de Budget, Authority, Need e Timeline',
    dores: 'Capacidade de identificar e explorar as dores do cliente',
    geracaoValor: 'Apresentação de valor e benefícios da solução',
    conducaoAgendamento: 'Habilidade em conduzir para o agendamento da reunião',
    contornoObjecoes: 'Efetividade no tratamento de objeções',
  };

  // Phase scores data for table
  const phaseScoresData = Object.entries(categoryAverages).map(([key, score]) => ({
    phase: categoryLabels[key as keyof Scores],
    score,
    description: categoryDescriptions[key as keyof Scores],
  }));

  // Weekly progress
  const weeklyProgress = [
    { period: 'Sem 1', score: 68, conversion: 55 },
    { period: 'Sem 2', score: 72, conversion: 62 },
    { period: 'Sem 3', score: 75, conversion: 65 },
    { period: 'Sem 4', score: averageScore, conversion: conversionRate },
  ];

  // Ranking
  const sdrScores = sdrs.map(sdr => {
    const sdrEvals = filteredEvaluations.filter(e => e.sdrId === sdr.id);
    const avgScore = sdrEvals.length > 0
      ? Math.round(sdrEvals.reduce((sum, e) => sum + e.finalScore, 0) / sdrEvals.length)
      : 0;
    return { sdr, score: avgScore };
  }).sort((a, b) => b.score - a.score);

  const ranking = sdrScores.map((item, index) => ({
    ...item,
    position: index + 1,
  }));

  // Objections data from evaluations
  const allObjections = filteredEvaluations.flatMap(e => 
    e.objections.map(obj => ({
      id: `${e.id}-${obj.id}`,
      date: new Date(e.date),
      sdrName: sdrs.find(s => s.id === e.sdrId)?.name || 'SDR',
      objection: obj.description,
      response: obj.sdrResponse,
      resolved: obj.wasEffective,
    }))
  );

  const resolvedObjections = allObjections.filter(o => o.resolved).length;
  const unresolvedObjections = allObjections.filter(o => !o.resolved).length;

  // BANT analysis from evaluations
  const bantData = {
    budget: categoryAverages.bant,
    authority: Math.round(categoryAverages.bant * 0.9), // Simulated variation
    need: categoryAverages.dores,
    timeline: Math.round(categoryAverages.conducaoAgendamento * 0.85),
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral do desempenho da equipe</p>
          </div>
          <DashboardFilters
            sdrs={sdrs}
            selectedSdr={selectedSdr}
            onSdrChange={setSelectedSdr}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sdrs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sdrs">SDRs</TabsTrigger>
            <TabsTrigger value="closers">Closers</TabsTrigger>
          </TabsList>

          <TabsContent value="sdrs" className="space-y-6">
            {/* Top Row - Score Gauge, Conversion, Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Score Gauge */}
              <div className="glass-card rounded-xl">
                <ScoreGauge score={averageScore} label="Média SDR" />
              </div>

              {/* Conversion Rate & Stats */}
              <div className="glass-card rounded-xl p-6 space-y-6 lg:col-span-2">
                <ConversionRate rate={conversionRate} />
                <StatsRow successes={successes} total={totalEvaluations} failures={failures} />
              </div>
            </div>

            {/* Middle Row - Phase Scores & Weekly Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Phase Scores */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Notas por Fase</h3>
                <PhaseScoresTable data={phaseScoresData} />
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
                    <span className="text-xs text-muted-foreground">Taxa Conversão</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row - Ranking & BANT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Ranking */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Ranking de SDRs</h3>
                <RankingList items={ranking.slice(0, 5)} />
              </div>

              {/* BANT Analysis */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Análise BANT</h3>
                <BANTAnalysis data={bantData} />
              </div>
            </div>

            {/* Objections Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Objections List */}
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Objeções Recentes</h3>
                <ObjectionsList objections={allObjections} maxItems={5} />
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
          </TabsContent>

          <TabsContent value="closers" className="space-y-6">
            <CloserDashboardTab
              closers={closers}
              evaluations={closerEvaluations}
              dateRange={dateRange}
              selectedCloser={selectedSdr}
            />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

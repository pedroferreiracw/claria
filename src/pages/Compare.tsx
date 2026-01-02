import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users, User, TrendingUp, TrendingDown, Minus, BarChart3 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const categoryLabels: Record<string, string> = {
  abertura: 'Abertura',
  rapport: 'Rapport',
  spin: 'SPIN',
  bant: 'BANT',
  dores: 'Dores',
  geracaoValor: 'Geração Valor',
  conducaoAgendamento: 'Agendamento',
  contornoObjecoes: 'Objeções',
};

export default function ComparePage() {
  const { sdrs, evaluations } = useApp();
  const [selectedSdr1, setSelectedSdr1] = useState<string>('');
  const [selectedSdr2, setSelectedSdr2] = useState<string>('');
  const [compareMode, setCompareMode] = useState<'sdrs' | 'squads'>('sdrs');

  // Calculate SDR stats
  const sdrStats = useMemo(() => {
    const stats: Record<string, {
      evaluations: number;
      avgScore: number;
      conversionRate: number;
      categoryScores: Record<string, number>;
    }> = {};

    sdrs.forEach((sdr) => {
      const sdrEvals = evaluations.filter(e => e.sdrId === sdr.id);
      if (sdrEvals.length === 0) {
        stats[sdr.id] = {
          evaluations: 0,
          avgScore: 0,
          conversionRate: 0,
          categoryScores: {},
        };
        return;
      }

      const totalScore = sdrEvals.reduce((sum, e) => sum + e.finalScore, 0);
      const successes = sdrEvals.filter(e => e.result === 'prosseguiu').length;

      const categoryTotals: Record<string, { sum: number; count: number }> = {};
      sdrEvals.forEach((e) => {
        Object.entries(e.scores).forEach(([key, value]) => {
          if (!categoryTotals[key]) categoryTotals[key] = { sum: 0, count: 0 };
          categoryTotals[key].sum += value;
          categoryTotals[key].count += 1;
        });
      });

      const categoryScores: Record<string, number> = {};
      Object.entries(categoryTotals).forEach(([key, { sum, count }]) => {
        categoryScores[key] = Math.round(sum / count);
      });

      stats[sdr.id] = {
        evaluations: sdrEvals.length,
        avgScore: Math.round(totalScore / sdrEvals.length),
        conversionRate: Math.round((successes / sdrEvals.length) * 100),
        categoryScores,
      };
    });

    return stats;
  }, [sdrs, evaluations]);

  // Calculate squad stats
  const squadStats = useMemo(() => {
    const stats: Record<string, {
      sdrs: number;
      evaluations: number;
      avgScore: number;
      conversionRate: number;
      categoryScores: Record<string, number>;
    }> = {
      'Águia': { sdrs: 0, evaluations: 0, avgScore: 0, conversionRate: 0, categoryScores: {} },
      'Lobo': { sdrs: 0, evaluations: 0, avgScore: 0, conversionRate: 0, categoryScores: {} },
    };

    ['Águia', 'Lobo'].forEach((squad) => {
      const squadSdrs = sdrs.filter(s => s.squad === squad);
      const squadEvals = evaluations.filter(e => {
        const sdr = sdrs.find(s => s.id === e.sdrId);
        return sdr?.squad === squad;
      });

      if (squadEvals.length === 0) return;

      const totalScore = squadEvals.reduce((sum, e) => sum + e.finalScore, 0);
      const successes = squadEvals.filter(e => e.result === 'prosseguiu').length;

      const categoryTotals: Record<string, { sum: number; count: number }> = {};
      squadEvals.forEach((e) => {
        Object.entries(e.scores).forEach(([key, value]) => {
          if (!categoryTotals[key]) categoryTotals[key] = { sum: 0, count: 0 };
          categoryTotals[key].sum += value;
          categoryTotals[key].count += 1;
        });
      });

      const categoryScores: Record<string, number> = {};
      Object.entries(categoryTotals).forEach(([key, { sum, count }]) => {
        categoryScores[key] = Math.round(sum / count);
      });

      stats[squad] = {
        sdrs: squadSdrs.length,
        evaluations: squadEvals.length,
        avgScore: Math.round(totalScore / squadEvals.length),
        conversionRate: Math.round((successes / squadEvals.length) * 100),
        categoryScores,
      };
    });

    return stats;
  }, [sdrs, evaluations]);

  // Bar chart data for SDR comparison
  const sdrComparisonData = useMemo(() => {
    if (!selectedSdr1 || !selectedSdr2) return [];
    
    const sdr1 = sdrs.find(s => s.id === selectedSdr1);
    const sdr2 = sdrs.find(s => s.id === selectedSdr2);
    const stats1 = sdrStats[selectedSdr1];
    const stats2 = sdrStats[selectedSdr2];

    return Object.keys(categoryLabels).map((key) => ({
      category: categoryLabels[key],
      [sdr1?.name || 'SDR 1']: stats1?.categoryScores[key] || 0,
      [sdr2?.name || 'SDR 2']: stats2?.categoryScores[key] || 0,
    }));
  }, [selectedSdr1, selectedSdr2, sdrStats, sdrs]);

  // Radar chart data for SDR comparison
  const radarData = useMemo(() => {
    if (!selectedSdr1 || !selectedSdr2) return [];
    
    const stats1 = sdrStats[selectedSdr1];
    const stats2 = sdrStats[selectedSdr2];

    return Object.keys(categoryLabels).map((key) => ({
      category: categoryLabels[key],
      sdr1: stats1?.categoryScores[key] || 0,
      sdr2: stats2?.categoryScores[key] || 0,
      fullMark: 100,
    }));
  }, [selectedSdr1, selectedSdr2, sdrStats]);

  // Squad comparison bar data
  const squadComparisonData = useMemo(() => {
    return Object.keys(categoryLabels).map((key) => ({
      category: categoryLabels[key],
      'Águia': squadStats['Águia']?.categoryScores[key] || 0,
      'Lobo': squadStats['Lobo']?.categoryScores[key] || 0,
    }));
  }, [squadStats]);

  const getDifference = (val1: number, val2: number) => {
    const diff = val1 - val2;
    if (diff > 0) return { icon: TrendingUp, color: 'text-green-400', text: `+${diff}` };
    if (diff < 0) return { icon: TrendingDown, color: 'text-red-400', text: `${diff}` };
    return { icon: Minus, color: 'text-muted-foreground', text: '0' };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-accent" />
            Comparativo de Performance
          </h1>
          <p className="text-muted-foreground">Compare o desempenho entre SDRs ou squads</p>
        </div>

        <Tabs value={compareMode} onValueChange={(v) => setCompareMode(v as 'sdrs' | 'squads')}>
          <TabsList>
            <TabsTrigger value="sdrs">
              <User className="h-4 w-4 mr-2" />
              Comparar SDRs
            </TabsTrigger>
            <TabsTrigger value="squads">
              <Users className="h-4 w-4 mr-2" />
              Comparar Squads
            </TabsTrigger>
          </TabsList>

          {/* SDR Comparison */}
          <TabsContent value="sdrs" className="mt-6 space-y-6">
            {/* SDR Selectors */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-4">
                  <label className="text-sm text-muted-foreground mb-2 block">SDR 1</label>
                  <Select value={selectedSdr1} onValueChange={setSelectedSdr1}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um SDR" />
                    </SelectTrigger>
                    <SelectContent>
                      {sdrs.map((sdr) => (
                        <SelectItem key={sdr.id} value={sdr.id} disabled={sdr.id === selectedSdr2}>
                          {sdr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSdr1 && sdrStats[selectedSdr1] && (
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-2xl font-bold">{sdrStats[selectedSdr1].avgScore}</p>
                        <p className="text-xs text-muted-foreground">Média</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{sdrStats[selectedSdr1].conversionRate}%</p>
                        <p className="text-xs text-muted-foreground">Conversão</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{sdrStats[selectedSdr1].evaluations}</p>
                        <p className="text-xs text-muted-foreground">Avaliações</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="pt-4">
                  <label className="text-sm text-muted-foreground mb-2 block">SDR 2</label>
                  <Select value={selectedSdr2} onValueChange={setSelectedSdr2}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um SDR" />
                    </SelectTrigger>
                    <SelectContent>
                      {sdrs.map((sdr) => (
                        <SelectItem key={sdr.id} value={sdr.id} disabled={sdr.id === selectedSdr1}>
                          {sdr.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSdr2 && sdrStats[selectedSdr2] && (
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-2xl font-bold">{sdrStats[selectedSdr2].avgScore}</p>
                        <p className="text-xs text-muted-foreground">Média</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{sdrStats[selectedSdr2].conversionRate}%</p>
                        <p className="text-xs text-muted-foreground">Conversão</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{sdrStats[selectedSdr2].evaluations}</p>
                        <p className="text-xs text-muted-foreground">Avaliações</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            {selectedSdr1 && selectedSdr2 && (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Comparativo por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sdrComparisonData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                          <YAxis dataKey="category" type="category" width={80} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Bar dataKey={sdrs.find(s => s.id === selectedSdr1)?.name || 'SDR 1'} fill="hsl(280, 85%, 55%)" radius={4} />
                          <Bar dataKey={sdrs.find(s => s.id === selectedSdr2)?.name || 'SDR 2'} fill="hsl(320, 90%, 60%)" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Radar Chart */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Radar de Competências</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar
                            name={sdrs.find(s => s.id === selectedSdr1)?.name || 'SDR 1'}
                            dataKey="sdr1"
                            stroke="hsl(280, 85%, 55%)"
                            fill="hsl(280, 85%, 55%)"
                            fillOpacity={0.3}
                          />
                          <Radar
                            name={sdrs.find(s => s.id === selectedSdr2)?.name || 'SDR 2'}
                            dataKey="sdr2"
                            stroke="hsl(320, 90%, 60%)"
                            fill="hsl(320, 90%, 60%)"
                            fillOpacity={0.3}
                          />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Squad Comparison */}
          <TabsContent value="squads" className="mt-6 space-y-6">
            {/* Squad Stats */}
            <div className="grid md:grid-cols-2 gap-4">
              {(['Águia', 'Lobo'] as const).map((squad) => {
                const stats = squadStats[squad];
                const otherSquad = squad === 'Águia' ? 'Lobo' : 'Águia';
                const otherStats = squadStats[otherSquad];
                const scoreDiff = getDifference(stats.avgScore, otherStats.avgScore);
                const DiffIcon = scoreDiff.icon;

                return (
                  <Card key={squad} className="glass-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-accent" />
                        Squad {squad}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{stats.sdrs}</p>
                          <p className="text-xs text-muted-foreground">SDRs</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1">
                            <p className="text-2xl font-bold">{stats.avgScore}</p>
                            <DiffIcon className={`h-4 w-4 ${scoreDiff.color}`} />
                          </div>
                          <p className="text-xs text-muted-foreground">Média</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                          <p className="text-xs text-muted-foreground">Conversão</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats.evaluations}</p>
                          <p className="text-xs text-muted-foreground">Avaliações</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Squad Bar Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Comparativo por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={squadComparisonData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                      <YAxis dataKey="category" type="category" width={80} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="Águia" fill="hsl(280, 85%, 55%)" radius={4} />
                      <Bar dataKey="Lobo" fill="hsl(320, 90%, 60%)" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

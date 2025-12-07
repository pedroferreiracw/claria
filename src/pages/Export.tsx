import { useApp } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { 
  FileSpreadsheet, 
  Download, 
  Users, 
  ClipboardCheck, 
  TrendingUp,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { Scores } from '@/types';
import { format } from 'date-fns';

export default function ExportPage() {
  const { sdrs, evaluations } = useApp();

  const scoreLabels: Record<keyof Scores, string> = {
    abertura: 'Abertura',
    rapport: 'Rapport',
    spin: 'SPIN',
    bant: 'BANT',
    dores: 'Dores',
    geracaoValor: 'Geração Valor',
    conducaoAgendamento: 'Condução',
    contornoObjecoes: 'Objeções',
  };

  const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success(`${filename}.csv exportado com sucesso!`);
  };

  const exportEvaluations = () => {
    const data = evaluations.map(e => {
      const sdr = sdrs.find(s => s.id === e.sdrId);
      return {
        Data: format(new Date(e.date), 'dd/MM/yyyy'),
        SDR: sdr?.name || 'Desconhecido',
        Squad: sdr?.squad || '-',
        Tipo: e.type,
        Resultado: e.result,
        NotaFinal: e.finalScore,
        ...Object.fromEntries(
          Object.entries(e.scores).map(([key, value]) => [
            scoreLabels[key as keyof Scores],
            value
          ])
        ),
        NumObjecoes: e.objections.length,
      };
    });
    exportToCSV(data, 'avaliacoes_cardapio_web');
  };

  const exportRanking = () => {
    const sdrScores = sdrs.map(sdr => {
      const sdrEvals = evaluations.filter(e => e.sdrId === sdr.id);
      const avgScore = sdrEvals.length > 0
        ? Math.round(sdrEvals.reduce((sum, e) => sum + e.finalScore, 0) / sdrEvals.length)
        : 0;
      
      const categoryAvgs: Record<string, number> = {};
      if (sdrEvals.length > 0) {
        Object.keys(scoreLabels).forEach(key => {
          categoryAvgs[scoreLabels[key as keyof Scores]] = Math.round(
            sdrEvals.reduce((sum, e) => sum + e.scores[key as keyof Scores], 0) / sdrEvals.length
          );
        });
      }

      return {
        Nome: sdr.name,
        Squad: sdr.squad,
        Cargo: sdr.role,
        TotalAvaliacoes: sdrEvals.length,
        NotaMedia: avgScore,
        ...categoryAvgs,
      };
    }).sort((a, b) => b.NotaMedia - a.NotaMedia);

    const data = sdrScores.map((s, i) => ({
      Posicao: i + 1,
      ...s,
    }));

    exportToCSV(data, 'ranking_sdrs_cardapio_web');
  };

  const exportWeeklyProgress = () => {
    // Group evaluations by week
    const weeklyData: Record<string, { scores: number[]; count: number }> = {};
    
    evaluations.forEach(e => {
      const date = new Date(e.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = format(weekStart, 'dd/MM/yyyy');
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { scores: [], count: 0 };
      }
      weeklyData[weekKey].scores.push(e.finalScore);
      weeklyData[weekKey].count++;
    });

    const data = Object.entries(weeklyData).map(([week, { scores, count }]) => ({
      Semana: week,
      TotalAvaliacoes: count,
      NotaMedia: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      NotaMinima: Math.min(...scores),
      NotaMaxima: Math.max(...scores),
    }));

    exportToCSV(data, 'evolucao_semanal_cardapio_web');
  };

  const exportOptions = [
    {
      title: 'Exportar Avaliações',
      description: 'Todas as avaliações com notas detalhadas por categoria',
      icon: ClipboardCheck,
      action: exportEvaluations,
      count: evaluations.length,
    },
    {
      title: 'Exportar Ranking',
      description: 'Ranking de SDRs com médias por categoria',
      icon: Users,
      action: exportRanking,
      count: sdrs.length,
    },
    {
      title: 'Exportar Evolução Semanal',
      description: 'Progresso da equipe semana a semana',
      icon: TrendingUp,
      action: exportWeeklyProgress,
      count: null,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center">
            <FileSpreadsheet className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Exportar Dados</h1>
            <p className="text-muted-foreground">Exporte relatórios em formato Excel/CSV</p>
          </div>
        </div>

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {exportOptions.map((option) => (
            <div 
              key={option.title}
              className="glass-card rounded-xl p-6 hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg gradient-accent flex items-center justify-center shrink-0">
                  <option.icon className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{option.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                  {option.count !== null && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {option.count} registros
                    </p>
                  )}
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={option.action}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="glass-card rounded-xl p-6 border-accent/20">
          <div className="flex items-start gap-4">
            <Calendar className="h-6 w-6 text-accent shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold">Dica de Exportação</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os arquivos CSV podem ser abertos diretamente no Microsoft Excel, 
                Google Sheets ou qualquer programa de planilhas. 
                Você pode usar filtros e criar gráficos personalizados com os dados exportados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

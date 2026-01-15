import { useMemo } from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Scores } from '@/types';

const SDR_SCORE_LABELS: Record<keyof Scores, string> = {
  abertura: 'Abertura',
  rapport: 'Rapport',
  spin: 'SPIN',
  bant: 'BANT',
  dores: 'Dores',
  geracaoValor: 'Valor',
  conducaoAgendamento: 'Agendamento',
  contornoObjecoes: 'Objeções',
};

interface SDRRadarChartProps {
  scores: Scores;
  teamAverageScores?: Scores;
  showTeamAverage?: boolean;
}

export function SDRRadarChart({ scores, teamAverageScores, showTeamAverage = false }: SDRRadarChartProps) {
  const chartData = useMemo(() => {
    return (Object.keys(SDR_SCORE_LABELS) as Array<keyof Scores>).map((key) => ({
      category: SDR_SCORE_LABELS[key],
      score: scores[key] || 0,
      teamAverage: teamAverageScores?.[key] || 0,
    }));
  }, [scores, teamAverageScores]);

  const chartConfig: ChartConfig = {
    score: {
      label: 'Score',
      color: 'hsl(var(--primary))',
    },
    teamAverage: {
      label: 'Média Equipe',
      color: 'hsl(var(--muted-foreground))',
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <PolarRadiusAxis
            angle={22.5}
            domain={[0, 100]}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
            tickCount={5}
          />
          {showTeamAverage && (
            <Radar
              name="Média Equipe"
              dataKey="teamAverage"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm">
                    <div className="font-medium">{payload[0].payload.category}</div>
                    {payload.map((entry: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-muted-foreground">{entry.name}:</span>
                        <span className="font-medium">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

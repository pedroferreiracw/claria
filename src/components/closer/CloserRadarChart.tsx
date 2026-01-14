import { useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { CloserScores, CLOSER_SCORE_CATEGORIES, CLOSER_CATEGORY_LABELS } from '@/types/closer';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface CloserRadarChartProps {
  scores: CloserScores;
  teamAverageScores?: CloserScores;
  showTeamAverage?: boolean;
}

export function CloserRadarChart({ 
  scores, 
  teamAverageScores, 
  showTeamAverage = false 
}: CloserRadarChartProps) {
  const data = useMemo(() => {
    return Object.entries(CLOSER_SCORE_CATEGORIES).map(([category, keys]) => {
      const categoryScore = Math.round(
        keys.reduce((sum, key) => sum + (scores[key] || 0), 0) / keys.length
      );
      
      const teamAvg = teamAverageScores 
        ? Math.round(keys.reduce((sum, key) => sum + (teamAverageScores[key] || 0), 0) / keys.length)
        : 0;
      
      return {
        category: CLOSER_CATEGORY_LABELS[category],
        score: categoryScore,
        teamAverage: teamAvg,
        fullMark: 100,
      };
    });
  }, [scores, teamAverageScores]);

  const chartConfig = {
    score: {
      label: "Nota Individual",
      color: "hsl(var(--primary))",
    },
    teamAverage: {
      label: "Média Equipe",
      color: "hsl(var(--muted-foreground))",
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid 
            gridType="polygon" 
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis 
            dataKey="category" 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: 11,
              fontWeight: 500
            }}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickCount={5}
          />
          {showTeamAverage && teamAverageScores && (
            <Radar
              name="Média Equipe"
              dataKey="teamAverage"
              stroke="hsl(var(--muted-foreground))"
              fill="hsl(var(--muted-foreground))"
              fillOpacity={0.1}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
          )}
          <Radar
            name="Nota Individual"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-md">
                  <p className="font-semibold text-sm mb-1">{data.category}</p>
                  <p className="text-sm text-primary">
                    Nota: <span className="font-bold">{data.score}</span>
                  </p>
                  {showTeamAverage && (
                    <p className="text-sm text-muted-foreground">
                      Média Equipe: <span className="font-medium">{data.teamAverage}</span>
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Legend 
            wrapperStyle={{ 
              paddingTop: '20px',
              fontSize: '12px'
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';

interface ProgressChartProps {
  data: {
    period: string;
    score: number;
    conversion?: number;
  }[];
  type?: 'line' | 'area';
}

export function ProgressChart({ data, type = 'area' }: ProgressChartProps) {
  const hasConversion = data.some(d => d.conversion !== undefined);

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="period" 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))" 
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            name="Nota Média"
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
          {hasConversion && (
            <Line 
              type="monotone" 
              dataKey="conversion" 
              name="Conversão"
              stroke="hsl(var(--accent))" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis 
          dataKey="period" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Area 
          type="monotone" 
          dataKey="score" 
          stroke="hsl(var(--primary))" 
          fillOpacity={1} 
          fill="url(#colorScore)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

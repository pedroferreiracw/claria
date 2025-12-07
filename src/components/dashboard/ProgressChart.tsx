import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface ProgressChartProps {
  data: { period: string; score: number }[];
  type?: 'line' | 'area';
}

export function ProgressChart({ data, type = 'area' }: ProgressChartProps) {
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 20%, 20%)" />
          <XAxis dataKey="period" stroke="hsl(260, 10%, 60%)" fontSize={12} />
          <YAxis domain={[0, 100]} stroke="hsl(260, 10%, 60%)" fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(260, 20%, 12%)', 
              border: '1px solid hsl(260, 20%, 25%)',
              borderRadius: '8px',
              color: 'white'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="hsl(320, 90%, 60%)" 
            strokeWidth={3}
            dot={{ fill: 'hsl(320, 90%, 60%)', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: 'hsl(280, 85%, 55%)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(320, 90%, 60%)" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="hsl(320, 90%, 60%)" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(260, 20%, 20%)" />
        <XAxis dataKey="period" stroke="hsl(260, 10%, 60%)" fontSize={12} />
        <YAxis domain={[0, 100]} stroke="hsl(260, 10%, 60%)" fontSize={12} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'hsl(260, 20%, 12%)', 
            border: '1px solid hsl(260, 20%, 25%)',
            borderRadius: '8px',
            color: 'white'
          }}
        />
        <Area 
          type="monotone" 
          dataKey="score" 
          stroke="hsl(320, 90%, 60%)" 
          strokeWidth={2}
          fillOpacity={1} 
          fill="url(#colorScore)" 
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
